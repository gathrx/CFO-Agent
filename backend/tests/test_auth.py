"""Tests for the API login check. Run from backend/: python -m pytest tests"""
import pytest
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient

from api import auth
from config.settings import settings


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "AUTH_DISABLED", False)
    monkeypatch.setattr(settings, "ALLOWED_EMAILS", "Owner@Example.com")
    monkeypatch.setattr(settings, "API_AUDIENCE", "")

    tokens = {
        "good": {"email": "owner@example.com", "email_verified": True},
        "stranger": {"email": "someone@example.com", "email_verified": True},
        "unverified": {"email": "owner@example.com", "email_verified": False},
    }
    monkeypatch.setattr(auth, "_verify_firebase", lambda t: tokens.get(t))

    app = FastAPI()
    router = APIRouter()

    @router.get("/api/ping")
    async def ping():
        return {"ok": True}

    app.include_router(router, dependencies=[Depends(auth.require_user)])

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return TestClient(app)


def _get(client, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return client.get("/api/ping", headers=headers)


def test_missing_token_is_401(client):
    assert _get(client).status_code == 401


def test_bad_token_is_401(client):
    assert _get(client, "garbage").status_code == 401


def test_allowed_user_gets_through(client):
    r = _get(client, "good")
    assert r.status_code == 200 and r.json() == {"ok": True}


def test_other_user_is_403(client):
    assert _get(client, "stranger").status_code == 403


def test_unverified_email_is_403(client):
    assert _get(client, "unverified").status_code == 403


def test_empty_allowlist_refuses_everyone(client, monkeypatch):
    monkeypatch.setattr(settings, "ALLOWED_EMAILS", "")
    assert _get(client, "good").status_code == 403


def test_health_stays_open(client):
    assert client.get("/health").status_code == 200


def test_auth_disabled_skips_check(client, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_DISABLED", True)
    assert _get(client).status_code == 200


def test_scheduler_oidc_token(client, monkeypatch):
    monkeypatch.setattr(settings, "API_AUDIENCE", "https://api.example")
    monkeypatch.setattr(settings, "ALLOWED_EMAILS", "owner@example.com,sched@proj.iam.gserviceaccount.com")
    monkeypatch.setattr(
        auth.google_id_token,
        "verify_oauth2_token",
        lambda t, req, audience: {"email": "sched@proj.iam.gserviceaccount.com", "email_verified": True}
        if t == "oidc" and audience == "https://api.example" else (_ for _ in ()).throw(ValueError("bad")),
    )
    assert _get(client, "oidc").status_code == 200
