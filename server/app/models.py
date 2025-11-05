from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
  PROCESSING = 'processing'
  SUCCESS = 'success'
  FAILED = 'failed'


class EditRequest(BaseModel):
  prompt: str = Field(..., max_length=2000)
  filename: str
  imageBase64: str


class EditResponse(BaseModel):
  request_id: str


class PollResponse(BaseModel):
  status: JobStatus
  result_url: Optional[str] = None
  error: Optional[str] = None
  request_id: Optional[str] = None


class CheckoutSessionRequest(BaseModel):
  price_id: str
  quantity: int = Field(default=1, ge=1, le=100)


class CheckoutSessionResponse(BaseModel):
  url: str


class MeResponse(BaseModel):
  uid: str
  email: Optional[str]
  credits: int


class ChargeLog(BaseModel):
  id: str
  price_id: Optional[str]
  quantity: int
  credits_added: int
  amount_total_jpy: int
  currency: str
  created_at: datetime


class ConsumptionLog(BaseModel):
  id: int
  credits_used: int
  reason: Optional[str]
  request_id: Optional[str]
  refunded: bool
  created_at: datetime


class HistoryResponse(BaseModel):
  charges: List[ChargeLog]
  consumptions: List[ConsumptionLog]


class Job(BaseModel):
  id: str
  request_id: Optional[str] = None
  status: JobStatus
  created_at: datetime
  completed_at: Optional[datetime] = None
  original_filename: str
  prompt: str
  result_url: Optional[str] = None
  error: Optional[str] = None
  uid: Optional[str] = None

  def mark_success(self, result_url: str) -> None:
    self.status = JobStatus.SUCCESS
    self.result_url = result_url
    self.completed_at = datetime.utcnow()

  def mark_failure(self, error: str) -> None:
    self.status = JobStatus.FAILED
    self.error = error
    self.completed_at = datetime.utcnow()

  def set_request_id(self, request_id: str) -> None:
    self.request_id = request_id
