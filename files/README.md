# BuildView Mailer — Render.com Deployment

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial"
# Create a NEW repo on github.com (call it buildview-mailer)
git remote add origin https://github.com/YOUR_USERNAME/buildview-mailer.git
git push -u origin main
```

> ⚠️ Make sure .env is in .gitignore — it already is. Never push real credentials.

---

## Step 2 — Deploy on Render

1. Go to https://render.com → Sign up free (use GitHub login)
2. Click **New → Web Service**
3. Connect your **buildview-mailer** GitHub repo
4. Render auto-detects settings from `render.yaml`. Confirm:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free

---

## Step 3 — Add Environment Variables

In Render dashboard → your service → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `GMAIL_USER` | `projects.buildview@gmail.com` |
| `GMAIL_APP_PASSWORD` | your 16-char App Password |
| `ALLOWED_ORIGIN` | `*` (until you get a domain, then set it to your domain) |

Click **Save Changes** — Render redeploys automatically.

---

## Step 4 — Get your public URL

Render gives you a URL like:
```
https://buildview-mailer.onrender.com
```

Copy it. Open `Contact.html` and update this one line:

```js
const API_URL = 'https://buildview-mailer.onrender.com';
```

---

## Step 5 — Gmail App Password (if not done yet)

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (required)
3. Search "App passwords" → create one → select app: Mail
4. Copy the 16-character code → paste into Render env var

---

## ⚠️ Free Tier Note

Render's free tier **spins down after 15 min of inactivity**.
First form submission after idle may take ~30 seconds to respond (cold start).

**Fix:** Use a free uptime monitor like https://uptimerobot.com
- Add a new monitor → HTTP → `https://buildview-mailer.onrender.com/health`
- Ping every 5 minutes → keeps the server warm 24/7

---

## Testing

Once deployed, test via terminal:

```bash
curl -X POST https://buildview-mailer.onrender.com/send \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"you@gmail.com","service":"Web Design","message":"Hello!"}'

# Should return: {"success":true}
# And you should receive an email!
```
