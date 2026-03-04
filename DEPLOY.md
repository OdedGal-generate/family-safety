# Deployment Guide — Family Shield MVP

## Architecture

- **Frontend**: React SPA on **Vercel** (static hosting)
- **Backend**: Node.js/Express + SQLite on **Railway**

---

## 1. Deploy Backend to Railway

### Steps

1. Create a new project on [railway.app](https://railway.app)
2. Connect your GitHub repo, set **Root Directory** to `server`
3. Railway auto-detects the `Procfile` (`web: node index.js`)
4. Add the following **environment variables** in Railway dashboard:

| Variable | Value | Required |
|---|---|---|
| `PORT` | `3000` (Railway auto-sets this) | Auto |
| `NODE_ENV` | `production` | Yes |
| `JWT_SECRET` | Generate a strong random string (64+ chars) | Yes |
| `VAPID_PUBLIC_KEY` | `BHS1AJRkNsn8ENQk-riNG-4XHHw_guUzbjGo58BkwJqOdkDaG3DDMz2GNY_-wRmA7hbvz_U-JHgb_SbibkplnMc` | Yes |
| `VAPID_PRIVATE_KEY` | `0IhvM2faVeYK_uvfSRBkcFWwipkn0LEyF78it2rQJx0` | Yes |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` | Yes |
| `TWILIO_ACCOUNT_SID` | Your Twilio SID | Optional* |
| `TWILIO_AUTH_TOKEN` | Your Twilio token | Optional* |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone | Optional* |

> *Without Twilio credentials, OTP codes are logged to the server console (mock mode). Set all three Twilio vars for real SMS delivery.

5. Deploy. Verify health check:
   ```
   curl https://YOUR-RAILWAY-URL.up.railway.app/api/health
   # → {"status":"ok"}
   ```

### Notes
- SQLite DB file is stored on Railway's ephemeral disk. For persistent data in production, consider migrating to PostgreSQL (Railway provides managed Postgres).
- The `seedDemoData()` function is skipped when `NODE_ENV=production`.

---

## 2. Deploy Frontend to Vercel

### Steps

1. Create a new project on [vercel.com](https://vercel.com)
2. Connect your GitHub repo, set **Root Directory** to `client`
3. Vercel auto-detects Vite. Build settings should be:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the following **environment variable** in Vercel dashboard:

| Variable | Value | Required |
|---|---|---|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api` | Yes |

5. Deploy. The `vercel.json` handles SPA routing (all paths → `index.html`).

---

## 3. Post-Deploy Checklist

- [ ] Verify health check: `GET /api/health` returns `{"status":"ok"}`
- [ ] Open frontend URL, complete onboarding (phone → OTP → name → group)
- [ ] Check Railway logs for mock OTP code (or check phone for real SMS)
- [ ] Verify "I'm Safe" button works (status appears in member list)
- [ ] Test invite flow: create invite → share code → second user joins
- [ ] Test push notifications: allow notifications → press "I'm Safe" → other user sees browser notification

---

## Environment Variables Summary

### Backend (Railway)
```
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
VAPID_PUBLIC_KEY=BHS1AJRkNsn8ENQk-riNG-4XHHw_guUzbjGo58BkwJqOdkDaG3DDMz2GNY_-wRmA7hbvz_U-JHgb_SbibkplnMc
VAPID_PRIVATE_KEY=0IhvM2faVeYK_uvfSRBkcFWwipkn0LEyF78it2rQJx0
VAPID_SUBJECT=mailto:your-email@example.com
```

### Frontend (Vercel)
```
VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app/api
```

---

## Local Development

```bash
# Terminal 1 — Backend
cd server
npm install
node index.js
# → Server running on http://localhost:3000

# Terminal 2 — Frontend
cd client
npm install
npm run dev
# → http://localhost:5173 (proxies /api to localhost:3000)
```
