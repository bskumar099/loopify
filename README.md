# Loopify - Final (Vercel + MongoDB Atlas)

This package contains the full Loopify project (frontend + backend) pre-configured for Vercel + MongoDB Atlas.

## What is included
- backend/ : Node.js + Express app (uses MongoDB via MONGO_URI in backend/.env)
- frontend/: Vite + React app (set VITE_API_URL in frontend/.env after backend deploy)
- backend/.env pre-filled with your MongoDB connection and admin credentials

## Quick local run (backend)
1. Open terminal, go to backend/
   ```bash
   cd backend
   npm install
   node server.js
   ```
2. You should see "MongoDB connected" and "Server running on port 5000"

## Quick local run (frontend)
1. Open terminal, go to frontend/
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open http://localhost:5173

## Deploying to Vercel
- Push this repo to GitHub, then import in Vercel.
- Configure frontend root to `frontend` and backend root to `backend` (add two projects)
- Set environment variables in Vercel dashboard:
  - backend: MONGO_URI (use the same as backend/.env), JWT_SECRET
  - frontend: VITE_API_URL = https://<your-backend-url>/api

Admin login:
- Username: bskumar099
- Password: 66266141

