# MongoDB Setup Guide

## Problem
Converting from PostgreSQL to MongoDB for easier local development.

## Quick Setup (Windows)

### Option 1: Install MongoDB Community Server (Recommended)

1. **Download MongoDB**
   - Visit: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Click Download

2. **Install MongoDB**
   - Run the installer
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service"
   - Keep default data directory

3. **Verify Installation**
   ```powershell
   mongod --version
   ```

4. **Create Admin User**
   ```powershell
   cd backend
   npm run seed
   ```

5. **Start Application**
   ```powershell
   npm run dev
   ```

### Option 2: Use Docker (If you have Docker Desktop)

```powershell
# Start MongoDB container
docker run --name qa-mongodb -p 27017:27017 -d mongo:7

# Seed admin user
cd backend
npm run seed

# Start application
npm run dev
```

## Configuration

The backend `.env` is already configured:
```
MONGODB_URI=mongodb://localhost:27017/qa_automation
```

## Default Login

After running `npm run seed`:
- **Email**: admin@example.com
- **Password**: Admin123!

## Verify Connection

```powershell
# If MongoDB installed locally
mongo

# If using Docker
docker exec -it qa-mongodb mongosh
```

Then:
```javascript
use qa_automation
db.users.find()
```

You should see the admin user!

## Troubleshooting

### MongoDB not running
```powershell
# Check service (local install)
Get-Service MongoDB

# Start service
Start-Service MongoDB

# Check Docker container
docker ps
docker start qa-mongodb
```

### Connection refused
- Verify MongoDB is running on port 27017
- Check firewall settings
- Verify MONGODB_URI in backend/.env

### Seed fails
- Make sure MongoDB is running first
- Check backend/.env has correct MONGODB_URI
- Try: `npm run seed` again

## Next Steps

1. Install MongoDB (choose Option 1 or 2)
2. Run: `cd backend && npm run seed`
3. Start backend: `npm run dev`
4. Start frontend: `cd ../frontend && npm run dev`
5. Login at http://localhost:5173

🎉 Much simpler than PostgreSQL!
