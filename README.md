# Aditya Security Guard — Multi-Platform Conversion

This converts the original Android/Firebase **AdityaSecurityGuard** app into
three independent deliverables, as requested:

1. **`flutter_app/`** — a Flutter mobile app with static/mock data (no backend wired up)
2. **`mongodb_design/`** — a MongoDB database schema design (Mongoose models), not connected to anything
3. **`web_frontend/`** — a Node.js/Express web dashboard (HTML/CSS/vanilla JS) with static/mock data

None of the three pieces talk to each other or to a real database yet — each
uses the same shape of mock data so behavior is consistent, and the MongoDB
design shows exactly how you'd wire a real backend in later.

---

## 1. Flutter app — `flutter_app/`

**Run it:**
```bash
cd flutter_app
flutter pub get
flutter run
```
Requires the Flutter SDK (this environment doesn't have one installed, so
the app hasn't been compiled here — the source is ready to open in
Android Studio / VS Code / run via `flutter run`).

**What's included:**
- Splash screen → Login (`lib/screens/login_screen.dart`) using static users in `lib/data/mock_data.dart`
- Role-based routing to **Admin** (`lib/screens/admin/`) or **Guard** (`lib/screens/user/`) shells
- Admin: Home, Scan QR, Get QR Data, Upload/Get Images, Add/Get Security, Add Duty Places, Assign Duty, Show/Delete Assigned Duties, Duty Finished Status (with progress bars + simulated PDF export), Profile, Contact — 14 sections, full parity with the original nav drawer
- Guard: Home, Scan QR, Upload Images, Get QR Data, My Duties, Profile, Contact
- Night-shift navy + amber theme (`lib/theme.dart`)

**Demo logins:** `admin` / `admin123` (admin), `2758` / `guard@123` (guard)

---

## 2. MongoDB schema design — `mongodb_design/`

See `mongodb_design/README.md` for the full design write-up: collection
list, sample documents, indexes, and notes on what changed vs. the original
Firebase structure (hashed passwords, indexed lookups instead of nested-tree
walks). `schemas/*.js` are ready-to-use Mongoose models — nothing here
connects to a database; wire it up later with:
```js
mongoose.connect('mongodb://localhost:27017/security_guard_db');
```

---

## 3. Web frontend + backend — `web_frontend/`

This is connected to MongoDB for authentication and user/guard management.
Everything else (duty places, assignments, QR scans, uploaded images, duty
status) still uses the static mock data in `public/js/data.js`.

It works with either a **local MongoDB** or a **MongoDB Atlas** (cloud)
cluster — same code either way, just a different `MONGO_URI` in `.env`.

**If you're using Atlas** (`mongodb+srv://...`), skip straight to the
"Creating the first admin user" section below — Atlas already requires a
username/password to connect, so you don't need the local "Securing local
MongoDB with an admin user" section at all, and there's no separate
`mongod` process to run on your machine; Atlas hosts it for you.

Two separate ports are involved when running locally, and they are
independent processes:

| Service | Port | Configured in |
|---|---|---|
| MongoDB (local) | `27017` (default) | wherever your local `mongod` runs |
| Express web app | `3000` (default) | `.env` → `PORT` |

(With Atlas, there's no local Mongo port at all — just the Express port above.)

**Setup:**
```bash
cd web_frontend
cp .env.example .env        # then set MONGO_URI to your Atlas connection string
npm install                 # installs express, mongoose, bcryptjs, dotenv
```
If using local MongoDB instead of Atlas, make sure it's running (see
"Securing local MongoDB with an admin user" below if you want it
password-protected, or just run plain `mongod` if not).

### Creating the first admin user

There's no seed script with credentials baked into a file. Instead, you
create the very first admin account yourself, directly in the MongoDB
shell — then log in as that admin and use the **"Add Security"** page in
the web app for every account after that.

```bash
# 1. Generate a bcrypt hash for the password you want this admin to use
cd web_frontend
npm run hash -- YourChosenPassword
# prints something like: $2a$10$abc123....................................

# 2. Open the Mongo shell
mongosh

# 3. Insert the admin user, pasting the hash from step 1
use security_guard_db
db.users.insertOne({
  roll_no: "admin1",
  password: "$2a$10$abc123....................................",
  first_name: "Your Name",
  designation: "Site Administrator",
  mobile: "9000000000",
  role: "admin"
})
exit
```

Now start the app:
```bash
npm start
```
Open `http://localhost:3000` and log in with the roll number/password you
just chose. From there, use the sidebar's **"Add Security"** page to
create every other admin or guard account — no more manual shell work
needed after this one-time step.

### Securing local MongoDB with an admin user

By default, a freshly installed local MongoDB has **no authentication** —
anyone who can reach port 27017 can read/write everything. This is fine
for local development; skip this section if you're not worried about it
yet. To lock the database itself down with a root credential (separate
from the app-level "admin" user above — this one protects MongoDB itself):

```bash
# 1. Start mongod WITHOUT auth for this one-time setup step
mongod --dbpath /your/data/path

# 2. In another terminal, connect and create the root user
mongosh
> use admin
> db.createUser({
    user: "asg_admin",
    pwd: "ChangeThisPassword123",     // pick your own strong password
    roles: [ { role: "root", db: "admin" } ]
  })
> exit

# 3. Stop mongod (Ctrl+C), then restart it WITH auth enabled
mongod --dbpath /your/data/path --auth
```

Or, if you're running MongoDB as a service via a config file
(`mongod.conf`), add:
```yaml
security:
  authorization: enabled
```
and restart the service instead of step 3 above.

Then set the matching values in `web_frontend/.env`:
```
MONGO_USER=asg_admin
MONGO_PASSWORD=ChangeThisPassword123
MONGO_AUTH_SOURCE=admin
```
`config/db.js` assembles these into a connection URI like
`mongodb://asg_admin:****@127.0.0.1:27017/security_guard_db?authSource=admin`
(password never printed in logs). If `MONGO_USER`/`MONGO_PASSWORD` are left
blank, it connects without credentials instead. If the roll number/password
contain characters that don't play well when auto-encoded, set `MONGO_URI`
directly in `.env` instead — it takes priority over the individual
`MONGO_*` fields.

Passwords for app users (the `users` collection) are stored as bcrypt
hashes, not plaintext — unlike the original app, which compared plaintext
passwords directly.

**What's included:**
- `server.js` — Express server; connects to MongoDB on startup via `config/db.js`, then mounts:
  - `POST /api/auth/login` — checks roll_no/password against MongoDB, and rejects blocked accounts
  - `GET /api/users?role=&search=&page=&limit=` — paginated, searchable list of accounts (search matches name, roll no, mobile, **and designation**)
  - `POST /api/users` — create a single account (used by "Add Security")
  - `POST /api/users/bulk` — create many accounts from a parsed CSV (used by "Add Security" bulk upload); returns a per-row `inserted`/`skipped` summary so bad rows don't block good ones
  - `PUT /api/users/:id` — edit an account's name, designation, mobile, role, and optionally its password (roll_no stays fixed as the login key)
  - `PATCH /api/users/:id/toggle-block` — block or unblock an account
  - `DELETE /api/users/:id` — permanently remove an account
- `models/User.js` — Mongoose schema: `roll_no`, `password` (bcrypt hash), `first_name`, `designation`, `mobile`, `role` (`admin` | `security`), `blocked` (boolean, default false)
- `hash-password.js` — run with `npm run hash -- <password>` to get a bcrypt hash for manually inserting a user in mongosh (used for the first admin only)
- `public/js/csv.js` — CSV parsing (quoted-field aware) and the "Download CSV Template" button used by bulk upload
- `public/js/api.js` — thin `fetch()` wrapper the frontend uses to talk to the API above
- `public/index.html` — login page (asks for Roll No + Password), calls `POST /api/auth/login`
- `public/admin.html` + `public/js/admin.js` — admin dashboard:
  - **"Add Security"** — single-account form plus a **bulk CSV upload**: download a template, fill it in, upload it, and see which rows were inserted vs. skipped (with reasons)
  - **"Get Security Data"** — reads live from MongoDB with a **search box** (name / roll no / mobile / designation), a **rows-per-page dropdown** (10/20/50/100), a **serial number column**, **Previous/Next** pagination, a **Status** column (Active/Blocked), and per-row **✏️ Edit / 🚫 Block / 🗑 Delete** actions on the right. Edit opens a small modal; Block and Delete ask for confirmation first.
  - The sidebar (including the Logout button) now stays pinned to the viewport regardless of how tall the table gets — it no longer drifts down the page as more rows are shown
  - The other 12 sections are unchanged (static mock data)
- `public/user.html` + `public/js/user.js` — guard dashboard, unchanged aside from checking for role `"security"` to match the real role value
- `public/css/style.css` — shared theme (Big Shoulders Display for headings, Inter for body)

**CSV bulk upload format** (also downloadable as a template from the "Add Security" page):
```csv
roll_no,password,first_name,designation,mobile,role
1001,Pass@123,John Doe,Security Guard,9000000000,security
```
`role` must be exactly `admin` or `security`. Passwords in the CSV are plaintext going in — the server hashes each one with bcrypt before saving, same as the single-add form. Rows with a duplicate `roll_no`, a missing required field, or an invalid `role` are skipped individually and reported back, without failing the rest of the file.

All JS files were syntax-checked (`node --check`) and the static pages were verified to load correctly. The live MongoDB connection itself hasn't been tested end-to-end in this sandbox (no MongoDB or network access here) — test it with a real local MongoDB on your machine.

### Troubleshooting: "Unexpected token '<', is not valid JSON"

This means the browser got an HTML page back where it expected JSON —
almost always because the request hit a route Express doesn't recognize
(a typo'd URL, or **the server process still running old code** — Node
doesn't reload `server.js`/`routes/*.js` automatically, so after pulling
an update you must stop (`Ctrl+C`) and re-run `npm start`). Two things
now make this easier to diagnose:
- Any unmatched `/api/*` route now returns a proper JSON 404 instead of
  Express's default HTML error page.
- `public/js/api.js` now checks the response's content type before
  parsing it, and if it's not JSON, throws a clear error naming the HTTP
  status and the start of what was actually returned, instead of the raw
  parse exception.

If you still see this after restarting the server, check the browser's
Network tab for the failing request and read the actual response body —
it will now say plainly what went wrong.

### Duty Status: Assign Duty / Show Assigned Duties

The "Duty Status" section now covers:

- **Assign Duty to Guard** — drag main places and guards into a batch, then submit.
  - The duty date picker only allows today or later (enforced both with an
    HTML `min` and a server-side check on submit).
  - The Main Places and Guards columns each have their own search box.
  - Picking a date fetches whatever is already assigned for that day from
    MongoDB and shows it locked at the top of the Duty Assignments column
    (green "Already assigned" cards, no remove button) — their places and
    guards are greyed out in the two source columns so they can't be
    double-booked. You can still drag in more duties for the same date on
    top of what's already there.
  - A dashed "+ Drag a main place here to add another duty" placeholder is
    always visible at the bottom of the Duty Assignments column, even once
    it has cards in it.
- **Show Assigned Duties** — search, a date filter (with a "Clear date"
  link), pagination, and a **Status** column showing Completed vs Upcoming
  (a duty is "completed" once its date has passed). Completed duties have
  their Edit/Delete icons disabled (both in the UI and enforced again on
  the server) — only upcoming duties can be changed. A **Download PDF**
  button exports whatever the current search/date filter matches, using
  jsPDF + autotable (loaded via CDN in `admin.html`).

---

## Next steps to make this a real, connected system

1. Stand up MongoDB locally or on Atlas, connect Mongoose using the schemas in `mongodb_design/schemas/`.
2. Replace `public/js/data.js`'s static `MOCK` object with `fetch()` calls to new Express routes in `server.js` that query those Mongoose models.
3. Point the Flutter app at the same Express API instead of `lib/data/mock_data.dart` (e.g. using the `http` package).
4. Add real authentication (hash passwords with `bcrypt`, issue a JWT or session cookie) instead of the plaintext demo check used here and in the original app.
