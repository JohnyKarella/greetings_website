"""Copy the SBL Greetings data from your local MongoDB into MongoDB Atlas.

Run once from the backend folder:   python migrate_to_atlas.py

- Reads from:  mongodb://localhost:27017   (what MongoDB Compass shows as localhost:27017)
- Writes to:   MONGO_URI in backend/.env   (your Atlas connection string)
- Database:    MONGO_DATABASE in backend/.env  (greeting_website_db)

Safe to run more than once, and safe even if app.py already started on Atlas:
admin users are matched by username, payments by reference number, subscribers
by email, so nothing is doubled. Nothing is deleted.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient, ReplaceOne, UpdateOne

load_dotenv(Path(__file__).resolve().parent / ".env")

LOCAL_URI = os.getenv("LOCAL_MONGO_URI", "mongodb://localhost:27017")
ATLAS_URI = os.getenv("MONGO_URI", "").strip()
DB_NAME = os.getenv("MONGO_DATABASE", "greeting_website_db").strip() or "greeting_website_db"

# collection -> field that identifies the same record on both sides
MATCH_ON = {"admin_users": "username", "payments": "reference", "subscribers": "email"}

if not ATLAS_URI.startswith("mongodb+srv://"):
    sys.exit("MONGO_URI in backend/.env is not an Atlas address (mongodb+srv://...). Fix .env first.")

local_client = MongoClient(LOCAL_URI, serverSelectionTimeoutMS=5000)
try:
    local_client.admin.command("ping")
except Exception as exc:
    sys.exit(f"Cannot reach local MongoDB at {LOCAL_URI}. Start the MongoDB service first.\n{exc}")
local = local_client[DB_NAME]

atlas_client = MongoClient(ATLAS_URI, serverSelectionTimeoutMS=10000)
try:
    atlas_client.admin.command("ping")
except Exception as exc:
    sys.exit(f"Cannot reach Atlas. Check the password in MONGO_URI and your IP in Network Access.\n{exc}")
atlas = atlas_client[DB_NAME]

names = [n for n in local.list_collection_names() if not n.startswith("system.")]
if not names:
    sys.exit(f"No collections found in local database '{DB_NAME}'.")

print(f"Copying '{DB_NAME}' from {LOCAL_URI} to Atlas...")
for name in sorted(names):
    ops = []
    key = MATCH_ON.get(name)
    for doc in local[name].find():
        if name == "counters":
            # never lower a counter, or new records would reuse old id numbers
            ops.append(UpdateOne({"_id": doc["_id"]}, {"$max": {"seq": doc.get("seq", 0)}}, upsert=True))
        elif key and doc.get(key) is not None:
            doc.pop("_id", None)  # keep Atlas's own _id if the record is already there
            ops.append(ReplaceOne({key: doc[key]}, doc, upsert=True))
        else:
            ops.append(ReplaceOne({"_id": doc["_id"]}, doc, upsert=True))
    if ops:
        atlas[name].bulk_write(ops, ordered=False)
    print(f"  {name:<14} {len(ops):>5} documents")

print("Done. Now start the site with:  python app.py")
