# SBL Greetings — Website + Backend

**Frontend:** plain HTML + CSS + JavaScript (`frontend/`)
**Backend:** Python (Flask) + MongoDB (`backend/`)
No `.bat`, `.sh`, `.command` or `.ps1` files — you run **one Python file**.

```
SBL-Greetings/
├── frontend/                 ← the website (all pages, css, js, images)
│   ├── index.html
│   ├── events/*.html
│   ├── css/
│   ├── js/
│   │   ├── api.js            ← NEW: links every page to the backend
│   │   ├── paid.js           ← UPDATED: ₹15 logo payments now saved in MongoDB
│   │   ├── script.js         ← UPDATED: newsletter now saved in MongoDB
│   │   └── poster.js         ← UPDATED: every download is counted
│   └── images/
└── backend/
    ├── app.py                ← ▶ RUN THIS FILE
    ├── config.py             ← your settings (UPI ID, price, first admin user)
    ├── .env                  ← MongoDB Atlas connection (private, never upload)
    ├── migrate_to_atlas.py   ← one-time copy of local MongoDB data into Atlas
    ├── database.py           ← MongoDB connection + creates collections/indexes automatically
    ├── requirements.txt      ← packages (installed automatically by app.py)
    └── admin/admin.html      ← admin page (payments, subscribers, downloads)
```

---

## Steps to link the frontend and backend

### Step 1 · Things you need on your computer (one time)
1. **Python 3.9 or newer** — python.org/downloads. On Windows, tick **"Add python.exe to PATH"** in the installer.
2. **A MongoDB Atlas cluster** (free M0 tier is enough), with a database user and your IP
   address added under **Network Access**.

### Step 2 · Configure MongoDB
The website uses **MongoDB Atlas only**. Copy `backend/.env.example` to **`backend/.env`** and
put in your Atlas connection string (Atlas → Clusters → Connect → Drivers) with the real password:

```
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@sbldatabase.w8vxcj3.mongodb.net/?retryWrites=true&w=majority
MONGO_DATABASE=greeting_website_db
```
`.env` holds your password: it is listed in `.gitignore`, so never upload or share it.

**Moving from a local MongoDB?** With the local MongoDB service still running, run
`python migrate_to_atlas.py` once in the `backend` folder. It copies payments, admin users,
subscribers and downloads into Atlas without creating duplicates.

### Step 3 · Start the backend — choose ONE way
- **Double-click `backend/app.py`**, or
- open the `SBL-Greetings` folder in **VS Code** → open `backend/app.py` → click **▶ Run Python File** (top right), or
- right-click `app.py` → **Edit with IDLE** → press **F5**.

The **first run** installs Flask, PyMongo, and MongoDB DNS support by itself (needs internet, once), then:
- creates the database **`greeting_website_db`** and the collections/indexes in MongoDB,
- starts the server and opens the website at **http://localhost:8000**.

Existing records in MySQL are not copied automatically; export/import them separately if you need to keep them.

You will see:
```
  MongoDB ...... connected  (database 'greeting_website_db' ready)
  Payments ..... UPI · TEST MODE (dummy numbers)  ·  ₹15 per logo change
  Website ...... http://localhost:8000
  Admin ........ http://localhost:8000/admin
```
Keep that window open while you use the site. Close it to stop the server.

> **Important:** open the site at **http://localhost:8000** — not by double-clicking `index.html`.
> The backend serves the frontend, so both are on the same address and are linked automatically.

### Step 4 · Test that they are linked
1. On any page click **Edit** on a poster → **Logo** tab → **Pay ₹15**.
2. Choose Google Pay / PhonePe / …, type any 12-digit number such as `412345678901`, click **Unlock logo**.
3. Type the **same** number again on another poster → you get *"already used"* (the server checked MongoDB).
4. In the footer type an email → **Subscribe**.
5. Download a poster.
6. In **MongoDB Compass**, connect with your Atlas connection string, open `greeting_website_db`,
   and inspect the **payments**, **subscribers**, and **downloads** collections.
7. Open **http://localhost:8000/admin** and sign in with username **`admin`**, password **`admin123`**.

---

## What the backend does

| Feature | Before | Now |
|---|---|---|
| ₹15 logo change (UPI) | reference saved only in that one browser | checked + saved by the server in MongoDB; a number works **once, on every device** |
| Razorpay | payment trusted from the browser | order created by the server, signature **verified** on the server |
| Price, UPI ID, Razorpay keys | written in `js/paid.js` | set in `backend/config.py` (secret key never sent to the browser) |
| Newsletter | only showed a message | email saved in MongoDB (no duplicates) |
| Downloads | — | every download counted (poster + PNG/JPG) |
| Admin | — | `/admin`: totals, payments to check, Verify / Reject, subscribers, downloads, **CSV export** |

**MongoDB collections** (created automatically): `payments`, `admin_users`, `subscribers`, `downloads`.

**API** (used by the frontend, all under `http://localhost:8000/api/…`):

| Method | Address | Used for |
|---|---|---|
| GET | `/api/health` | server + MongoDB status |
| GET | `/api/config` | price, brand, UPI ID, payment mode |
| POST | `/api/payments/upi` | save a 12-digit UPI reference |
| POST | `/api/payments/razorpay/order` · `/verify` | Razorpay payment |
| POST | `/api/newsletter` | subscribe |
| POST | `/api/downloads` | count a download |
| POST | `/api/admin/login` | admin sign-in (username + password) |
| GET/POST/PATCH/DELETE | `/api/admin/…` | admin page incl. `/api/admin/users` (needs sign-in) |

---

## Admin users (MongoDB collection `admin_users`)

Admin sign-in uses a **username + password** saved in MongoDB.

| Field | Meaning |
|---|---|
| `id` | number, automatic |
| `username` | sign-in name (3–50 letters/numbers, also `. _ @ -`, no spaces) |
| `password_hash` | the password, stored as a secure one-way hash (never readable) |
| `url_link` | a link saved with the user (default `http://localhost:8000/admin`) |
| `created_at`, `last_login` | automatic |

- **First user:** when the collection is empty, `app.py` creates it from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `config.py`
  (default `admin` / `admin123`). This happens once only — later changes in `config.py` do not change it.
- **Add / change / delete users:** admin page → **Users** tab (Add user · Change password · Edit link · ✕).
  You can't delete yourself or the last user. Changing a password signs that user out everywhere.
- **Forgot every password?** In MongoDB Compass, delete the documents in `admin_users` and restart `app.py` —
  the first user is created again from `config.py`.

---

## Going live with real payments

**UPI (real reference numbers)** — in `backend/config.py`:
```python
UPI_ID = "yourshop@okaxis"
```
Restart `app.py`. Test mode switches off: visitors pay to your UPI ID and type the real 12-digit UTR.
UPI cannot be checked automatically, so each one appears on the admin page as **To check** —
match it with your bank / UPI app and press **Verify** or **Reject**.

**Razorpay (checked automatically)** — fill both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Razorpay replaces UPI.

Other settings in `config.py`: `LOGO_PRICE`, `BRAND`, `WHATSAPP`, `ADMIN_USERNAME` / `ADMIN_PASSWORD` (first admin), `SERVER_PORT`.

---

## Other ways to open the site
- **From your phone (same Wi-Fi):** find your PC's IP (Windows: `ipconfig` → IPv4, e.g. 192.168.1.5) and open
  `http://192.168.1.5:8000` on the phone. Allow Python through Windows Firewall when asked.
- **VS Code Live Server (port 5500):** works too — the pages talk to the backend at `http://localhost:8000`
  (set in `frontend/js/api.js` → `BACKEND_URL`). `app.py` must still be running.
- **Online hosting:** upload both folders to a Python host (e.g. Render) with a MongoDB deployment,
  put the Atlas `MONGO_URI` and `MONGO_DATABASE` in the host's environment settings (or `backend/.env`). If the website and backend end up on different addresses,
  set `BACKEND_URL` in `frontend/js/api.js` to the backend address.

## If something goes wrong
| Message | Fix |
|---|---|
| `MONGO_URI must be your MongoDB Atlas connection string` | create `backend/.env` from `.env.example` and paste your Atlas string |
| `Cannot connect to MongoDB Atlas` | check the password in `MONGO_URI` (`backend/.env`) and add your current IP in Atlas → Network Access |
| `Port 8000 is busy` | the server is already running in another window, or change `SERVER_PORT` |
| Payment window: *"payment server is not reachable"* | `app.py` is not running, or you opened `index.html` by double-click — use http://localhost:8000 |
| Double-clicking `app.py` opens Notepad | right-click → Open with → Python, or use VS Code ▶ |

---

## Editing the website

### Edit a poster template (all in the HTML)

Every poster is plain HTML inside its card, in `frontend/index.html` (Trending) and `events/birthday.html`.
Find the card by its `data-template="…"` and edit:

```html
<div class="poster" data-name="Happy Diwali" style="--accent:#ffb938">          ← accent colour (decor, glow)
  <img class="poster__bg" src="images/backgrounds/bg-diya.jpg" style="--pos:50% 50%">   ← BACKGROUND image
  <div class="poster__overlay" style="--overlay:rgba(40,12,0,0.38)"></div>        ← colour wash (delete = none)

  <figure class="poster__photo" data-shape="circle" data-decor="dots"               ← MAIN IMAGE
          style="--x:50; --y:36; --w:44; --frame:#ffd98a">
    <img src="images/photos/diya.jpg" alt="Lit diyas">
  </figure>

  <figure class="poster__logo" data-badge style="--x:12; --y:8; --w:10">           ← LOGO
    <img src="images/logo/logo-mark.png" alt="Logo"></figure>

  <div class="poster__text" data-anchor="bottom" style="--x:50; --y:94; --w:86">   ← TEXT BLOCK
    <p class="poster__kicker"  style="--font:'Cormorant Garamond'; --size:4.2; --color:#ffd98a; --align:center">Festival of lights</p>
    <p class="poster__heading" data-effect="glow" style="--font:'Great Vibes'; --size:15; --color:#fff3d6; --align:center">Happy Diwali</p>
    <p class="poster__message" style="…">May the lights …</p>
    <p class="poster__from"    style="…">The Sharma Family</p>
  </div>
</div>
```

| Setting | Meaning |
|---|---|
| `--x`, `--y` | position in % of the poster (photo & logo: their centre) |
| `--w` | width in % of the poster |
| `data-shape` | `circle` `rounded` `arch` `heart` `star` `hexagon` `blob` |
| `data-decor` | `none` `ring` `dots` `blob` `layers` `sparkles` |
| `data-badge` | white rounded badge behind the logo (remove for none) |
| `data-anchor` | text block hangs from its `--y`: `top`, `middle` or `bottom` |
| `data-card` | frosted card behind the text; colour `--card:rgba(…)` |
| per line: `--font` `--size` `--weight` `--style:italic` `--color` `--align` `--spacing` `--case:uppercase` | each text line has its own style |
| `data-effect` on a line | `shadow`, `glow` or `outline` |
| `data-confetti="12"` on `.poster` | adds confetti & sparkles (number = pattern) |
| `--pos` on the background | which part of the photo stays visible (`50% 30%` = higher) |

Hide a line by leaving it empty. Use `<br>` for a forced line break.
The card's name/category under the poster: `data-title` / `data-cat` on the `<article>`.
**Add a template:** copy one whole `<article class="poster-card">…</article>` and change it.
**"Create Greeting" starting design:** `<template id="blankPoster">` near the bottom of each page.

Fonts available: Fraunces, Playfair Display, Cormorant Garamond, Great Vibes, Dancing Script, Pacifico,
Lobster, Caveat, Bebas Neue, Poppins, Plus Jakarta Sans (Google Fonts).

### What visitors can do

- **Cards** show the full live poster (background, main image in its shape, logo, text).
- **Preview** opens it large with **Download poster** on the preview itself and a **PNG / JPG** switch.
- **Download** on a card saves that poster straight away (PNG, 1080 × 1350).
- **Edit** opens Poster Studio:
  - **Text** — each line (top line, heading, message, name/date) has its own text, font, size, colour,
    alignment, bold / italic / capitals; heading effects; text block Top / Middle / Bottom, left-right,
    up-down, width, frosted card on/off + colour + strength.
  - **Photo** — upload, show/hide, 7 shapes, 6 decoration styles, size, 9-point placement, fine position, frame colour.
  - **Logo** — upload, show/hide, badge, size, 9-point placement, fine position.
  - **Background** — pick any background on the page or upload one, image focus, colour wash, confetti, accent colour.
  - **Download** saves exactly what the preview shows. Changes in the editor are not written back to the HTML.

### Pages and how they are linked
| Page | File | Its own look | Its own animation |
|---|---|---|---|
| Home | `index.html` | `css/home.css` | `js/home.js` |
| All Events | `events/events.html` | `css/events.css` | `js/events.js` |
| Birthdays | `events/birthday.html` | `css/birthday.css` | `js/birthday.js` |
| Weddings | `events/wedding.html` | `css/wedding.css` | `js/wedding.js` |
| Anniversary | `events/anniversary.html` | `css/anniversary.css` | `js/anniversary.js` |
| Festivals | `events/festivals.html` | `css/festivals.css` | `js/festivals.js` |
| Special Days | `events/special-days.html` | `css/special-days.css` | `js/special-days.js` |

- Every page has the same menu and footer, so all pages link to each other.
- Home page occasion cards open the matching page, already filtered —
  e.g. Diwali opens `events/festivals.html?filter=diwali`. The filter word is the `data-filter` of a chip on that page.
- Each inner page works exactly like the Birthday page: search, filter chips, sort, preview, edit, PNG/JPG download, mobile full-screen preview.
- To change a page's colours open its own css file (the variables at the top). To change the falling shapes (confetti, petals, hearts, sparks, stars) and their colours open its own js file.

### Contact details (footer)
In every page find `CONTACT DETAILS` in the footer and change the phone number and e-mail:
`<a href="tel:+919876543210">…+91 98765 43210…</a>` and `<a href="mailto:hello@yourwebsite.com">…</a>`.
Use Find & Replace across all files in VS Code (Ctrl + Shift + H) to change all 7 pages at once.

### Page header background
In any inner page find `EVENT HERO` and change:
`style="--hero-bg: url('../images/backgrounds/birthday-bg.jpg'); --hero-overlay: 0.35; --hero-position: center;"`
If the image file name contains an apostrophe (`'`), write it as `%27` here.
