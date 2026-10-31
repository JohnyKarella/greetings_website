"""
MongoDB connection and persistence helpers for SBL Greetings.
"""
from datetime import datetime, timezone

from pymongo import ASCENDING, DESCENDING, MongoClient, ReturnDocument
from pymongo.errors import ConfigurationError, DuplicateKeyError, PyMongoError

import config

_COLLECTIONS = ("payments", "admin_users", "subscribers", "downloads")
_ready = False
last_error = ""
seeded_admin = ""
_client = None
_database = None
_config_error = ""


def friendly(err):
    """Return an actionable MongoDB connection error without exposing credentials."""
    return (
        "Cannot connect to MongoDB Atlas at %s (database '%s'). Check the password in "
        "MONGO_URI in backend/.env and that your IP address is allowed in Atlas > "
        "Network Access. Details: %s"
        % (config.MONGO_URI.split("@")[-1], config.MONGO_DATABASE, err)
    )


# Only MongoDB Atlas is used. A wrong or missing address is reported on the
# console and at /api/health instead of crashing the server.
if not config.MONGO_URI.startswith("mongodb+srv://"):
    _config_error = ("MONGO_URI must be your MongoDB Atlas connection string "
                     "(mongodb+srv://...). Set it in backend/.env.")
else:
    try:
        _client = MongoClient(
            config.MONGO_URI,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            tz_aware=True,
        )
        _database = _client[config.MONGO_DATABASE]
    except PyMongoError as _err:  # e.g. no internet, so the Atlas address cannot be looked up
        _config_error = friendly(_err)
last_error = _config_error


def _public_doc(document):
    if document is None:
        return None
    document.pop("_id", None)
    return document


def setup():
    """Connect to MongoDB, create indexes, and seed the first admin if needed."""
    global _ready, last_error
    if _client is None:
        _ready, last_error = False, _config_error
        return False
    try:
        _client.admin.command("ping")
        _database.payments.create_index("reference", unique=True)
        _database.admin_users.create_index("username", unique=True)
        _database.subscribers.create_index("email", unique=True)
        _database.downloads.create_index([("created_at", DESCENDING)])
        _database.downloads.create_index([("poster", ASCENDING)])

        for name in _COLLECTIONS:
            latest = _database[name].find_one(
                {}, sort=[("id", DESCENDING)], projection={"id": True}
            )
            initial_id = latest.get("id", 0) if latest else 0
            _database.counters.update_one(
                {"_id": name}, {"$max": {"seq": initial_id}}, upsert=True
            )

        _seed_first_admin()
        _ready, last_error = True, ""
    except PyMongoError as err:
        _ready, last_error = False, friendly(err)
    return _ready


def _ensure_ready():
    if not _ready and not setup():
        from pymongo.errors import ConnectionFailure

        raise ConnectionFailure(last_error)


def ping():
    global _ready, last_error
    if _client is None:
        _ready, last_error = False, _config_error
        raise ConfigurationError(_config_error)
    try:
        _client.admin.command("ping")
        last_error = ""
    except PyMongoError as err:
        _ready, last_error = False, friendly(err)
        raise


def _next_id(collection):
    counter = _database.counters.find_one_and_update(
        {"_id": collection},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return counter["seq"]


def find_record(collection, filters, projection=None):
    _ensure_ready()
    return _public_doc(_database[collection].find_one(filters, projection))


def find_by_id(collection, record_id, projection=None):
    return find_record(collection, {"id": record_id}, projection)


def list_records(collection, filters=None, sort=None, limit=None, projection=None):
    _ensure_ready()
    cursor = _database[collection].find(filters or {}, projection)
    if sort:
        cursor = cursor.sort(sort)
    if limit is not None:
        cursor = cursor.limit(limit)
    return [_public_doc(document) for document in cursor]


def insert_record(collection, document):
    _ensure_ready()
    record = dict(document)
    record["id"] = _next_id(collection)
    now = datetime.now(timezone.utc)
    record["created_at"] = now
    if collection == "payments":
        record["updated_at"] = now
    _database[collection].insert_one(record)
    return record["id"]


def update_record(collection, record_id, updates):
    _ensure_ready()
    fields = dict(updates)
    if collection == "payments":
        fields["updated_at"] = datetime.now(timezone.utc)
    result = _database[collection].update_one({"id": record_id}, {"$set": fields})
    return result.matched_count


def delete_record(collection, record_id):
    _ensure_ready()
    return _database[collection].delete_one({"id": record_id}).deleted_count


def count_records(collection, filters=None):
    _ensure_ready()
    return _database[collection].count_documents(filters or {})


def sum_payments(statuses):
    _ensure_ready()
    result = list(_database.payments.aggregate([
        {"$match": {"status": {"$in": list(statuses)}}},
        {"$group": {"_id": None, "amount": {"$sum": "$amount"}}},
    ]))
    return result[0]["amount"] if result else 0


def count_downloads_today():
    _ensure_ready()
    today = datetime.now().astimezone().date()
    start = datetime.combine(today, datetime.min.time()).astimezone(timezone.utc)
    end = datetime.combine(today, datetime.max.time()).astimezone(timezone.utc)
    return _database.downloads.count_documents(
        {"created_at": {"$gte": start, "$lte": end}}
    )


def top_posters(limit=8):
    _ensure_ready()
    return list(_database.downloads.aggregate([
        {"$group": {"_id": "$poster", "total": {"$sum": 1}}},
        {"$sort": {"total": DESCENDING}},
        {"$limit": limit},
        {"$project": {"_id": 0, "poster": "$_id", "total": 1}},
    ]))


def hash_password(password):
    """Passwords are never stored as plain text — only this one-way hash."""
    from werkzeug.security import generate_password_hash

    return generate_password_hash(password, method="pbkdf2:sha256")


def _seed_first_admin():
    global seeded_admin
    if _database.admin_users.count_documents({}):
        return
    username = str(getattr(config, "ADMIN_USERNAME", "admin")).strip() or "admin"
    password = str(getattr(config, "ADMIN_PASSWORD", "admin123")).strip() or "admin123"
    record = {
        "id": _next_id("admin_users"),
        "username": username,
        "password_hash": hash_password(password),
        "url_link": "http://localhost:%s/admin" % getattr(config, "SERVER_PORT", 8000),
        "last_login": None,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        _database.admin_users.insert_one(record)
        seeded_admin = username
    except DuplicateKeyError:
        if not _database.admin_users.find_one({"username": username}):
            raise
