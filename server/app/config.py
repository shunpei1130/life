import os
from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
  eternal_ai_api_key: str | None = Field(default=None, env='ETERNAL_AI_API_KEY')
  eternal_ai_api_url: str = Field(default='https://agentic.eternalai.org/uncensored-image')
  eternal_ai_result_url: str = Field(default='https://agentic.eternalai.org/result/uncensored-image')
  request_timeout: int = 60

  class Config:
    env_file = '.env'
    env_file_encoding = 'utf-8'


@lru_cache
def get_settings() -> Settings:
  return Settings()
