from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import httpx
from ..config import settings
from ..auth.router import get_current_user
from ..models import User

router = APIRouter(prefix="/telegram", tags=["telegram"])


def _is_configured() -> bool:
    return bool(
        getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        and getattr(settings, "TELEGRAM_ALLOWED_IDS", None)
    )


@router.get("/status")
def telegram_status(current_user: User = Depends(get_current_user)):
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    allowed = getattr(settings, "TELEGRAM_ALLOWED_IDS", None)
    return {
        "configured": _is_configured(),
        "bot_token_set": bool(token),
        "allowed_ids_set": bool(allowed),
        "allowed_ids": allowed or "",
        "note": "Run ./telegram.sh in a separate terminal to start the interactive bridge.",
    }


class NotifyRequest(BaseModel):
    message: str
    chat_ids: Optional[List[int]] = None  # defaults to TELEGRAM_ALLOWED_IDS


@router.post("/notify")
async def send_notification(
    request: NotifyRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a notification to all whitelisted Telegram users (or specified chat_ids)."""
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    if not token:
        raise HTTPException(
            status_code=400,
            detail="TELEGRAM_BOT_TOKEN not set in .env",
        )

    allowed_str = getattr(settings, "TELEGRAM_ALLOWED_IDS", "") or ""
    default_ids = [
        int(x.strip()) for x in allowed_str.split(",") if x.strip()
    ]
    target_ids = request.chat_ids or default_ids

    if not target_ids:
        raise HTTPException(
            status_code=400,
            detail="No chat IDs configured. Set TELEGRAM_ALLOWED_IDS in .env",
        )

    results = []
    async with httpx.AsyncClient(timeout=10) as client:
        for chat_id in target_ids:
            try:
                r = await client.post(
                    f"https://api.telegram.org/bot{token}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": request.message,
                        "parse_mode": "HTML",
                    },
                )
                results.append({"chat_id": chat_id, "ok": r.status_code == 200})
            except Exception as e:
                results.append({"chat_id": chat_id, "ok": False, "error": str(e)})

    return {"sent_to": results}
