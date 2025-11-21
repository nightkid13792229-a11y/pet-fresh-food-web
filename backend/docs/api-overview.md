# PetFresh Backend API Overview

Base URL: `/api/v1`

## Authentication

| Method | Path            | Description                     |
|--------|-----------------|---------------------------------|
| POST   | `/auth/register`| Create a new user (admin only)  |
| POST   | `/auth/login`   | Login and obtain JWT token      |
| GET    | `/auth/me`      | Retrieve current user profile   |

## Orders

Requires `Authorization: Bearer <token>` with role `admin` or `employee`.

| Method | Path         | Description                         |
|--------|--------------|-------------------------------------|
| GET    | `/orders`    | List orders (supports pagination)   |
| GET    | `/orders/:id`| Retrieve a single order             |
| POST   | `/orders`    | Create a new order (admin required) |

## Recipes

Requires authenticated user.

| Method | Path          | Description             |
|--------|---------------|-------------------------|
| GET    | `/recipes`    | List available recipes  |
| GET    | `/recipes/:id`| Retrieve a recipe       |

## Health

| Method | Path       | Description                         |
|--------|------------|-------------------------------------|
| GET    | `/health`  | Application & database health check |

> See `sql/schema.sql` for the current database schema. Update this document as new modules are added.



