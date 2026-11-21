"""
OCR Agent — Uses Gemini Vision to extract transactions from GPay screenshots.
"""
import json
import base64
import logging
from typing import List, Optional
from pathlib import Path

import google.generativeai as genai
from PIL import Image
import io

from config.settings import settings
from models.transaction import RawExtractedTransaction

logger = logging.getLogger(__name__)

OCR_PROMPT = """
You are analyzing a GPay (Google Pay) transaction screenshot from an Indian user.
Extract ALL transactions visible in this screenshot.

For each transaction, return a JSON object with:
- merchant_name: string (the shop/person/company name)
- amount: number (Indian Rupees, positive number, no currency symbol)
- date: string (YYYY-MM-DD format, use today's date if not visible)
- time: string (HH:MM in 24hr format, null if not visible)
- transaction_type: string ("debit" for money sent/paid, "credit" for money received)

Return ONLY a valid JSON array, no markdown, no explanation. Example:
[
  {"merchant_name": "Swiggy", "amount": 350.00, "date": "2024-11-11", "time": "13:45", "transaction_type": "debit"},
  {"merchant_name": "Amazon Pay", "amount": 1299.00, "date": "2024-11-11", "time": "15:20", "transaction_type": "debit"}
]

If you cannot read any transactions clearly, return an empty array: []
Only include DEBIT transactions (money going out) unless specifically asked otherwise.
"""


def _initialize_gemini():
    if settings.GOOGLE_API_KEY:
        genai.configure(api_key=settings.GOOGLE_API_KEY)


class OCRAgent:
    def __init__(self):
        _initialize_gemini()
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def extract_transactions(self, image_bytes: bytes) -> List[RawExtractedTransaction]:
        """Extract transactions from a GPay screenshot image."""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))

            # Send to Gemini Vision
            response = self.model.generate_content(
                [OCR_PROMPT, image],
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json"
                )
            )

            raw_text = response.text.strip()

            # Clean up response if needed
            if raw_text.startswith("```"):
                lines = raw_text.split("\n")
                raw_text = "\n".join(lines[1:-1])

            data = json.loads(raw_text)

            if not isinstance(data, list):
                logger.warning("OCR response was not a list, wrapping")
                data = [data] if data else []

            transactions = []
            for item in data:
                try:
                    t = RawExtractedTransaction(
                        merchant_name=item.get("merchant_name", "Unknown"),
                        amount=float(item.get("amount", 0)),
                        date=item.get("date", ""),
                        time=item.get("time"),
                        transaction_type=item.get("transaction_type", "debit"),
                    )
                    if t.amount > 0 and t.transaction_type == "debit":
                        transactions.append(t)
                except Exception as e:
                    logger.warning(f"Skipping malformed transaction item: {e}")

            logger.info(f"OCR extracted {len(transactions)} debit transactions")
            return transactions

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OCR JSON response: {e}")
            return []
        except Exception as e:
            logger.error(f"OCR Agent error: {e}", exc_info=True)
            return []


# Singleton instance
ocr_agent = OCRAgent()

