from __future__ import annotations
import os
import traceback
from typing import List

import stripe
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import engine, get_db
from .db_models import Base, Charge, Consumption, User
from .auth import get_current_user
from .models import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    EditRequest,
    EditResponse,
    HistoryResponse,
    MeResponse,
    PollResponse,
    JobStatus,
)
from .store import job_store
from .eternalai import send_edit_request, poll_result


Base.metadata.create_all(bind=engine)

app = FastAPI(title="EternalAI Image Editor API", version="1.0.0")

stripe_api_key = os.getenv("STRIPE_SECRET_KEY")
if stripe_api_key:
    stripe.api_key = stripe_api_key

PRICE_TO_CREDITS = {
    "price_2": 2,
    "price_10": 10,
    "price_50": 50,
}

DEFAULT_GENERATION_COST = int(os.getenv("GENERATION_CREDITS_COST", "1"))

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", f"{FRONTEND_URL}/success")
CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", f"{FRONTEND_URL}/cancel")


def _require_stripe_configuration() -> None:
    if not stripe.api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe is not configured",
        )


def _refund_consumption(
    db: Session,
    consumption: Consumption,
    user: User,
    reason: str,
    request_id: str | None = None,
) -> None:
    if consumption.refunded:
        return

    user.credits += consumption.credits_used
    consumption.refunded = True
    refund_entry = Consumption(
        uid=user.uid,
        credits_used=-consumption.credits_used,
        reason=reason,
        request_id=request_id or consumption.request_id,
        refunded=True,
    )
    db.add(user)
    db.add(consumption)
    db.add(refund_entry)
    db.commit()


def _refund_by_request_id(db: Session, request_id: str, reason: str) -> None:
    if not request_id:
        return

    stmt = select(Consumption).where(Consumption.request_id == request_id)
    consumption = db.execute(stmt).scalars().first()
    if not consumption or consumption.refunded:
        return

    user = db.get(User, consumption.uid)
    if not user:
        return

    _refund_consumption(db, consumption, user, reason, request_id=request_id)


async def _initiate_edit(job, request: EditRequest) -> str:
    request_id = await send_edit_request(job, request.imageBase64)
    if not request_id:
        job.mark_failure("Failed to initiate request")
        job_store.update_job(job)
        raise HTTPException(status_code=502, detail="Failed to initiate EternalAI request")
    job_store.attach_request_id(job, request_id)
    job_store.update_job(job)
    return request_id

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


@app.get("/api/me", response_model=MeResponse)
def read_me(current_user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(uid=current_user.uid, email=current_user.email, credits=current_user.credits)


@app.get("/api/me/history", response_model=HistoryResponse)
def read_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HistoryResponse:
    charges_stmt = (
        select(Charge)
        .where(Charge.uid == current_user.uid)
        .order_by(Charge.created_at.desc())
        .limit(100)
    )
    consumptions_stmt = (
        select(Consumption)
        .where(Consumption.uid == current_user.uid)
        .order_by(Consumption.created_at.desc())
        .limit(100)
    )

    charges: List[Charge] = db.execute(charges_stmt).scalars().all()
    consumptions: List[Consumption] = db.execute(consumptions_stmt).scalars().all()

    return HistoryResponse(
        charges=[
            {
                "id": charge.id,
                "price_id": charge.price_id,
                "quantity": charge.quantity,
                "credits_added": charge.credits_added,
                "amount_total_jpy": charge.amount_total_jpy,
                "currency": charge.currency,
                "created_at": charge.created_at,
            }
            for charge in charges
        ],
        consumptions=[
            {
                "id": consumption.id,
                "credits_used": consumption.credits_used,
                "reason": consumption.reason,
                "request_id": consumption.request_id,
                "refunded": consumption.refunded,
                "created_at": consumption.created_at,
            }
            for consumption in consumptions
        ],
    )


@app.post("/api/payment/create-checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(
    payload: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
) -> CheckoutSessionResponse:
    _require_stripe_configuration()
    if payload.price_id not in PRICE_TO_CREDITS:
        raise HTTPException(status_code=400, detail="Invalid price identifier")

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{"price": payload.price_id, "quantity": payload.quantity}],
            success_url=SUCCESS_URL,
            cancel_url=CANCEL_URL,
            client_reference_id=current_user.uid,
            metadata={
                "uid": current_user.uid,
                "environment": os.getenv("ENVIRONMENT", "development"),
            },
            customer_email=current_user.email,
        )
    except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
        print(f"Stripe error while creating session: {exc}")
        raise HTTPException(status_code=502, detail="Failed to create checkout session") from exc

    url = session.get("url")
    if not url:
        raise HTTPException(status_code=502, detail="Failed to create checkout session")

    return CheckoutSessionResponse(url=url)


@app.post("/api/payment/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload.decode("utf-8"),
            sig_header=sig_header,
            secret=webhook_secret,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.error.SignatureVerificationError as exc:  # type: ignore[attr-defined]
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    if event.get("type") == "checkout.session.completed":
        session_obj = event["data"]["object"]
        client_reference_id = session_obj.get("client_reference_id")
        if not client_reference_id:
            return {"received": True}

        existing = db.get(Charge, event.get("id"))
        if existing:
            return {"received": True}

        try:
            line_items = stripe.checkout.Session.list_line_items(
                session_obj["id"], limit=100
            )
        except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
            print(f"Stripe error while fetching line items: {exc}")
            raise HTTPException(status_code=502, detail="Failed to fetch line items") from exc

        total_credits = 0
        price_id = None
        total_quantity = 0
        for item in line_items.get("data", []):
            price = item.get("price") or {}
            item_price_id = (
                price.get("id")
                if isinstance(price, dict)
                else getattr(price, "id", None)
            )
            quantity = int(item.get("quantity", 1))
            total_quantity += quantity
            if item_price_id and item_price_id in PRICE_TO_CREDITS:
                total_credits += PRICE_TO_CREDITS[item_price_id] * quantity
                price_id = item_price_id

        if total_credits <= 0:
            return {"received": True}

        user = db.get(User, client_reference_id)
        if user is None:
            email = None
            customer_details = session_obj.get("customer_details") or {}
            if isinstance(customer_details, dict):
                email = customer_details.get("email")
            user = User(uid=client_reference_id, email=email, credits=0)
            db.add(user)

        user.credits += total_credits

        charge = Charge(
            id=event.get("id"),
            uid=user.uid,
            price_id=price_id,
            quantity=total_quantity or 1,
            credits_added=total_credits,
            amount_total_jpy=int(session_obj.get("amount_total") or 0),
            currency=session_obj.get("currency") or "jpy",
        )
        db.add(charge)
        db.add(user)
        db.commit()

    return {"received": True}


@app.post("/api/generate", response_model=EditResponse)
async def generate_image(
    request: EditRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EditResponse:
    user = db.get(User, current_user.uid)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.credits < DEFAULT_GENERATION_COST:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")

    user.credits -= DEFAULT_GENERATION_COST
    consumption = Consumption(
        uid=user.uid,
        credits_used=DEFAULT_GENERATION_COST,
        reason="image_generation",
        refunded=False,
    )
    db.add(user)
    db.add(consumption)
    db.commit()
    db.refresh(user)
    db.refresh(consumption)

    try:
        job = job_store.create_job(
            filename=request.filename,
            prompt=request.prompt,
            uid=user.uid,
        )
        request_id = await _initiate_edit(job, request)
        consumption.request_id = request_id
        db.add(consumption)
        db.commit()
        return EditResponse(request_id=request_id)
    except HTTPException as exc:
        _refund_consumption(db, consumption, user, "image_generation_refund")
        raise exc
    except Exception as exc:  # noqa: BLE001
        print(f"Error initiating generation: {exc}")
        _refund_consumption(db, consumption, user, "image_generation_refund")
        raise HTTPException(status_code=500, detail="Internal server error") from exc

@app.post("/api/edit", response_model=EditResponse)
async def create_edit(request: EditRequest) -> EditResponse:
    try:
        job = job_store.create_job(filename=request.filename, prompt=request.prompt)
        request_id = await _initiate_edit(job, request)
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
async def get_result(
    request_id: str = Query(..., description="EternalAI request identifier"),
    db: Session = Depends(get_db),
) -> PollResponse:
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

            _refund_by_request_id(db, request_id, "image_generation_failed")
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
