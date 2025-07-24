# 🎬 Sponsorcast - Setup Guide

## New Creator Registration System

Sponsorcast now includes a complete creator registration system where content creators can register with their Personal Access Token (PAT) to manage their sponsored content.

## 🛠 Prerequisites

### 1. GitHub Sponsors
- Content creators must have **GitHub Sponsors enabled** on their account
- They need to have active sponsors to use the system

### 2. Personal Access Token (PAT)
Creators need to create a GitHub PAT with the following scopes:
- `read:user`
- `read:org` 
- `user:email`

**Important:** The creator's account must have GitHub Sponsors active for the PAT to access the Sponsors API.

## 🚀 Vercel Deployment Setup

### 1. Environment Variables
Set these environment variables in your Vercel dashboard:

```bash
# GitHub OAuth (for visitor authentication)
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret

# JWT Secret for tokens
JWT_SECRET=your_super_secret_jwt_key

# Default GitHub user (fallback)
GITHUB_USER=your_default_github_username

# Deployment URL
HOST=https://your-app.vercel.app
```

### 2. Vercel KV Database
1. Go to your Vercel dashboard
2. Navigate to your project
3. Go to **Storage** tab
4. Click **Create Database**
5. Choose **KV** (Redis-compatible)
6. Name it `sponsorcast-db`
7. Create the database

The KV database connection is handled automatically by the `@vercel/kv` package.

### 3. OAuth Application Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App:
   - **Application name:** Sponsorcast
   - **Authorization callback URL:** `https://your-app.vercel.app/api/callback`
   - **Homepage URL:** `https://your-app.vercel.app`

## 📝 How It Works

### For Content Creators:

1. **Register:** Visit `/register.html`
   - Enter GitHub username, email, PAT, and password
   - System stores encrypted PAT in Vercel KV database

2. **Login:** Visit `/login.html` 
   - Access creator dashboard
   - View account information

3. **Use:** Add `?github-user=username` to video URLs
   - System uses creator's PAT to verify sponsors
   - Only sponsors can access the content

### For Visitors:

1. **Visit protected content:** Click on a video with `?github-user=creator`
2. **Authentication:** Redirected to GitHub OAuth
3. **Verification:** System checks if visitor sponsors the creator
4. **Access:** If verified as sponsor, can view content

## 🔧 API Endpoints

### Creator Management
- `POST /api/creators/register` - Register new creator
- `POST /api/creators/login` - Creator login
- `GET /api/creators/status` - Check login status
- `POST /api/creators/logout` - Creator logout

### Sponsorship Verification  
- `GET /api/login?github-user=username` - Start OAuth flow
- `GET /api/callback` - Handle OAuth callback
- `GET /api/authorize?github-user=username` - Verify sponsor status

## 🔒 Security Features

- **PAT Encryption:** Personal Access Tokens are encrypted before storage
- **Password Hashing:** Creator passwords use bcrypt with salt rounds
- **JWT Authentication:** Secure token-based sessions
- **HttpOnly Cookies:** Prevent XSS attacks
- **Environment Variables:** Sensitive data stored securely

## 📊 Database Schema

The system uses Vercel KV (Redis) with the following structure:

```javascript
// Creator record
creator:{username} = {
  username: string,
  email: string, 
  pat_token: string (encrypted),
  password: string (hashed),
  created_at: string,
  updated_at: string
}

// Creators list
creators_list = [username1, username2, ...]
```

## 🚀 Getting Started

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Set up environment variables** in Vercel dashboard

3. **Create Vercel KV database** as described above

4. **Creators register** at `/register.html`

5. **Share protected content** with `?github-user=creator` parameter

## 💡 Usage Examples

### Protected Video URL:
```
https://your-app.vercel.app/video.html?github-user=johndoe
```

### Creator Registration:
```
https://your-app.vercel.app/register.html
```

### Creator Dashboard:
```
https://your-app.vercel.app/login.html
```

## 🔄 Migration from Old System

If you're upgrading from the previous system:

1. Creators need to register with their PAT
2. Update video URLs to include `?github-user=creator`
3. Old environment-based configuration still works as fallback

## 🆘 Troubleshooting

### "Creator not found" Error
- Ensure creator has registered via `/register.html`
- Check that username matches exactly (case-sensitive)

### PAT Permission Issues  
- Verify creator has GitHub Sponsors enabled
- Confirm PAT has correct scopes: `read:user`, `read:org`, `user:email`
- PAT should start with `ghp_`

### Sponsor Verification Fails
- Ensure visitor is actually sponsoring the creator on GitHub
- Check that creator's Sponsors program is active and public

## 📈 Benefits

✅ **Scalable:** Multiple creators can use the same deployment  
✅ **Secure:** Encrypted PATs and hashed passwords  
✅ **Free:** Uses Vercel's free KV database tier  
✅ **Fast:** Redis-based storage for quick lookups  
✅ **Reliable:** Complete sponsorship verification with pagination  

---

Happy monetizing! 🎬💰
