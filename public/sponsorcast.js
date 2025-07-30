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
      font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --accent-primary: #58a6ff;
      --accent-secondary: #238636;
      --accent-danger: #f85149;
      --accent-warning: #d29922;
      --border-primary: #30363d;
      --border-secondary: #21262d;
      --shadow-primary: 0 0 0 1px rgba(240, 246, 252, 0.1);
      --shadow-hover: 0 0 0 1px rgba(88, 166, 255, 0.4);
      --radius-sm: 4px;
      --radius-md: 6px;
      --radius-lg: 8px;
      --transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (prefers-color-scheme: light) {
      :host {
        --bg-primary: #ffffff;
        --bg-secondary: #f6f8fa;
        --bg-tertiary: #eaeef2;
        --text-primary: #24292f;
        --text-secondary: #656d76;
        --accent-primary: #0969da;
        --accent-secondary: #1a7f37;
        --accent-danger: #cf222e;
        --accent-warning: #9a6700;
        --border-primary: #d0d7de;
        --border-secondary: #eaeef2;
        --shadow-primary: 0 0 0 1px rgba(36, 41, 47, 0.08);
        --shadow-hover: 0 0 0 1px rgba(9, 105, 218, 0.3);
      }
    }

    /* Loading State */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 3rem 2rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      min-height: 200px;
      position: relative;
      overflow: hidden;
    }

    .loading::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
      animation: shimmer 2s infinite;
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-primary);
      border-top: 2px solid var(--accent-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Sponsor Required State */
    .sponsor-required {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      color: var(--text-primary);
      padding: 2.5rem 2rem;
      border-radius: var(--radius-lg);
      text-align: center;
      position: relative;
      overflow: hidden;
    }

    .sponsor-required::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-warning));
    }

    .sponsor-required h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.025em;
    }

    .sponsor-required p {
      margin: 0 0 1.5rem 0;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .sponsor-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--accent-primary);
      color: var(--bg-primary);
      padding: 0.625rem 1.25rem;
      text-decoration: none;
      border-radius: var(--radius-md);
      font-weight: 500;
      font-size: 0.875rem;
      transition: var(--transition);
      border: none;
      cursor: pointer;
      box-shadow: var(--shadow-primary);
    }

    .sponsor-btn:hover {
      background: var(--accent-secondary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-hover);
    }

    .sponsor-btn:active {
      transform: translateY(0);
    }

    /* Error State */
    .error {
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--accent-danger);
      border-left: 4px solid var(--accent-danger);
      font-size: 0.875rem;
      line-height: 1.5;
      position: relative;
    }

    .error::before {
      content: '⚠';
      position: absolute;
      top: 1.25rem;
      left: 1rem;
      font-size: 1rem;
      color: var(--accent-danger);
    }

    .error {
      padding-left: 2.5rem;
    }

    /* Video Styles */
    video {
      width: 100%;
      max-width: 100%;
      height: auto;
      border-radius: var(--radius-lg);
      background: var(--bg-tertiary);
      box-shadow: var(--shadow-primary);
      transition: var(--transition);
      outline: none;
    }

    video:focus-visible {
      box-shadow: var(--shadow-hover);
    }

    video:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .loading {
        padding: 2rem 1rem;
        min-height: 150px;
      }

      .sponsor-required {
        padding: 2rem 1rem;
      }

      .sponsor-required h3 {
        font-size: 1.125rem;
      }

      .error {
        padding: 1rem;
        padding-left: 2rem;
        font-size: 0.8125rem;
      }
    }

    @media (max-width: 480px) {
      .loading {
        padding: 1.5rem 0.75rem;
        min-height: 120px;
      }

      .sponsor-required {
        padding: 1.5rem 0.75rem;
      }

      .sponsor-btn {
        padding: 0.5rem 1rem;
        font-size: 0.8125rem;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      :host {
        --border-primary: currentColor;
        --shadow-primary: 0 0 0 2px currentColor;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
      
      .loading::before {
        animation: none;
      }
      
      * {
        transition: none !important;
      }
    }

    /* Focus management for accessibility */
    *:focus-visible {
      outline: 2px solid var(--accent-primary);
      outline-offset: 2px;
    }

    /* Print styles */
    @media print {
      .loading,
      .sponsor-required,
      .error {
        break-inside: avoid;
      }
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
        <h3>Almost there!</h3>
        <p>Sign in to GitHub to access these screencasts from <strong>@${githubUser}</strong>.</p>
        <a href="${baseURL}/api/login?github-user=${encodeURIComponent(githubUser)}" target="_blank" class="sponsor-btn">
          Continue with Github
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
        :host {
          --bg-primary: #0d1117;
          --bg-secondary: #161b22;
          --text-primary: #f0f6fc;
          --text-secondary: #8b949e;
          --accent-danger: #f85149;
          --accent-warning: #d29922;
          --border-danger: #da3633;
          --bg-danger: rgba(248, 81, 73, 0.1);
          --bg-warning: rgba(210, 153, 34, 0.1);
          --radius-md: 6px;
          --radius-lg: 8px;
          --transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          --font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        @media (prefers-color-scheme: light) {
          :host {
            --bg-primary: #ffffff;
            --bg-secondary: #f6f8fa;
            --text-primary: #24292f;
            --text-secondary: #656d76;
            --accent-danger: #cf222e;
            --accent-warning: #9a6700;
            --border-danger: #cf222e;
            --bg-danger: rgba(207, 34, 46, 0.08);
            --bg-warning: rgba(154, 103, 0, 0.08);
          }
        }

        .error-container {
          position: relative;
          background: var(--bg-danger);
          border: 1px solid var(--border-danger);
          border-left: 4px solid var(--accent-danger);
          border-radius: var(--radius-md);
          padding: 1rem 1rem 1rem 3rem;
          font-family: var(--font-system);
          color: var(--text-primary);
          font-size: 0.875rem;
          line-height: 1.5;
          overflow: hidden;
          animation: slideIn 0.2s ease-out;
        }

        .error-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(180deg, var(--accent-danger), var(--accent-warning));
          animation: pulse 2s infinite;
        }

        .error-icon {
          position: absolute;
          top: 1rem;
          left: 1rem;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-danger);
          border-radius: 50%;
          font-size: 10px;
          color: var(--bg-primary);
          font-weight: bold;
          animation: bounce 0.5s ease-out;
        }

        .error-message {
          margin: 0;
          font-weight: 500;
          word-break: break-word;
        }

        .error-code {
          display: inline-block;
          background: var(--bg-secondary);
          color: var(--accent-danger);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-md);
          margin-top: 0.5rem;
          border: 1px solid var(--border-danger);
        }

        .error-dismiss {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-md);
          font-size: 1rem;
          transition: var(--transition);
          opacity: 0.7;
        }

        .error-dismiss:hover {
          opacity: 1;
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .error-dismiss:focus-visible {
          outline: 2px solid var(--accent-danger);
          outline-offset: 2px;
        }

        /* Animations */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0, 0, 0);
          }
          40%, 43% {
            transform: translate3d(0, -3px, 0);
          }
          70% {
            transform: translate3d(0, -2px, 0);
          }
          90% {
            transform: translate3d(0, -1px, 0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Enhanced error types */
        .error-container.warning {
          --accent-danger: var(--accent-warning);
          --border-danger: var(--accent-warning);
          --bg-danger: var(--bg-warning);
        }

        .error-container.info {
          --accent-danger: #58a6ff;
          --border-danger: #58a6ff;
          --bg-danger: rgba(88, 166, 255, 0.1);
        }

        /* Responsive design */
        @media (max-width: 480px) {
          .error-container {
            padding: 0.875rem 0.875rem 0.875rem 2.5rem;
            font-size: 0.8125rem;
          }
          
          .error-icon {
            top: 0.875rem;
            left: 0.875rem;
            width: 14px;
            height: 14px;
            font-size: 9px;
          }
        }

        /* High contrast support */
        @media (prefers-contrast: high) {
          .error-container {
            border-width: 2px;
            border-left-width: 6px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .error-container {
            animation: none;
          }
          
          .error-icon {
            animation: none;
          }
          
          .error-container::before {
            animation: none;
          }
          
          * {
            transition: none !important;
          }
        }

        /* Print styles */
        @media print {
          .error-container {
            break-inside: avoid;
            background: #fff !important;
            color: #000 !important;
            border: 2px solid #cf222e !important;
          }
        }
      </style>
      <div class="error-container" role="alert" aria-live="assertive">
        <div class="error-icon" aria-hidden="true">!</div>
        <button class="error-dismiss" onclick="this.closest(':host').remove()" aria-label="Dismiss error">×</button>
        <p class="error-message">${this.escapeHtml(message)}</p>
        ${this.shouldShowErrorCode(message) ? `<code class="error-code">ERROR_${Date.now()}</code>` : ''}
      </div>
    `;
  }

  // Métodos auxiliares para mejorar la funcionalidad
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  shouldShowErrorCode(message) {
    // Mostrar código de error para mensajes técnicos
    const technicalKeywords = ['failed', 'error', 'exception', 'timeout', 'network', 'server', 'api'];
    return technicalKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }
}

customElements.define('sponsor-cast', SponsorCast);
