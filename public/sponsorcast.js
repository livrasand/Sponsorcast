class SponsorCast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const src = this.getAttribute('src'); // ID del video
    const githubUser = this.getAttribute('github-user'); // Usuario dinámico
    const autoplay = this.hasAttribute('autoplay');
    const width = this.getAttribute('width') || '720';
    const height = this.getAttribute('height') || 'auto';
    
    if (!src) {
      this.showError('Missing required "src" attribute');
      return;
    }
    
    if (!githubUser) {
      this.showError('Missing required "github-user" attribute');
      return;
    }

    const container = document.createElement('div');
    this.shadowRoot.appendChild(container);
    
    // Aplicar estilos
    this.addStyles();
    
    this.showLoading(container);

    // Detectar entorno y construir URLs
    const baseURL = this.getBaseURL();

    try {
      // Validar si tiene acceso para este usuario específico
      const authRes = await fetch(`${baseURL}/api/authorize?github-user=${encodeURIComponent(githubUser)}`);
      
      if (!authRes.ok) {
        this.showSponsorRequired(container, baseURL, githubUser);
        return;
      }

      // Usuario autorizado - mostrar video
      await this.showVideo(container, baseURL, src, autoplay, width, height);
      
    } catch (err) {
      this.showError(`Network error: ${err.message}`);
    }
  }
  
  getBaseURL() {
    // En desarrollo
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return `${location.protocol}//${location.host}`;
    }
    // En producción - usar rutas relativas
    return '';
  }
  
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        background: #f8f9fa;
        border-radius: 8px;
        color: #6c757d;
      }
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #e9ecef;
        border-top: 2px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 0.5rem;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .sponsor-required {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
      }
      .sponsor-required h3 {
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
      }
      .sponsor-required p {
        margin: 0 0 1.5rem 0;
        opacity: 0.9;
      }
      .sponsor-btn {
        display: inline-block;
        background: #ff6b6b;
        color: white;
        padding: 0.75rem 1.5rem;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: background 0.2s;
      }
      .sponsor-btn:hover {
        background: #ff5252;
      }
      .error {
        background: #f8d7da;
        color: #721c24;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid #f5c6cb;
      }
      video {
        max-width: 100%;
        border-radius: 8px;
      }
    `;
    this.shadowRoot.appendChild(style);
  }
  
  showLoading(container) {
    container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        Checking sponsorship status...
      </div>
    `;
  }
  
  showSponsorRequired(container, baseURL, githubUser) {
    container.innerHTML = `
      <div class="sponsor-required">
        <h3>🎬 Premium Content</h3>
        <p>This content is exclusively available for GitHub Sponsors of <strong>@${githubUser}</strong>.</p>
        <a href="${baseURL}/api/login?github-user=${encodeURIComponent(githubUser)}" class="sponsor-btn">
          ❤️ Login with GitHub
        </a>
      </div>
    `;
  }
  
  async showVideo(container, baseURL, src, autoplay, width, height) {
    const video = document.createElement('video');
    video.controls = true;
    video.style.width = width.includes('%') || width.includes('px') ? width : `${width}px`;
    if (height !== 'auto') {
      video.style.height = height.includes('%') || height.includes('px') ? height : `${height}px`;
    }
    if (autoplay) {
      video.autoplay = true;
      video.muted = true; // Required for autoplay in most browsers
    }

    const playlistURL = `${baseURL}/api/playlist/${src}`;

    // Verificar si HLS.js está cargado
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(playlistURL);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          this.showError('Video playback error. Please try again.');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo
      video.src = playlistURL;
    } else {
      this.showError('Your browser does not support HLS video playback. Please use a modern browser.');
      return;
    }

    container.innerHTML = '';
    container.appendChild(video);
  }
  
  showError(message) {
    this.shadowRoot.innerHTML = `
      <style>
        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #f5c6cb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      </style>
      <div class="error">⚠️ ${message}</div>
    `;
  }
}

customElements.define('sponsor-cast', SponsorCast);
