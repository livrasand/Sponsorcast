# 🎬 Sponsorcast

> **GitHub Sponsors Exclusive Video Platform** - Monetize your content by making videos exclusive to your GitHub Sponsors.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/sponsorcast)

## ✨ Features

- 🔐 **Sponsor Protection** - Videos only accessible to GitHub Sponsors
- 🎥 **HLS Streaming** - Professional adaptive bitrate video streaming
- 🌐 **Web Component** - Simple `<sponsor-cast>` element integration
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🚀 **Easy Deployment** - Deploy to Vercel in minutes
- 🛠️ **CLI Integration** - Upload videos with `sponsorcast-cli`
- 🔄 **Dynamic Users** - Support multiple GitHub users in one instance

## 🎯 Quick Start

### 1. Embed in Your Website

```html
<!-- Include HLS.js for video playback -->
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

<!-- Include Sponsorcast web component -->
<script src="https://your-domain.com/sponsorcast.js"></script>

<!-- Embed protected video -->
<sponsor-cast 
    src="your-video-id"
    github-user="your-github-username"
    width="720"
    autoplay>
</sponsor-cast>
```

### 2. What Users See

**If they're a sponsor:**
- ✅ Video plays immediately with full controls
- 🎥 Professional HLS streaming experience

**If they're not a sponsor:**
- ❤️ Beautiful call-to-action to become a sponsor
- 🔐 Clear explanation of exclusive access

## 📋 Web Component API

### Attributes

| Attribute | Required | Description | Default |
|-----------|----------|-------------|---------|
| `src` | ✅ | Video ID/folder name containing HLS segments | - |
| `github-user` | ✅ | GitHub username to check sponsorship for | - |
| `width` | ❌ | Video width (px, %, etc.) | `720px` |
| `height` | ❌ | Video height (px, %, auto) | `auto` |
| `autoplay` | ❌ | Enable autoplay (muted by default) | `false` |

### Examples

```html
<!-- Basic usage -->
<sponsor-cast src="my-tutorial" github-user="johndoe"></sponsor-cast>

<!-- With custom dimensions -->
<sponsor-cast 
    src="my-tutorial" 
    github-user="johndoe" 
    width="100%" 
    height="400px">
</sponsor-cast>

<!-- With autoplay -->
<sponsor-cast 
    src="my-tutorial" 
    github-user="johndoe" 
    autoplay>
</sponsor-cast>
```

## 🚀 Deployment

### Option 1: Deploy to Vercel (Recommended)

1. **Fork this repository**
2. **Create a GitHub OAuth App**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - Create new OAuth App with:
     - Homepage URL: `https://your-domain.vercel.app`
     - Authorization callback URL: `https://your-domain.vercel.app/api/callback`
3. **Deploy to Vercel**
4. **Set Environment Variables in Vercel:**

```env
GITHUB_CLIENT_ID=your_oauth_app_id
GITHUB_CLIENT_SECRET=your_oauth_app_secret
GITHUB_USER=your_default_username
JWT_SECRET=your_random_secret_string
HOST=https://your-domain.vercel.app
```

### Option 2: Manual Deployment

1. Clone and install dependencies:
```bash
git clone https://github.com/your-username/sponsorcast
cd sponsorcast
npm install
```

2. Create `.env` file with the variables above

3. Deploy to your hosting platform

## 📹 Video Management

### Option 1: Using sponsorcast-cli (Coming Soon)

```bash
# Install CLI
npm install -g sponsorcast-cli

# Convert video to HLS
sponsorcast convert input.mp4 --output my-video-id

# Upload to your instance
sponsorcast upload my-video-id --endpoint https://your-domain.com
```

### Option 2: Manual Upload via API

```bash
# Upload HLS files via POST to /api/upload-hls
curl -X POST https://your-domain.com/api/upload-hls \
  -F "videoId=my-video" \
  -F "githubUser=johndoe" \
  -F "files=@playlist.m3u8" \
  -F "files=@segment0.ts" \
  -F "files=@segment1.ts"
```

### Option 3: Manual File Upload

1. Create folder in `/videos/your-video-id/`
2. Upload your HLS files:
   - `playlist.m3u8` (required)
   - `segment*.ts` files
   - `metadata.json` (optional)

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_CLIENT_ID` | ✅ | OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | OAuth App Client Secret |
| `GITHUB_USER` | ❌ | Default GitHub username |
| `JWT_SECRET` | ✅ | Random string for JWT signing |
| `HOST` | ❌ | Your domain (for OAuth redirects) |

### File Structure

```
/videos/
  /your-video-id/
    playlist.m3u8      # HLS manifest (required)
    segment0.ts        # Video segments
    segment1.ts
    segment2.ts
    metadata.json      # Video metadata (optional)
/public/
  sponsorcast.js       # Web component
  index.html          # Demo page
/api/
  authorize.js        # Sponsor verification
  login.js           # OAuth login
  callback.js        # OAuth callback
  playlist/[id].js   # HLS playlist serving
  upload-hls.js      # Video upload
```

## 🛡️ Security Features

- **JWT Authentication** - Secure, time-limited tokens
- **GitHub OAuth** - Official GitHub authentication
- **Sponsor Verification** - Real-time verification via GitHub GraphQL API
- **CORS Protection** - Restricted API access
- **File Validation** - Only HLS files accepted

## 🔍 API Endpoints

### Authentication
- `GET /api/authorize?github-user=username` - Check if user is authenticated sponsor
- `GET /api/login?github-user=username` - Initiate GitHub OAuth login
- `GET /api/callback` - OAuth callback handler

### Video Serving
- `GET /api/playlist/[videoId]` - Serve HLS playlist (protected)
- `GET /api/segment/[segmentId]` - Serve video segments (protected)

### Video Management
- `POST /api/upload-hls` - Upload HLS video files

## 🎨 Customization

### Styling the Web Component

The web component uses Shadow DOM, but you can customize it by modifying `public/sponsorcast.js`:

```javascript
// Edit the addStyles() method to customize appearance
addStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Your custom styles here */
    .sponsor-required {
      background: your-custom-gradient;
    }
  `;
  this.shadowRoot.appendChild(style);
}
```

### Multi-User Support

Sponsorcast supports multiple GitHub users in a single instance:

```html
<!-- Different users can have their own protected content -->
<sponsor-cast src="tutorial-1" github-user="alice"></sponsor-cast>
<sponsor-cast src="tutorial-2" github-user="bob"></sponsor-cast>
<sponsor-cast src="tutorial-3" github-user="charlie"></sponsor-cast>
```

## 📊 Analytics & Monitoring

### Built-in Logging

The application logs:
- Authentication attempts
- Sponsorship verifications
- Video access attempts
- Upload activities

### Adding Analytics

You can extend the web component to include analytics:

```javascript
// Add to showVideo() method
analytics.track('video_played', {
  videoId: src,
  githubUser: githubUser,
  timestamp: Date.now()
});
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 **Documentation**: Check this README and the demo page
- 🐛 **Bug Reports**: Open an issue on GitHub
- 💡 **Feature Requests**: Open an issue with the "enhancement" label
- 💬 **Community**: Join our discussions

## 🗺️ Roadmap

- [ ] `sponsorcast-cli` NPM package
- [ ] Video analytics dashboard
- [ ] Multiple quality streams
- [ ] Video thumbnails/previews
- [ ] Batch upload interface
- [ ] Webhook notifications
- [ ] CDN integration
- [ ] Multiple OAuth providers

---

**Made with ❤️ for the GitHub Sponsors community**

Deploy your own instance and start monetizing your video content today!
