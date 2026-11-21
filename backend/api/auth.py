"""
Authentication for the Personal CFO API.

Every /api/* route requires an `Authorization: Bearer <token>` header carrying
either:
  * a Firebase ID token (the web app signs in with Google through Firebase Auth), or
  * a Google-signed OIDC token, e.g. from Cloud Scheduler calling
    /api/alerts/generate with a service account (audience = API_AUDIENCE).

The token's email must be listed in ALLOWED_EMAILS. If ALLOWED_EMAILS is empty,
every request is refused, so a missing setting never leaves the API open.

Set AUTH_DISABLED=true only for local development.
"""
import logging
from typing import Optional

import firebase_admin
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from config.settings import settings

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)
_google_request = google_requests.Request()
_firebase_app: Optional[firebase_admin.App] = None


def _get_firebase_app() -> firebase_admin.App:
    global _firebase_app
    if _firebase_app is None:
        project_id = settings.FIREBASE_PROJECT_ID or settings.GCP_PROJECT_ID
        options = {"projectId": project_id} if project_id else None
        try:
            _firebase_app = firebase_admin.get_app("cfo-auth")
        except ValueError:
            _firebase_app = firebase_admin.initialize_app(options=options, name="cfo-auth")
    return _firebase_app


def _verify_firebase(token: str) -> Optional[dict]:
    try:
        return firebase_auth.verify_id_token(token, app=_get_firebase_app())
    except Exception as e:  # invalid, expired or not a Firebase token
        logger.debug(f"Firebase token rejected: {e}")
        return None


def _verify_google_oidc(token: str) -> Optional[dict]:
    if not settings.API_AUDIENCE:
        return None
    try:
        return google_id_token.verify_oauth2_token(
            token, _google_request, audience=settings.API_AUDIENCE
        )
    except Exception as e:
        logger.debug(f"Google OIDC token rejected: {e}")
        return None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    """FastAPI dependency: returns the verified token claims or raises 401/403."""
    if settings.AUTH_DISABLED:
        return {"email": "local-dev", "auth_disabled": True}

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Missing bearer token")

    token = credentials.credentials
    claims = _verify_firebase(token) or _verify_google_oidc(token)
    if claims is None:
        raise _unauthorized("Invalid or expired token")

    email = (claims.get("email") or "").lower()
    if not email or not claims.get("email_verified", False):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Token has no verified email")

    allowed = settings.get_allowed_emails()
    if not allowed:
        logger.error("ALLOWED_EMAILS is empty; refusing all requests")
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No users are allowed yet")
    if email not in allowed:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not allowed")

    return claims
