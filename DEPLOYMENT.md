# Deployment Guide

This guide provides step-by-step instructions for deploying the Aditya-L1 Solar Flare Dashboard to Vercel (Frontend) and Render (Backend).

## 1. Backend Deployment (Render.com)

We use Render's free tier to host the FastAPI backend.

1. Create a free account at [Render.com](https://render.com).
2. Connect your GitHub account and create a new **Blueprint Instance** (or Web Service).
3. Connect your repository. If using Blueprint, Render will automatically detect the `render.yaml` file.
4. If deploying manually as a Web Service:
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3
5. **Environment Variables**:
   - `PYTHON_VERSION`: `3.10.0`
   - `GROQ_API_KEY`: Paste your actual Groq API key here (used for AI insights).
6. Click **Deploy**. Once finished, copy the backend URL (e.g., `https://aditya-l1-backend.onrender.com`).

## 2. Frontend Deployment (Vercel)

We use Vercel for hosting the React+Vite frontend.

1. Create a free account at [Vercel.com](https://vercel.com).
2. Click **Add New Project** and connect your GitHub repository.
3. Vercel will automatically detect it as a Vite project.
4. **Environment Variables**:
   - `VITE_API_URL`: Paste the backend URL you copied from Render (e.g., `https://aditya-l1-backend.onrender.com`). Do not include a trailing slash.
5. Click **Deploy**.
6. Vercel will use `vercel.json` to handle React Router's SPA routing.
7. Once deployed, visit your Vercel URL to view the live dashboard!

> **Note**: The Render free tier may spin down the backend after 15 minutes of inactivity. The first request after a spin-down might take 30-50 seconds to respond while the server wakes up.
