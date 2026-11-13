"""
Who the data controller is and how to reach them, for the app's Privacy page (GDPR Art. 13).

Public on purpose: the notice is linked from the sign-in screen, before anyone is logged in. It
returns only the four contact settings, which are meant to be published.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.config import settings
from backend.rate_limiting import RATE_LIMIT_READ, limiter

router = APIRouter(prefix="/privacy", tags=["Privacy"])


class PrivacyInfo(BaseModel):
    controller_name: str = ""
    contact: str = ""
    dpo_contact: str = ""
    notice_url: str = ""
    configured: bool = False


def _clean(value: object) -> str:
    return str(value or "").strip()[:500]


def _safe_url(value: object) -> str:
    """Only http(s) links are passed on; anything else would be rendered as a clickable link."""
    url = _clean(value)
    return url if url.lower().startswith(("https://", "http://")) else ""


@router.get("/info", response_model=PrivacyInfo)
@limiter.limit(RATE_LIMIT_READ)
async def privacy_info(request: Request):
    """The controller's name and contact points as configured for this installation."""
    controller = _clean(getattr(settings, "PRIVACY_CONTROLLER_NAME", ""))
    contact = _clean(getattr(settings, "PRIVACY_CONTACT", ""))
    return PrivacyInfo(
        controller_name=controller,
        contact=contact,
        dpo_contact=_clean(getattr(settings, "PRIVACY_DPO_CONTACT", "")),
        notice_url=_safe_url(getattr(settings, "PRIVACY_NOTICE_URL", "")),
        configured=bool(controller and contact),
    )
