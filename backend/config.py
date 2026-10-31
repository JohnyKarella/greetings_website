# ============================================================================
#  SBL Greetings — BACKEND SETTINGS
#  Edit the settings below, save, then run app.py again.
#  The MongoDB Atlas connection (with its password) lives in backend/.env
# ============================================================================
import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

# ---------------------------------------------------------------------------
#  1) MongoDB Atlas  →  set MONGO_URI and MONGO_DATABASE in backend/.env
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "").strip()
MONGO_DATABASE = os.getenv("MONGO_DATABASE", "greeting_website_db").strip() or "greeting_website_db"

# ---------------------------------------------------------------------------
#  2) Website server
# ---------------------------------------------------------------------------
SERVER_PORT = 8000               # site opens at http://localhost:8000
OPEN_BROWSER = True              # open the website automatically when app.py starts

# ---------------------------------------------------------------------------
#  3) Paid logo change
# ---------------------------------------------------------------------------
BRAND = "Sbl"                    # shown in the payment window and UPI app
LOGO_PRICE = 15                  # rupees for ONE logo change

# UPI ID that receives the money, e.g. "yourshop@okaxis".
#   ""  (empty) = TEST MODE: dummy 12-digit numbers are accepted, nothing is collected.
#   filled      = LIVE MODE: visitors pay to this UPI ID and type the real
#                 12-digit UPI reference (UTR).  Each number can be used only once.
UPI_ID = ""

# Optional — Razorpay (payment is checked automatically by the server).
# If BOTH are filled, Razorpay is used instead of UPI.
RAZORPAY_KEY_ID = ""             # e.g. "rzp_live_XXXXXXXXXXXX"
RAZORPAY_KEY_SECRET = ""         # keep this secret — it never goes to the browser

# Optional — WhatsApp help link in the payment window (country code, no + or spaces)
WHATSAPP = ""                    # e.g. "919876543210"

# ---------------------------------------------------------------------------
#  4) Admin page  (http://localhost:8000/admin)
#  Admin users are stored in the MongoDB collection "admin_users"
#  (username, url_link, password).  The user below is created ONLY ONCE,
#  the first time app.py runs, when that collection is still empty.
#  After that, add users / change passwords on the admin page → Users tab.
# ---------------------------------------------------------------------------
ADMIN_USERNAME = "admin"         # first admin user name
ADMIN_PASSWORD = "admin123"      # first admin password (change it later on the Users tab)
