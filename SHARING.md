# 🌐 How to Share Your QA Automation App

## Quick Setup (Using Cloudflare Tunnel - Free & No Signup Required)

### Step 1: Start Your Servers Locally

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

---

### Step 2: Expose Backend with Cloudflare Tunnel

**Terminal 3:**
```powershell
cloudflared tunnel --url http://localhost:3000
```

You'll see output like:
```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://abc-xyz-123.trycloudflare.com                                                     |
+--------------------------------------------------------------------------------------------+
```

**📝 Copy the URL** (e.g., `https://abc-xyz-123.trycloudflare.com`)

---

### Step 3: Update Frontend Configuration

1. Open `frontend\.env`
2. Replace the `VITE_API_URL` value with your backend tunnel URL:
   ```
   VITE_API_URL=https://abc-xyz-123.trycloudflare.com
   ```
3. Save the file

---

### Step 4: Restart Frontend

Press `Ctrl+C` in Terminal 2, then:
```powershell
npm run dev
```

---

### Step 5: Expose Frontend with Cloudflare Tunnel

**Terminal 4:**
```powershell
cloudflared tunnel --url http://localhost:5173
```

You'll get another URL like:
```
https://def-uvw-456.trycloudflare.com
```

---

### Step 6: Share the Frontend URL! 🎉

Send the **frontend URL** to anyone:
```
https://def-uvw-456.trycloudflare.com
```

They can access your QA Automation app from anywhere!

---

## Notes:

- ✅ **No signup required** - Cloudflare provides free temporary tunnels
- ✅ **Works through firewalls** - No port forwarding needed
- ⏱️ **Tunnels are temporary** - They last as long as the terminal is running
- 🔄 **URLs change** - Each time you restart cloudflared, you get a new URL
- 🔒 **HTTPS enabled** - All connections are encrypted

---

## Troubleshooting:

**Frontend shows "Network Error":**
- Make sure you updated `frontend\.env` with the correct backend URL
- Restart the frontend dev server after changing `.env`

**Backend tunnel not working:**
- Check if backend is running on `http://localhost:3000`
- Make sure no firewall is blocking cloudflared

**CORS errors:**
- Backend already configured to allow Cloudflare domains
- No additional configuration needed

---

## Alternative: For Local Development

If you just want to test locally without sharing:

1. Edit `frontend\.env`:
   ```
   VITE_API_URL=http://localhost:3000
   ```

2. Access the app at: `http://localhost:5173`
