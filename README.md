# Family Chore Planner

A full-stack household chore planner with secure family accounts, a collaborative dashboard for parents and kids, and persistent storage powered by SQLite. Families can register, log in, manage members, assign chores, and track progress from any device.

## Features

- 🔐 **Family accounts** – parents register the household, log in with secure passwords, and manage their own data.
- 👨‍👩‍👧‍👦 **Member management** – add parents or kids to the roster and assign chores directly to them.
- ✅ **Chore workflow** – create chores with due dates and points, update their status, mark them complete, or delete them when finished.
- 🧠 **Smart dashboard** – see total chores, in-progress work, and anything overdue at a glance.
- 🏆 **Leaderboard** – celebrate the family members who complete the most chores and earn the most points.
- 💡 **Helpful nudges** – rotating suggestions keep the chore routine fun and engaging.
- 🗄️ **SQLite persistence** – all data is stored in a lightweight relational database so every family has its own private dashboard.

## Tech stack

- **Frontend**: Vanilla HTML, CSS, and JavaScript (ES modules) served as a single-page experience.
- **Backend**: Node.js with Express, JSON Web Tokens for auth, and SQLite for data storage.
- **Tooling**: Nodemon for local development reloads and dotenv for environment configuration.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example environment file and tweak values as needed.

```bash
cp .env.example .env
```

Key variables:

- `PORT` – HTTP port for the server (defaults to `3000`).
- `JWT_SECRET` – secret used to sign authentication tokens (change this in production).
- `DATABASE_FILE` – path to the SQLite database file.

### 3. Initialize the database (optional but recommended)

The server creates tables automatically on startup, but you can pre-create them manually:

```bash
npm run migrate
```

### 4. Run the application

Use the dev script for automatic restarts when backend files change:

```bash
npm run dev
```

Then visit [http://localhost:3000](http://localhost:3000) to open the app.

For production-style execution:

```bash
npm start
```

## Usage workflow

1. **Create a family account** – supply a family name, parent name, email, and password.
2. **Add members** – invite additional parents or kids so chores can be assigned to them.
3. **Create chores** – specify the title, description, points, and optional due date and assignee.
4. **Track progress** – update statuses, mark chores complete, and review stats plus the leaderboard.
5. **Log out securely** – tokens are stored in the browser and cleared when the user logs out.

## Project structure

```
├── public/
│   ├── app.js          # Frontend application logic (ES module)
│   ├── index.html      # Single-page UI shell
│   └── styles.css      # Global styles for the application
├── server.js           # Express server, REST API, and SQLite initialization
├── scripts/
│   └── migrate.js      # Database migration/initialization helper
├── data/               # SQLite database (created at runtime)
└── .env.example        # Sample environment configuration
```

## Future enhancements

Have an idea? Here are a few next steps worth considering:

- 📅 Recurring chore schedules with automatic regeneration.
- 📱 Push notifications or email reminders before chores are due.
- 🧾 Activity history so families can review past completions.
- 👥 Multi-parent permissions and kid logins with limited capabilities.

Open an issue or share suggestions and we can prioritize them together!
