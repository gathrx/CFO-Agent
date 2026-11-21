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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()

