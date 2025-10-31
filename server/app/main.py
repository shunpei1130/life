from __future__ import annotations

import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models import EditRequest, EditResponse, PollResponse, JobStatus
from .store import job_store
from .eternalai import send_edit_request, poll_result

app = FastAPI(title='EternalAI Image Editor API', version='1.0.0')

app.add_middleware(
  CORSMiddleware,
  allow_origins=['*'],
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*']
)


@app.post('/api/edit', response_model=EditResponse)
async def create_edit(request: EditRequest) -> EditResponse:
  job = job_store.create_job(filename=request.filename, prompt=request.prompt)
  request_id = await send_edit_request(job, request.imageBase64)

  if not request_id:
    job.mark_failure('Failed to initiate request')
    job_store.update_job(job)
    raise HTTPException(status_code=500, detail='Failed to initiate EternalAI request')

  job_store.attach_request_id(job, request_id)
  job_store.update_job(job)
  return EditResponse(request_id=request_id)


@app.get('/api/poll', response_model=PollResponse)
async def get_result(request_id: str = Query(..., description='EternalAI request identifier')) -> PollResponse:
  job = job_store.get_job(request_id)
  if job and job.status == JobStatus.SUCCESS and job.result_url:
    return PollResponse(status=JobStatus.SUCCESS, result_url=job.result_url, request_id=request_id)

  response = await poll_result(request_id)
  status = response.get('status')

  if status == JobStatus.SUCCESS:
    result_url = response.get('result_url')
    if job and result_url:
      job.mark_success(result_url)
      job_store.update_job(job)
    return PollResponse(status=JobStatus.SUCCESS, result_url=result_url, request_id=request_id)

  if status == JobStatus.FAILED:
    error = response.get('error', '画像の生成に失敗しました。')
    if job:
      job.mark_failure(error)
      job_store.update_job(job)
    return PollResponse(status=JobStatus.FAILED, error=error, request_id=request_id)

  return PollResponse(status=JobStatus.PROCESSING, request_id=request_id)


@app.get('/health')
async def health_check():
  settings = get_settings()
  return {
    'status': 'ok',
    'has_api_key': bool(settings.eternal_ai_api_key)
  }
