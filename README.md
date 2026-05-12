# IQ Demo

A web app for Islamic schools and madrasas that blends class management with gamified missions, grades, attendance, and parent-facing updates. Built with Node/Express, MongoDB, and EJS.

## Quick start

```bash
npm install
cp config/.env.example config/.env  # or create config/.env manually
npm start
```

`config/.env` needs:

```
PORT=2121
DB_STRING=your-mongodb-uri
CLOUD_NAME=your-cloudinary-cloud-name
API_KEY=your-cloudinary-api-key
API_SECRET=your-cloudinary-api-secret
```

## Features

- **Admin / Teacher / Student / Parent portals** with EJS templates and themed CSS
- **Missions** — gamified tasks with ranks, XP, and due dates
- **Grades**, **Attendance**, **Library / Posts**, **Profiles**
- **Seeds** — `seed.js`, `seedHadith.js`, `seedInfo.js` to load sample data

## Project layout

- `backend/server.js` — Express entry point
- `backend/controllers/` — route handlers (auth, home, posts, missions, etc.)
- `backend/models/` — Mongoose schemas (users, classes, missions, grades, reflections, verses, attendance, communications, posts)
- `backend/routes/` — Express routes
- `backend/middleware/` — auth, multer, cloudinary
- `frontend/views/` — EJS templates (admin, teacher, student, parent)
- `frontend/public/` — static assets (CSS, images)

## Scripts

- `npm start` — run the server with nodemon

## License

MIT
