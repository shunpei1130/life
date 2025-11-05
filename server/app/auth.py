from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth, credentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .db_models import User


http_bearer = HTTPBearer(auto_error=True)


@lru_cache(maxsize=1)
def _initialize_firebase_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY")

    if not (project_id and client_email and private_key):
        raise RuntimeError("Firebase credentials are not fully configured")

    private_key = private_key.replace("\\n", "\n")

    cred = credentials.Certificate(
        {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": private_key,
            "client_email": client_email,
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
        }
    )

    return firebase_admin.initialize_app(cred)


def verify_id_token(id_token: str) -> dict:
    _initialize_firebase_app()
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    decoded = verify_id_token(token)
    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    email: Optional[str] = decoded.get("email")

    stmt = select(User).where(User.uid == uid)
    user = db.execute(stmt).scalar_one_or_none()
    if user is None:
        user = User(uid=uid, email=email, credits=0)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if email and user.email != email:
            user.email = email
            db.add(user)
            db.commit()
            db.refresh(user)

    return user
