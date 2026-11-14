"""
============================================================================
 SBL Greetings — BACKEND SERVER  (Python + Flask + MongoDB)

 HOW TO RUN  (no .bat / .sh files needed)
   • Double-click this file,          or
   • open it in VS Code and press ▶ (Run Python File),   or
   • open it in IDLE and press F5.

 The first run installs Flask, PyMongo, MongoDB DNS support and python-dotenv,
 creates the MongoDB Atlas collections + indexes, and opens the
 website at  http://localhost:8000
 MongoDB Atlas connection (MONGO_URI, MONGO_DATABASE) → backend/.env
 Other settings (UPI ID, price, admin password) → config.py
============================================================================
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


# ---------------------------------------------------------------------------
#  0) Install the required packages automatically on the first run
# ---------------------------------------------------------------------------
def _ensure_packages():
    need = []
    try:
        import flask  # noqa: F401
    except ImportError:
        need.append("flask")
    try:
        import pymongo  # noqa: F401
    except ImportError:
        need.append("pymongo")
    try:
        import dns  # noqa: F401
    except ImportError:
        need.append("dnspython")
    try:
        import dotenv  # noqa: F401
    except ImportError:
        need.append("python-dotenv")
    if not need:
        return
    print("\n  First run: installing " + ", ".join(need) + " (needs internet, one time only) ...\n")
    base = [sys.executable, "-m", "pip", "install", "--disable-pip-version-check"]
    for extra in ([], ["--user"], ["--break-system-packages"]):
        if subprocess.call(base + extra + need) == 0:
            break
    else:
        raise SystemExit("Could not install " + ", ".join(need) +
                         ". Check your internet connection and run app.py again.")
    import importlib
    import site
    importlib.invalidate_caches()
    try:
        user_site = site.getusersitepackages()
        if user_site not in sys.path:
            sys.path.append(user_site)
    except Exception:
        pass


try:
    _ensure_packages()
except SystemExit as _e:
    print("\n  " + str(_e))
    try:
        input("  Press Enter to close ...")
    finally:
        raise

import hashlib  # noqa: E402
import hmac  # noqa: E402
import base64  # noqa: E402
import csv  # noqa: E402
import io  # noqa: E402
import json  # noqa: E402
import re  # noqa: E402
import threading  # noqa: E402
import time  # noqa: E402
import urllib.error  # noqa: E402
import urllib.request  # noqa: E402
import webbrowser  # noqa: E402
from datetime import datetime, timezone
from zoneinfo import ZoneInfo # noqa: E402
from flask import Flask, Response, abort, jsonify, request, send_from_directory  # noqa: E402
from pymongo.errors import DuplicateKeyError, PyMongoError  # noqa: E402

try:
    import config  # noqa: E402
except Exception as _cfg_err:  # a typo in config.py — explain it instead of closing the window
    print("\n  There is a mistake in backend/config.py:\n  %s" % _cfg_err)
    print("\n  Every password and text value must be inside quotes, for example:")
    print('      UPI_ID = "yourshop@okaxis"')
    print('      ADMIN_PASSWORD = "Chakrawarthi@2026"')
    print("\n  Fix the line, save config.py and run app.py again.\n")
    try:
        input("  Press Enter to close ...")
    finally:
        raise SystemExit(1)
import database as db  # noqa: E402

FRONTEND = os.path.normpath(os.path.join(HERE, "..", "frontend"))
ADMIN_DIR = os.path.join(HERE, "admin")

app = Flask(__name__, static_folder=None)
app.config["JSON_AS_ASCII"] = False
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024   # API requests are tiny


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
def razorpay_on():
    return bool(config.RAZORPAY_KEY_ID.strip() and config.RAZORPAY_KEY_SECRET.strip())


def pay_mode():
    if razorpay_on():
        return "razorpay"
    return "upi"          # with or without a UPI ID (empty = test mode)


def test_mode():
    return not razorpay_on() and not config.UPI_ID.strip()


def ok(**data):
    data["ok"] = True
    return jsonify(data)


def fail(message, status=400, **data):
    data.update(ok=False, error=message)
    return jsonify(data), status


def body():
    return request.get_json(silent=True) or {}


def clip(value, n):
    return (str(value).strip()[:n]) if value is not None else None


def client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    return (fwd.split(",")[0].strip() if fwd else request.remote_addr or "")[:45]


def plain(row):
    """Make database rows JSON friendly using Indian time."""
    out = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            if v.tzinfo is None:
                v = v.replace(tzinfo=timezone.utc)

            v = v.astimezone(
                ZoneInfo("Asia/Kolkata")
            ).strftime("%Y-%m-%d %I:%M:%S %p")

        out[k] = v
    return out


# Very small "too many tries" guard for the payment form (per visitor IP).
_hits = {}
_hits_lock = threading.Lock()


def too_many(key, limit=12, window=60):
    now = time.time()
    with _hits_lock:
        recent = [t for t in _hits.get(key, []) if now - t < window]
        recent.append(now)
        _hits[key] = recent
        return len(recent) > limit


@app.errorhandler(PyMongoError)
def _db_down(err):
    msg = db.last_error or db.friendly(err)
    print("  [database] " + msg)
    return fail("The website database is not reachable right now. Please try again in a minute.",
                503, detail=msg)


# CORS: lets the site call the API even when it is opened from another
# address (for example VS Code Live Server on port 5500).
@app.after_request
def _cors(resp):
    if request.path.startswith("/api/"):
        resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin") or "*"
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Admin-Token"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.route("/api/<path:_any>", methods=["OPTIONS"])
def _preflight(_any):
    return ("", 204)


# ---------------------------------------------------------------------------
#  PUBLIC API  (used by the website)
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    try:
        db.ping()
        ready = True
    except PyMongoError:
        ready = False
    return ok(server="running", database="connected" if ready else "not connected",
              detail="" if ready else db.last_error)


@app.get("/api/config")
def site_config():
    """Payment settings the browser needs. Secrets never leave the server."""
    upi = config.UPI_ID.strip() or ("yourupi@bank" if test_mode() else "")
    return ok(
        brand=config.BRAND,
        price=config.LOGO_PRICE,
        priceLabel="₹%s" % config.LOGO_PRICE,
        mode=pay_mode(),
        test=test_mode(),
        upiId=upi,
        razorpayKey=config.RAZORPAY_KEY_ID.strip() if razorpay_on() else "",
        whatsapp=config.WHATSAPP.strip(),
    )


def _check_reference(ref):
    """Same rules as the payment window, enforced again on the server."""
    if len(ref) != 12:
        return "Please type the 12-digit reference number from your UPI app."
    if re.fullmatch(r"(\d)\1+", ref) or ref in ("123456789012", "012345678901", "098765432109"):
        return "That does not look like a real reference number. Please check it in your UPI app."
    return None


@app.post("/api/payments/upi")
def pay_upi():
    """Visitor paid by UPI and typed the 12-digit UPI reference (UTR)."""
    if pay_mode() != "upi":
        return fail("UPI reference payments are switched off on this site.")
    if too_many("upi:" + client_ip()):
        return fail("Too many tries. Please wait a minute and try again.", 429)
    data = body()
    ref = re.sub(r"\D", "", str(data.get("reference", "")))
    problem = _check_reference(ref)
    if problem:
        return fail(problem)
    if db.find_record("payments", {"reference": ref}, {"id": True}):
        return fail("This reference number was already used for another logo change.", 409)

    status = "test" if test_mode() else "unverified"
    try:
        pid = db.insert_record("payments", {
            "reference": ref,
            "method": "test" if test_mode() else "upi",
            "upi_app": clip(data.get("app"), 30),
            "amount": config.LOGO_PRICE,
            "poster": clip(data.get("poster"), 150),
            "action": clip(data.get("action"), 20),
            "status": status,
            "page": clip(data.get("page"), 150),
            "ip_address": client_ip(),
            "user_agent": clip(request.user_agent.string, 255),
        })
    except DuplicateKeyError:
        return fail("This reference number was already used for another logo change.", 409)
    return ok(paymentId=pid, status=status, test=test_mode())


@app.post("/api/payments/razorpay/order")
def razorpay_order():
    """Create a Razorpay order on the server (amount can't be changed by the visitor)."""
    if not razorpay_on():
        return fail("Razorpay is not switched on.")
    data = body()
    payload = json.dumps({
        "amount": int(round(float(config.LOGO_PRICE) * 100)),   # paise
        "currency": "INR",
        "receipt": "logo-%d" % int(time.time() * 1000),
        "notes": {"poster": clip(data.get("poster"), 150) or "", "action": clip(data.get("action"), 20) or ""},
    }).encode()
    auth = base64.b64encode(("%s:%s" % (config.RAZORPAY_KEY_ID.strip(), config.RAZORPAY_KEY_SECRET.strip())).encode()).decode()
    req = urllib.request.Request("https://api.razorpay.com/v1/orders", data=payload, method="POST",
                                 headers={"Content-Type": "application/json", "Authorization": "Basic " + auth})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            order = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        print("  [razorpay] order failed:", e.read().decode(errors="ignore"))
        return fail("Could not start the payment. Please check the Razorpay keys in config.py.", 502)
    except Exception as e:  # network
        print("  [razorpay] order failed:", e)
        return fail("Could not reach Razorpay. Please check the internet connection.", 502)
    return ok(orderId=order["id"], amount=order["amount"], currency=order["currency"],
              key=config.RAZORPAY_KEY_ID.strip(), brand=config.BRAND)


@app.post("/api/payments/razorpay/verify")
def razorpay_verify():
    """Check Razorpay's signature so a payment can't be faked from the browser."""
    if not razorpay_on():
        return fail("Razorpay is not switched on.")
    data = body()
    order_id = str(data.get("razorpay_order_id", ""))
    payment_id = str(data.get("razorpay_payment_id", ""))
    signature = str(data.get("razorpay_signature", ""))
    expected = hmac.new(config.RAZORPAY_KEY_SECRET.strip().encode(),
                        ("%s|%s" % (order_id, payment_id)).encode(), hashlib.sha256).hexdigest()
    if not (order_id and payment_id and hmac.compare_digest(expected, signature)):
        return fail("The payment could not be confirmed.", 400)
    try:
        pid = db.insert_record("payments", {
            "reference": payment_id[:64],
            "method": "razorpay",
            "order_id": order_id[:64],
            "amount": config.LOGO_PRICE,
            "poster": clip(data.get("poster"), 150),
            "action": clip(data.get("action"), 20),
            "status": "verified",
            "page": clip(data.get("page"), 150),
            "ip_address": client_ip(),
            "user_agent": clip(request.user_agent.string, 255),
        })
    except DuplicateKeyError:
        return fail("This payment was already used for a logo change.", 409)
    return ok(paymentId=pid, status="verified")


@app.post("/api/newsletter")
def newsletter():
    data = body()
    email = str(data.get("email", "")).strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]{2,}", email) or len(email) > 190:
        return fail("Please enter a valid email address.")
    if too_many("news:" + client_ip(), limit=8):
        return fail("Too many tries. Please wait a minute.", 429)
    if db.find_record("subscribers", {"email": email}, {"id": True}):
        return ok(already=True, message="You are already subscribed ✓")
    try:
        db.insert_record("subscribers", {
            "email": email,
            "page": clip(data.get("page"), 150),
        })
    except DuplicateKeyError:
        return ok(already=True, message="You are already subscribed ✓")
    return ok(already=False, message="Thanks! New templates will land in your inbox.")


@app.post("/api/downloads")
def log_download():
    data = body()
    fmt = "jpg" if str(data.get("format", "")).lower() in ("jpg", "jpeg") else "png"
    db.insert_record("downloads", {
        "poster": clip(data.get("poster"), 150),
        "format": fmt,
        "page": clip(data.get("page"), 150),
        "ip_address": client_ip(),
    })
    return ok()


# ---------------------------------------------------------------------------
#  ADMIN API  (http://localhost:8000/admin — password in config.py)
# ---------------------------------------------------------------------------
# --- Admin sign-in: users live in the MongoDB collection "admin_users" -----------
USERNAME_RE = re.compile(r"^[A-Za-z0-9._@-]{3,50}$")
TOKEN_HOURS = 12


def _secret_key():
    """Random key (made once, saved next to app.py) that signs the sign-in tokens."""
    path = os.path.join(HERE, ".secret_key")
    try:
        with open(path) as f:
            key = f.read().strip()
        if len(key) >= 32:
            return key
    except OSError:
        pass
    import secrets
    key = secrets.token_hex(32)
    try:
        with open(path, "w") as f:
            f.write(key)
    except OSError:
        pass
    return key


from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer  # noqa: E402
from werkzeug.security import check_password_hash  # noqa: E402

_signer = URLSafeTimedSerializer(_secret_key(), salt="sbl-admin")


def _is_hash(value):
    return str(value).startswith(("pbkdf2:", "scrypt:"))


def _password_ok(user, password):
    """Check a password. A plain password entered directly into MongoDB also works once,
    and is then replaced by a secure hash automatically."""
    stored = user["password_hash"] or ""
    if _is_hash(stored):
        try:
            return check_password_hash(stored, password)
        except ValueError:
            return False
    if stored and hmac.compare_digest(stored.encode("utf-8"), password.encode("utf-8")):
        db.update_record("admin_users", user["id"], {
            "password_hash": db.hash_password(password),
        })
        return True
    return False


def _make_token(user):
    # the end of the hash is inside the token, so changing a password signs that user out everywhere
    return _signer.dumps({"uid": user["id"], "pv": (user["password_hash"] or "")[-10:]})


def _admin():
    """Returns the signed-in admin user, or stops the request with 401."""
    def deny(msg):
        abort(Response(json.dumps({"ok": False, "error": msg}), 401, mimetype="application/json"))
    token = request.headers.get("X-Admin-Token", "")
    if not token:
        deny("Please sign in.")
    try:
        data = _signer.loads(token, max_age=TOKEN_HOURS * 3600)
    except SignatureExpired:
        deny("Your session ended. Please sign in again.")
    except BadSignature:
        deny("Please sign in again.")
    user = db.find_by_id(
        "admin_users", data.get("uid"),
        {"id": True, "username": True, "password_hash": True, "url_link": True},
    )
    if not user or (user["password_hash"] or "")[-10:] != data.get("pv"):
        deny("Your password was changed or your user was removed. Please sign in again.")
    return user


def _user_out(u):
    return plain({k: v for k, v in u.items() if k != "password_hash"})


@app.post("/api/admin/login")
def admin_login():
    if too_many("admin:" + client_ip(), limit=10):
        return fail("Too many tries. Please wait a minute and try again.", 429)
    data = body()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    if not username or not password:
        return fail("Please type your username and password.")
    user = db.find_record("admin_users", {"username": username})
    if not user or not _password_ok(user, password):
        print("  [admin] failed sign-in for '%s' from %s" % (username[:50], client_ip()))
        return fail("Wrong username or password. (Capital letters count.)", 401)
    user = db.find_by_id("admin_users", user["id"])  # hash may have been upgraded
    db.update_record("admin_users", user["id"], {
        "last_login": datetime.now().astimezone(),
    })
    user = db.find_by_id("admin_users", user["id"])
    return ok(token=_make_token(user), user=_user_out(user))


@app.get("/api/admin/me")
def admin_me():
    return ok(user=_user_out(_admin()))


def _clean_link(value):
    link = str(value or "").strip()[:255]
    if link and not re.match(r"^(https?://|/)", link, re.I):
        local = re.match(r"^(localhost|127\.|192\.168\.|10\.)", link, re.I)
        link = ("http://" if local else "https://") + link
    return link or None


@app.get("/api/admin/users")
def admin_users():
    me = _admin()
    rows = db.list_records(
        "admin_users",
        sort=[("id", 1)],
        projection={"id": True, "username": True, "url_link": True, "created_at": True, "last_login": True},
    )
    return ok(rows=[plain(r) for r in rows], me=me["id"])


@app.post("/api/admin/users")
def admin_user_add():
    _admin()
    data = body()
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    if not USERNAME_RE.match(username):
        return fail("Username: 3 to 50 letters or numbers (you can also use . _ @ -), no spaces.")
    if len(password) < 6:
        return fail("Password must be at least 6 characters.")
    try:
        uid = db.insert_record("admin_users", {
            "username": username,
            "password_hash": db.hash_password(password),
            "url_link": _clean_link(data.get("url_link")),
            "last_login": None,
        })
    except DuplicateKeyError:
        return fail("That username is already taken.", 409)
    return ok(id=uid)


@app.patch("/api/admin/users/<int:uid>")
def admin_user_edit(uid):
    me = _admin()
    data = body()
    updates = {}
    if "username" in data:
        username = str(data.get("username", "")).strip()
        if not USERNAME_RE.match(username):
            return fail("Username: 3 to 50 letters or numbers (you can also use . _ @ -), no spaces.")
        updates["username"] = username
    if "url_link" in data:
        updates["url_link"] = _clean_link(data.get("url_link"))
    if str(data.get("password", "")).strip():
        password = str(data["password"]).strip()
        if len(password) < 6:
            return fail("Password must be at least 6 characters.")
        updates["password_hash"] = db.hash_password(password)
    if not updates:
        return fail("Nothing to change.")
    try:
        n = db.update_record("admin_users", uid, updates)
    except DuplicateKeyError:
        return fail("That username is already taken.", 409)
    out = {"updated": n}
    if uid == me["id"]:          # keep the current admin signed in after changing own password
        fresh = db.find_by_id("admin_users", uid)
        out["token"] = _make_token(fresh)
    return ok(**out)


@app.delete("/api/admin/users/<int:uid>")
def admin_user_delete(uid):
    me = _admin()
    if uid == me["id"]:
        return fail("You cannot delete the user you are signed in with.")
    total = db.count_records("admin_users")
    if total <= 1:
        return fail("At least one admin user must remain.")
    n = db.delete_record("admin_users", uid)
    return ok(deleted=n)


@app.get("/api/admin/summary")
def admin_summary():
    _admin()
    return ok(
        mode=pay_mode(), test=test_mode(), price=config.LOGO_PRICE,
        payments=db.count_records("payments"),
        revenue=float(db.sum_payments(("verified", "unverified"))),
        verified=float(db.sum_payments(("verified",))),
        toCheck=db.count_records("payments", {"status": "unverified"}),
        tests=db.count_records("payments", {"status": "test"}),
        subscribers=db.count_records("subscribers"),
        downloads=db.count_records("downloads"),
        downloadsToday=db.count_downloads_today(),
        topPosters=[plain(r) for r in db.top_posters()],
    )


@app.get("/api/admin/payments")
def admin_payments():
    _admin()
    status = request.args.get("status", "")
    q = request.args.get("q", "").strip()
    filters = {}
    if status:
        filters["status"] = status
    if q:
        filters["$or"] = [
            {"reference": {"$regex": re.escape(q), "$options": "i"}},
            {"poster": {"$regex": re.escape(q), "$options": "i"}},
        ]
    rows = db.list_records("payments", filters, sort=[("id", -1)], limit=500)
    return ok(rows=[plain(r) for r in rows])


@app.patch("/api/admin/payments/<int:pid>")
def admin_payment_status(pid):
    _admin()
    status = str(body().get("status", ""))
    if status not in ("verified", "unverified", "rejected", "test"):
        return fail("Unknown status.")
    n = db.update_record("payments", pid, {"status": status})
    return ok(updated=n)


@app.delete("/api/admin/payments/<int:pid>")
def admin_payment_delete(pid):
    _admin()
    n = db.delete_record("payments", pid)
    return ok(deleted=n)


@app.get("/api/admin/subscribers")
def admin_subscribers():
    _admin()
    rows = db.list_records("subscribers", sort=[("id", -1)], limit=1000)
    return ok(rows=[plain(r) for r in rows])


@app.delete("/api/admin/subscribers/<int:sid>")
def admin_subscriber_delete(sid):
    _admin()
    n = db.delete_record("subscribers", sid)
    return ok(deleted=n)


@app.get("/api/admin/downloads")
def admin_downloads():
    _admin()
    rows = db.list_records("downloads", sort=[("id", -1)], limit=500)
    return ok(rows=[plain(r) for r in rows])


@app.get("/api/admin/export/<table>")
def admin_export(table):
    _admin()
    if table not in ("payments", "subscribers", "downloads"):
        abort(404)
    rows = db.list_records(table, sort=[("id", -1)])
    buf = io.StringIO()
    if rows:
        w = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow(plain(r))
    return Response("﻿" + buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=%s.csv" % table})


# ---------------------------------------------------------------------------
#  WEBSITE FILES  (the frontend folder is served from the same address)
# ---------------------------------------------------------------------------
@app.get("/admin")
@app.get("/admin/")
def admin_page():
    return send_from_directory(ADMIN_DIR, "admin.html")


@app.get("/")
def home():
    return send_from_directory(FRONTEND, "index.html")


@app.get("/<path:path>")
def site_files(path):
    if path.startswith("api/"):
        abort(404)
    full = os.path.normpath(os.path.join(FRONTEND, path))
    if not full.startswith(FRONTEND):
        abort(404)
    if os.path.isdir(full):
        path = path.rstrip("/") + "/index.html"
    resp = send_from_directory(FRONTEND, path)
    if path.endswith((".html", ".js", ".css")):
        resp.headers["Cache-Control"] = "no-cache"
    return resp


# ---------------------------------------------------------------------------
#  START
# ---------------------------------------------------------------------------
def main():
    url = "http://localhost:%s" % config.SERVER_PORT
    print("=" * 66)
    print("  SBL Greetings — backend server")
    print("=" * 66)
    if db.setup():
        print("  MongoDB ...... connected to Atlas  (database '%s' ready)" % config.MONGO_DATABASE)
    else:
        print("  MongoDB ...... NOT connected")
        print("                 " + db.last_error)
        print("                 The website still opens. Fix backend/.env (or Atlas")
        print("                 Network Access) and run app.py again.")
    mode = "Razorpay" if razorpay_on() else ("UPI · TEST MODE (dummy numbers)" if test_mode() else "UPI · " + config.UPI_ID)
    print("  Payments ..... %s  ·  ₹%s per logo change" % (mode, config.LOGO_PRICE))
    print("  Website ...... %s" % url)
    print("  Admin ........ %s/admin" % url)
    if db.seeded_admin:
        print("                 First admin user created in MongoDB collection admin_users:")
        print("                 username: %s   password: (ADMIN_PASSWORD in config.py)" % db.seeded_admin)
    print("  Stop ......... close this window (or press Ctrl + C)")
    print("=" * 66)
    if config.OPEN_BROWSER:
        threading.Timer(1.2, lambda: webbrowser.open(url)).start()
    app.run(host="0.0.0.0", port=int(config.SERVER_PORT), debug=False, threaded=True)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:  # keep the window open on a double-click so the error can be read
        print("\n  The server stopped because of an error:\n  %s\n" % e)
        if "Address already in use" in str(e) or "10048" in str(e):
            print("  Port %s is busy — the server may already be running, or change SERVER_PORT in config.py." % config.SERVER_PORT)
        try:
            input("  Press Enter to close ...")
        except Exception:
            pass
