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
  - `POST /api/auth/login` — checks roll_no/password against MongoDB
  - `GET /api/users?role=admin|security` — list accounts
  - `POST /api/users` — create a new account (used by "Add Security")
- `models/User.js` — Mongoose schema: `roll_no`, `password` (bcrypt hash), `first_name`, `designation`, `mobile`, `role` (`admin` | `security`) — matches your real data fields exactly
- `hash-password.js` — run with `npm run hash -- <password>` to get a bcrypt hash for manually inserting a user in mongosh (used for the first admin only)
- `public/js/api.js` — thin `fetch()` wrapper the frontend uses to talk to the API above
- `public/index.html` — login page (asks for Roll No + Password), calls `POST /api/auth/login`
- `public/admin.html` + `public/js/admin.js` — admin dashboard; **"Add Security"** now has `roll_no`, `password`, `role` (Admin / Security Guard) fields and posts to MongoDB; **"Get Security Data"** now reads live from MongoDB. The other 12 sections are unchanged (static mock data).
- `public/user.html` + `public/js/user.js` — guard dashboard, unchanged aside from checking for role `"security"` to match the real role value
- `public/css/style.css` — shared theme (Big Shoulders Display for headings, Inter for body)

All JS files were syntax-checked (`node --check`) and the static pages were verified to load correctly. The live MongoDB connection itself hasn't been tested end-to-end in this sandbox (no MongoDB or network access here) — test it with a real local MongoDB on your machine.

---

## Next steps to make this a real, connected system

1. Stand up MongoDB locally or on Atlas, connect Mongoose using the schemas in `mongodb_design/schemas/`.
2. Replace `public/js/data.js`'s static `MOCK` object with `fetch()` calls to new Express routes in `server.js` that query those Mongoose models.
3. Point the Flutter app at the same Express API instead of `lib/data/mock_data.dart` (e.g. using the `http` package).
4. Add real authentication (hash passwords with `bcrypt`, issue a JWT or session cookie) instead of the plaintext demo check used here and in the original app.
