from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    GOOGLE_API_KEY: str = ""
    GCP_PROJECT_ID: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    FIRESTORE_COLLECTION_TRANSACTIONS: str = "transactions"
    FIRESTORE_COLLECTION_ALERTS: str = "nightly_alerts"
    FIRESTORE_COLLECTION_PENDING: str = "pending_review"

    MONTHLY_INVESTMENT_GOAL_PCT: float = 30.0
    LOW_CONFIDENCE_THRESHOLD: float = 0.75
    NIGHTLY_ALERT_HOUR: int = 21  # 9 PM IST

    CORS_ORIGINS: str = "http://localhost:3000"

    # Auth: comma-separated emails allowed to use the API (empty = nobody).
    ALLOWED_EMAILS: str = ""
    # Firebase project that issues sign-in tokens (defaults to GCP_PROJECT_ID).
    FIREBASE_PROJECT_ID: str = ""
    # Audience for Google OIDC tokens, e.g. from Cloud Scheduler (the API's URL).
    API_AUDIENCE: str = ""
    # Local development only: skip token checks.
    AUTH_DISABLED: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    def get_allowed_emails(self) -> List[str]:
        return [e.strip().lower() for e in self.ALLOWED_EMAILS.split(",") if e.strip()]


settings = Settings()

