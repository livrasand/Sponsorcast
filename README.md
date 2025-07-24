# Sponsorcast

> **Embeddable screencasts for GitHub Sponsors** - Monetize your content by making videos exclusive to your GitHub Sponsors.


## Features

- **Sponsor Protection** - Videos only accessible to GitHub Sponsors
- **HLS Streaming** - Professional adaptive bitrate video streaming
- **Web Component** - Simple `<sponsor-cast>` element integration
- **Responsive Design** - Works on desktop, tablet, and mobile
- **CLI Integration** - Upload your videos with `sponsorcast-cli`
- **Dynamic Users** - Support multiple GitHub users in one instance

## Quick Start

### 1. Embed in Your Website

```html
<!-- Include HLS.js for video playback -->
<script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>

<!-- Include Sponsorcast web component -->
<script src="https://sponsorcast.vercel.app/sponsorcast.js"></script>

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
- Video plays immediately with full controls
- Professional HLS streaming experience

**If they're not a sponsor:**
- Beautiful call-to-action to become a sponsor
- Clear explanation of exclusive access

## Web Component API

### Attributes

| Attribute | Required | Description | Default |
|-----------|----------|-------------|---------|
| `src` | ✅ | Video ID/folder name containing HLS segments | - |
| `github-user` | ✅ | GitHub username to check sponsorship for | - |
| `width` | ❌ | Video width (px, %, etc.) | `720px` |
| `height` | ❌ | Video height (px, %, auto) | `auto` |
| `autoplay` | ❌ | Enable autoplay (muted by default) | `false` |


## Video Management

### Using sponsorcast-cli

```bash
# Install CLI
npm install -g sponsorcast-cli

# Convert video to HLS
sponsorcast convert input.mp4 --output my-video-id

# Upload to your instance
sponsorcast upload my-video-id --endpoint https://your-domain.com
```

## Security Features

- **JWT Authentication** - Secure, time-limited tokens
- **GitHub OAuth** - Official GitHub authentication
- **Sponsor Verification** - Real-time verification via GitHub GraphQL API
- **CORS Protection** - Restricted API access
- **File Validation** - Only HLS files accepted

## API Endpoints

### Authentication
- `GET /api/authorize?github-user=username` - Check if user is authenticated sponsor
- `GET /api/login?github-user=username` - Initiate GitHub OAuth login
- `GET /api/callback` - OAuth callback handler

### Video Serving
- `GET /api/playlist/[videoId]` - Serve HLS playlist (protected)
- `GET /api/segment/[segmentId]` - Serve video segments (protected)

### Video Management
- `POST /api/upload-hls` - Upload HLS video files

### Multi-User Support

Sponsorcast supports multiple GitHub users in a single instance:

```html
<!-- Different users can have their own protected content -->
<sponsor-cast src="tutorial-1" github-user="alice"></sponsor-cast>
<sponsor-cast src="tutorial-2" github-user="bob"></sponsor-cast>
<sponsor-cast src="tutorial-3" github-user="charlie"></sponsor-cast>
```

> Analytics & Monitoring Cooming Soon with [EthicalMetrics](https://github.com/livrasand/EthicalMetrics/)


## Contributing

Contributions are welcome! Please read our contributing guidelines:

---

**Made with ❤️ for the GitHub Sponsors community**
