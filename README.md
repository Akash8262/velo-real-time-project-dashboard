# Velo Project Dashboard

A practice implementation of a real-time client project dashboard with RBAC, JWT authentication, PostgreSQL/Prisma persistence, Socket.IO activity, notifications, presence, filtering and a scheduled overdue-task job.

## Stack

- React + TypeScript + Vite
- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- Socket.IO
- node-cron
- Zod
- JWT access token + rotating refresh token in an HttpOnly cookie

## Roles

- **Admin:** global access.
- **PM:** access only to projects they manage and their project tasks/activity.
- **Developer:** access only to assigned tasks; project pages expose only that developer's assigned tasks.

Authorization is enforced at the API/socket layer; frontend visibility is not treated as security.

## Local setup

Prerequisites: Node.js 20+, PostgreSQL 16+ and npm.

1. Create a PostgreSQL database, for example `velo_dashboard`.
2. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and strong JWT secrets.
3. Install backend dependencies:

```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

4. In another terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

If the database was created using an earlier version of this practice project, reset it before reseeding:

```bash
cd server
npx prisma migrate reset --force
npm run seed
```

## Demo accounts

Password for every seeded account: `Password123!`

- Admin: `admin@demo.local`
- PM: `pm1@demo.local`
- PM: `pm2@demo.local`
- Developers: `dev1@demo.local` through `dev4@demo.local`

The seed creates 1 Admin, 2 PMs, 4 Developers, 3 clients, 3 projects, 15 tasks, overdue tasks, activity history and an assignment notification.

## Realtime flow

```text
PATCH task status
      ↓
API auth + RBAC
      ↓
PostgreSQL transaction
 ├── update task
 └── insert activity
      ↓
Socket.IO broadcast
 ├── authorized project room
 ├── affected PM/developer user rooms
 └── Admin global room
      ↓
Connected UI updates without refresh
```

When a task enters **In Review**, the project manager also receives a persisted notification and a real-time notification event.

## Refresh tokens

Access tokens are short-lived and held in frontend runtime memory. Refresh tokens are stored server-side as SHA-256 hashes and delivered only through an HttpOnly cookie. Refresh requests use safe deletion/rotation handling so repeated requests do not produce Prisma P2025 errors.

## Overdue job

A node-cron job runs every five minutes and marks unfinished tasks whose due date has passed as overdue. For a multi-instance production deployment, use a durable queue such as BullMQ/Redis instead of an in-process scheduler.

## Deployment

The included `vercel.json` builds the React client. The Express + Socket.IO API must run on a WebSocket-capable Node host. Configure the client with:

- `VITE_API_URL=https://YOUR-API/api`
- `VITE_SOCKET_URL=https://YOUR-API`

Configure the API with:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL=https://YOUR-FRONTEND`
- `PORT`

Never commit `server/.env` or production secrets.

## Limitations

Presence and the cron scheduler are process-local. The practice UI focuses on the required dashboard, projects, task, activity and notification flows rather than a full CRUD administration console.
