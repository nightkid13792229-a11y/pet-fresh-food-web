# PetFresh Backend

Express-based API service powering the PetFresh management platform.

## Getting Started

```bash
cd backend
npm install
cp config/sample.env config/.env  # adjust credentials
npm run dev
```

## Available Scripts

- `npm run dev` – start server with hot reload
- `npm start` – start server in production mode
- `npm run lint` – run ESLint on the codebase

## Project Structure

```
backend/
├── config/           # environment templates
├── docs/             # API docs & operational guides
├── sql/              # schema & seed scripts
└── src/
    ├── config/       # configuration loader
    ├── db/           # database pool helpers
    ├── middleware/   # express middleware
    ├── modules/      # feature modules (auth, orders, recipes, ...)
    ├── routes/       # central router
    ├── utils/        # helpers (logger, token, password)
    ├── app.js        # express app configuration
    └── server.js     # HTTP server bootstrap
```

## Database

1. Load schema and seed data:
   ```bash
   mysql -u root -p petfresh < sql/schema.sql
   mysql -u root -p petfresh < sql/seed.sql
   ```
2. Configure connection details in `config/.env`.

## API Overview

See [`docs/api-overview.md`](docs/api-overview.md) for the current endpoint list.

## Backup Strategy

Reference [`docs/backup-strategy.md`](docs/backup-strategy.md) for backup and restore guidelines.



