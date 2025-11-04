from __future__ import annotations
import os
import traceback
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

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
_is_production = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")

if _raw_cors and _raw_cors.strip():
  ALLOWED_ORIGINS = [o.strip() for o in _raw_cors.split(",") if o.strip()]
else:
  # Sensible default for production frontend
  ALLOWED_ORIGINS = ["https://life-six-mu.vercel.app"]

# Local development: 本番環境でない場合のみlocalhostを追加
# 本番環境では環境変数が設定されているはずなので、localhostは追加しない
if not _is_production:
  _localhost_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001"
  ]
  for origin in _localhost_origins:
    if origin not in ALLOWED_ORIGINS:
      ALLOWED_ORIGINS.append(origin)

# Optional regex to allow Vercel previews (can override via env)
# 開発環境（localhostを含む場合）では正規表現を無効化してallow_originsを確実に使用
ALLOW_ORIGIN_REGEX = os.getenv("CORS_ALLOW_ORIGIN_REGEX")
if not ALLOW_ORIGIN_REGEX:
  # 開発環境では正規表現を無効化（localhostが確実に許可されるように）
  ALLOW_ORIGIN_REGEX = None
else:
  # 本番環境では正規表現を使用（Vercelプレビュー対応）
  pass

app.add_middleware(
  CORSMiddleware,
  allow_origins=ALLOWED_ORIGINS,
  allow_origin_regex=ALLOW_ORIGIN_REGEX,
  allow_credentials=False,
  allow_methods=["GET", "POST", "OPTIONS"],
  allow_headers=["Authorization", "Content-Type"]
)

# HTTPExceptionハンドラー（CORSヘッダーを確実に含める）
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    # CORSヘッダーを追加
    origin = request.headers.get("origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    elif origin and ALLOW_ORIGIN_REGEX:
        import re
        if re.match(ALLOW_ORIGIN_REGEX, origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    return response

# グローバルエラーハンドラー（未処理の例外用、CORS設定の後に定義）
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_detail = str(exc)
    error_trace = traceback.format_exc()
    print(f"Global error handler: {error_detail}\n{error_trace}")
    
    # CORSヘッダーを含めたエラーレスポンス
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {error_detail}"}
    )
    # CORSヘッダーを追加
    origin = request.headers.get("origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    elif origin and ALLOW_ORIGIN_REGEX:
        import re
        if re.match(ALLOW_ORIGIN_REGEX, origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    return response

@app.post("/api/edit", response_model=EditResponse)
async def create_edit(request: EditRequest) -> EditResponse:
    try:
        job = job_store.create_job(filename=request.filename, prompt=request.prompt)
        request_id = await send_edit_request(job, request.imageBase64)
        if not request_id:
            job.mark_failure("Failed to initiate request")
            job_store.update_job(job)
            raise HTTPException(status_code=502, detail="Failed to initiate EternalAI request")
        job_store.attach_request_id(job, request_id)
        job_store.update_job(job)
        return EditResponse(request_id=request_id)
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        error_trace = traceback.format_exc()
        print(f"Error in /api/edit: {error_detail}\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {error_detail}"
        )

@app.get("/api/poll", response_model=PollResponse)
async def get_result(request_id: str = Query(..., description="EternalAI request identifier")) -> PollResponse:
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        error_trace = traceback.format_exc()
        print(f"Error in /api/poll: {error_detail}\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {error_detail}"
        )

@app.get("/api/health")
async def api_health():
    settings = get_settings()
    return {"status": "ok", "has_api_key": bool(settings.eternal_ai_api_key)}

# デバッグ用: CORS設定を確認
@app.get("/api/debug/cors")
async def debug_cors(request: Request):
    origin = request.headers.get("origin", "not provided")
    return {
        "allowed_origins": ALLOWED_ORIGINS,
        "origin_regex": ALLOW_ORIGIN_REGEX,
        "env_cors": os.getenv("CORS_ALLOW_ORIGINS"),
        "current_request_origin": origin,
        "origin_in_allowed": origin in ALLOWED_ORIGINS if origin != "not provided" else None,
    }

# 互換の旧エンドポイント（任意）
@app.get("/health")
async def health_check():
    return await api_health()
