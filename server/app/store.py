from __future__ import annotations

from typing import Dict, Optional
from datetime import datetime
from uuid import uuid4
from threading import Lock

from .models import Job, JobStatus


class InMemoryJobStore:
  def __init__(self) -> None:
    self._jobs: Dict[str, Job] = {}
    self._lock = Lock()
    self._jobs_by_request: Dict[str, Job] = {}

  def create_job(self, filename: str, prompt: str, uid: str | None = None) -> Job:
    job_id = uuid4().hex
    job = Job(
      id=job_id,
      status=JobStatus.PROCESSING,
      created_at=datetime.utcnow(),
      original_filename=filename,
      prompt=prompt,
      uid=uid,
    )
    with self._lock:
      self._jobs[job_id] = job
    return job

  def attach_request_id(self, job: Job, request_id: str) -> None:
    job.set_request_id(request_id)
    with self._lock:
      self._jobs[job.id] = job
      self._jobs_by_request[request_id] = job

  def update_job(self, job: Job) -> None:
    with self._lock:
      self._jobs[job.id] = job
      if job.request_id:
        self._jobs_by_request[job.request_id] = job

  def get_job(self, job_id: str) -> Optional[Job]:
    with self._lock:
      job = self._jobs_by_request.get(job_id)
      if job:
        return job
      return self._jobs.get(job_id)


job_store = InMemoryJobStore()
