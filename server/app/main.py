from __future__ import annotations
import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from .config import get_settings
from .models import EditRequest, EditResponse, PollResponse, JobStatus
from .store import job_store
from .eternalai import send_edit_request, poll_result

app = FastAPI(title="EternalAI Image Editor API", version="1.0.0")

# ---- Size limit (protect backend) ----
MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", str(15*1024*1024)))  # default 15MB to accommodate base64 images
class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        body = await request.body()
        if len(body) > MAX_BODY_BYTES:
            return JSONResponse({"detail": "Payload too large"}, status_code=413)
        request._body = body
        return await call_next(request)
app.add_middleware(BodySizeLimitMiddleware)

# ---- CORS (env-driven) ----
_raw_cors = os.getenv("CORS_ALLOW_ORIGINS")
if _raw_cors and _raw_cors.strip():
  ALLOWED_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()]
else:
  # Sensible default for production frontend
  ALLOWED_ORIGINS = ["https://life-six-mu.vercel.app"]

# Optional regex to allow Vercel previews (can override via env)
ALLOW_ORIGIN_REGEX = os.getenv("CORS_ALLOW_ORIGIN_REGEX", r"https://.*\.vercel\.app$")

app.add_middleware(
  CORSMiddleware,
  allow_origins=ALLOWED_ORIGINS,
  allow_origin_regex=ALLOW_ORIGIN_REGEX if ALLOW_ORIGIN_REGEX else None,
  allow_credentials=False,
  allow_methods=["GET", "POST", "OPTIONS"],
  allow_headers=["Authorization", "Content-Type"]
)

@app.post("/api/edit", response_model=EditResponse)
async def create_edit(request: EditRequest) -> EditResponse:
    job = job_store.create_job(filename=request.filename, prompt=request.prompt)
    request_id = await send_edit_request(job, request.imageBase64)
    if not request_id:
        job.mark_failure("Failed to initiate request")
        job_store.update_job(job)
        raise HTTPException(status_code=502, detail="Failed to initiate EternalAI request")
    job_store.attach_request_id(job, request_id)
    job_store.update_job(job)
    return EditResponse(request_id=request_id)

@app.get("/api/poll", response_model=PollResponse)
async def get_result(request_id: str = Query(..., description="EternalAI request identifier")) -> PollResponse:
    job = job_store.get_job(request_id)
    if job and job.status == JobStatus.SUCCESS and job.result_url:
        return PollResponse(status=JobStatus.SUCCESS, result_url=job.result_url, request_id=request_id)

    # 外部をポーリング
    response = await poll_result(request_id)
    status = response.get("status")

    if status == JobStatus.SUCCESS:
        result_url = response.get("result_url")
        if job and result_url:
            job.mark_success(result_url)
            job_store.update_job(job)
        return PollResponse(status=JobStatus.SUCCESS, result_url=result_url, request_id=request_id)

    if status == JobStatus.FAILED:
        error = response.get("error", "画像の生成に失敗しました。")
        
        if job:
            job.mark_failure(error)
            job_store.update_job(job)
        return PollResponse(status=JobStatus.FAILED, error=error, request_id=request_id)

    # 既知のrequest_idでjobが無い＝スリープ等で消えた可能性
    return PollResponse(status=JobStatus.PROCESSING, request_id=request_id)

@app.get("/api/health")
async def api_health():
    settings = get_settings()
    return {"status": "ok", "has_api_key": bool(settings.eternal_ai_api_key)}

# 互換の旧エンドポイント（任意）
@app.get("/health")
async def health_check():
    return await api_health()
