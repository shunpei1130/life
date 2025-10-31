from __future__ import annotations

import asyncio
import base64
import os
import random
from typing import Optional

import httpx

from .config import get_settings
from .models import Job


async def send_edit_request(job: Job, image_base64: str) -> Optional[str]:
  settings = get_settings()
  api_key = settings.eternal_ai_api_key
  if not api_key:
    return await _simulate_request(job)

  payload = {
    'messages': [
      {
        'role': 'user',
        'content': [
          {
            'type': 'image_url',
            'image_url': {
              'url': f"data:image/jpeg;base64,{image_base64}",
              'filename': job.original_filename
            }
          },
          {
            'type': 'text',
            'text': job.prompt
          }
        ]
      }
    ],
    'type': 'edit'
  }

  headers = {
    'x-api-key': api_key,
    'Content-Type': 'application/json'
  }

  async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
    response = await client.post(settings.eternal_ai_api_url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    return data.get('request_id')


async def poll_result(request_id: str) -> dict:
  settings = get_settings()
  api_key = settings.eternal_ai_api_key
  if not api_key:
    return await _simulate_poll(request_id)

  headers = {'x-api-key': api_key}
  params = {'request_id': request_id}
  async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
    response = await client.get(settings.eternal_ai_result_url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()


# --- Simulation helpers for local development ---
_simulated_jobs: dict[str, dict] = {}


async def _simulate_request(job: Job) -> str:
  request_id = job.id
  _simulated_jobs[request_id] = {
    'status': 'processing',
    'result_url': None
  }
  asyncio.create_task(_simulate_processing(request_id, job))
  return request_id


async def _simulate_processing(request_id: str, job: Job) -> None:
  await asyncio.sleep(2 + random.random() * 2)
  placeholder = _generate_placeholder(job)
  _simulated_jobs[request_id] = {
    'status': 'success',
    'result_url': placeholder
  }


def _generate_placeholder(job: Job) -> str:
  text = f"Edited: {job.prompt[:40]}".encode('utf-8')
  base = base64.b64encode(text).decode('utf-8')
  return f"data:text/plain;base64,{base}"


async def _simulate_poll(request_id: str) -> dict:
  job = _simulated_jobs.get(request_id)
  if not job:
    return {'status': 'failed', 'error': 'request_id not found'}
  return job
