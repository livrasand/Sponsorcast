class SponsorCast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({
            mode: 'open'
        });
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async connectedCallback() {
        const src = this.getAttribute('src');
        const githubUser = this.getAttribute('github-user');
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

        this.addStyles();
        this.showLoading(container);

        const baseURL = this.getBaseURL();

        try {
            // 1. Verificar si hay parámetros de callback en la URL
            const urlParams = new URLSearchParams(window.location.search);
            const sponsorStatus = urlParams.get('sponsor_status');
            const sponsorToken = urlParams.get('sponsor_token');
            const visitorLogin = urlParams.get('visitor_login');
            const error = urlParams.get('error');

            // Manejar callback de error
            if (error) {
                const errorMessage = urlParams.get('error_message') || 'Authentication failed';
                this.cleanUrlParams(['sponsor_status', 'sponsor_token', 'github_user', 'visitor_login', 'error', 'error_message']);
                
                if (error === 'not_sponsor') {
                    this.showSponsorRequired(container, baseURL, githubUser);
                } else {
                    this.showError(`Authentication error: ${errorMessage}`);
                }
                return;
            }

            // Manejar callback exitoso
            if (sponsorStatus === 'true' && sponsorToken) {
                this.cleanUrlParams(['sponsor_status', 'sponsor_token', 'github_user', 'visitor_login', 'error', 'error_message']);
                
                // Guardar token con expiración (55 minutos)
                localStorage.setItem(`sponsor_token_${githubUser}`, sponsorToken);
                localStorage.setItem(`sponsor_token_${githubUser}_expires`, Date.now() + (55 * 60 * 1000));

                if (visitorLogin) {
                    localStorage.setItem(`visitor_login_${githubUser}`, visitorLogin);
                }

                await this.showVideo(container, baseURL, src, autoplay, width, height);
                return;
            }

            // 2. Verificar token guardado en localStorage
            const storedToken = localStorage.getItem(`sponsor_token_${githubUser}`);
            const tokenExpires = localStorage.getItem(`sponsor_token_${githubUser}_expires`);

            if (storedToken && tokenExpires && Date.now() < parseInt(tokenExpires)) {
                try {
                    const authRes = await fetch(`${baseURL}/api/authorize?github-user=${encodeURIComponent(githubUser)}`, {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    });

                    if (authRes.ok) {
                        await this.showVideo(container, baseURL, src, autoplay, width, height);
                        return;
                    } else {
                        // Token inválido, limpiar
                        this.clearStoredAuth(githubUser);
                    }
                } catch (fetchError) {
                    console.warn('Error validating stored token:', fetchError);
                    this.clearStoredAuth(githubUser);
                }
            }

            // 3. Método legacy: verificar cookie (backward compatibility)
            try {
                const legacyAuthRes = await fetch(`${baseURL}/api/authorize?github-user=${encodeURIComponent(githubUser)}`);
                if (legacyAuthRes.ok) {
                    await this.showVideo(container, baseURL, src, autoplay, width, height);
                    return;
                }
            } catch (legacyError) {
                console.warn('Legacy auth method failed:', legacyError);
            }

            // 4. Usuario no autorizado - mostrar botón de login
            this.showSponsorRequired(container, baseURL, githubUser);

        } catch (err) {
            console.error('SponsorCast error:', err);
            this.showError(`Network error: ${err.message}`);
        }
    }

    // Nuevo método para limpiar autenticación almacenada
    clearStoredAuth(githubUser) {
        localStorage.removeItem(`sponsor_token_${githubUser}`);
        localStorage.removeItem(`sponsor_token_${githubUser}_expires`);
        localStorage.removeItem(`visitor_login_${githubUser}`);
    }


    cleanUrlParams(paramsToRemove) {
        const url = new URL(window.location.href);
        let hasChanges = false;

        paramsToRemove.forEach(param => {
            if (url.searchParams.has(param)) {
                url.searchParams.delete(param);
                hasChanges = true;
            }
        });

        if (hasChanges) {
            const newUrl = url.pathname + (url.search || '') + (url.hash || '');
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    getBaseURL() {
        return 'https://sponsorcast.vercel.app';
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
        --accent-primary: #00adef;
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
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--accent-primary), var(--accent-secondary), var(--accent-warning), transparent);
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

    .video-wrapper {
  position: relative;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-primary);
}

.controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: opacity 0.3s ease;
  opacity: 0;
  backdrop-filter: blur(4px);
}


.video-wrapper:hover .controls,
.video-wrapper:focus-within .controls {
  opacity: 1;
}

.controls button {
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
}

.controls input[type=range] {
  flex-grow: 1;
  cursor: pointer;
}

#progress {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: transparent;
  cursor: pointer;
  margin: 8px 0;
  position: absolute;
          opacity: 0;
          z-index: 2;
}


#progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 0;
  height: 0;
}

#progress::-moz-range-thumb {
  width: 0;
  height: 0;
}

#progress::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.progress-wrapper {
  overflow: visible; 
  width: 100%;
}

.progress-container {
  position: relative;
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: visible; 
  flex-grow: 1;
  cursor: pointer;
}


.progress-container:hover {
  height: 8px;
}

.progress-bar {
  position: absolute;
  height: 100%;
  background: var(--accent-primary);
  transition: height 0.2s ease-in-out;
  border-radius: 10em;
}

.buffered-bar {
  position: absolute;
  height: 100%;
  background: #ffffff33;
  transition: width 175ms cubic-bezier(0.18, 0, 0.07, 1), height 0.2s ease-in-out;
  border-radius: 10em;
}

.playIcon, .pauseIcon {
  width: 24px;
  height: 24px;
  display: inline-block;
  vertical-align: middle;
}

.playIcon .fill, .pauseIcon .fill {
  fill: white;
  transition: fill 0.2s ease;
}

.controls button:hover .playIcon .fill, 
.controls button:hover .pauseIcon .fill {
  fill: black;
}

.enter-fullscreen-icon {
  width: 24px;
  height: 24px;
  display: inline-block;
  vertical-align: middle;
}

.enter-fullscreen-icon path {
  fill: white;
  transition: fill 0.2s ease;
}

#fullscreen:hover .enter-fullscreen-icon path,
#fullscreen:focus .enter-fullscreen-icon path {
  fill: var(--accent-primary);
}

.video-wrapper:fullscreen .enter-fullscreen-icon path {
  fill: var(--accent-secondary);
}

.enter-fullscreen-icon path {
  fill: white;
}

/* Estilos para los íconos de pantalla completa */
.enter-fullscreen-icon, 
.exit-fullscreen-icon {
  width: 24px;
  height: 24px;
  display: inline-block;
  vertical-align: middle;
}

.enter-fullscreen-icon path, 
.exit-fullscreen-icon path {
  fill: white;
  transition: fill 0.2s ease;
}

#fullscreen:hover .enter-fullscreen-icon path,
#fullscreen:hover .exit-fullscreen-icon path,
#fullscreen:focus .enter-fullscreen-icon path,
#fullscreen:focus .exit-fullscreen-icon path {
  fill: var(--accent-primary);
}

/* Color diferente cuando está en pantalla completa */
:fullscreen .exit-fullscreen-icon path {
  fill: var(--accent-secondary);
}

          /* Estilos para el botón de play/pause */
        #play {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 3.8em;
            height: 1.8em;
            margin: 0 0.8em 0 0;
            background-color: rgba(0, 0, 0, 0.9);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: opacity 250ms ease-out, background-color 40ms, width 250ms ease-in-out, margin 250ms ease-in-out;
            z-index: 23;
            transform: translate3d(0, 0, 0);
        }

        #play:hover {
            background-color: var(--accent-primary);
        }

        /* Estilos para eliminar outline por defecto */
        body:not(.showfocus) .video-wrapper a,
        body:not(.showfocus) .video-wrapper button,
        body:not(.showfocus) .video-wrapper div,
        body:not(.showfocus) .video-wrapper li,
        body:not(.showfocus) .video-wrapper span,
        body:not(.showfocus) .video-wrapper svg {
            outline: 0 !important;
        }

        .video-wrapper a:active,
        .video-wrapper button:active,
        .video-wrapper button:not(:focus) {
            outline: 0;
        }

          
.timecode-container {
    position: absolute;
    bottom: 100%;
    margin-bottom: 8px;
    pointer-events: none;
    transform: translateX(-50%);
    transition: opacity 0.2s ease;
    z-index: 1000;
}

/* Tooltip de hover */
.hover-timecode {
    opacity: 0;
}

/* Tooltip del tiempo actual */
.current-timecode {
    opacity: 1;
    display: none; /* Lo mostraremos solo cuando los controles estén visibles */
}

.timecode {
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    position: relative;
}

          .timecode-current {
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    padding: 0.2em 0.4em;
    line-height: 1.6em;
    font-weight: 500;
    position: relative;
    left: 0;
    display: inline-block;
    font-size: 10px;
    background: #fff;
    color: #000;
    cursor: grab;
} 

.timecode-current::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid rgba(255, 255, 255, 0.9);
}

.timecode::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid rgba(0, 0, 0, 0.9);
}

/* Mostrar tooltip actual cuando los controles estén visibles */
.video-wrapper:hover .current-timecode {
    display: block;
}

.pip-icon {
                width: 25px;
                height: 25px;
                margin-right: -10px;
                display: inline-block;
                vertical-align: middle;
            }

          .pip-icon:hover {
          fill: var(--accent-primary);
          }
            
            .sponsorcast-logo {
          margin-top:5px;
                display: inline-block;
                vertical-align: middle;
            }
                      
    /* Estilos para el control de volumen */
.volume-container {
  position: relative;
  display: flex;
  align-items: center;
}

#volume-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.volume-slider-container {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 8px;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  height: 100px;
}

.volume-container:hover .volume-slider-container {
  opacity: 1;
  pointer-events: auto;
}

#volume {
  margin: 0 auto;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  writing-mode: vertical-lr;
  direction: rtl;
  transform: rotate(180deg);
}

#volume::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

#volume::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.volume-icon {
  fill: white;
  transition: fill 0.2s ease;
}

#volume-btn:hover .volume-icon {
  fill: var(--accent-primary);
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
        const currentUrl = window.location.href.split('?')[0]; // URL sin parámetros

        container.innerHTML = `
      <div class="sponsor-required">
        <h3>Almost there!</h3>
        <p>Sign in to GitHub to access these screencasts from <strong>@${githubUser}</strong>.</p>
        <a href="${baseURL}/api/login?github-user=${encodeURIComponent(githubUser)}&redirect_uri=${encodeURIComponent(currentUrl)}"
           target="_blank" class="sponsor-btn">
          Continue with Github
        </a>
      </div>
    `;
    }

    async showVideo(container, baseURL, src, autoplay, width, height) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-wrapper';
        wrapper.tabIndex = 0;

        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('tabindex', '0');
        video.style.width = width.includes('%') || width.includes('px') ? width : `${width}px`;
        if (height !== 'auto') {
            video.style.height = height.includes('%') || height.includes('px') ? height : `${height}px`;
        }
        if (autoplay) {
            video.autoplay = true;
            video.muted = true;
        }

        const playlistURL = `https://pub-2936dd6a3cb4488da476731228bbb559.r2.dev/${src}/playlist.m3u8`;

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
            video.src = playlistURL;
        } else {
            this.showError('Your browser does not support HLS video playback. Please use a modern browser.');
            return;
        }

        wrapper.innerHTML = `
  <div class="controls" role="group" aria-label="Video controls">
    <button id="play" aria-label="Play/Pause"><svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-play-icon="true" class="playIcon"><path d="M19 12C19 12.3557 18.8111 12.6846 18.5039 12.8638L6.50387 19.8638C6.19458 20.0442 5.81243 20.0455 5.50194 19.8671C5.19145 19.6888 5 19.3581 5 19L5 5C5 4.64193 5.19145 4.3112 5.50194 4.13286C5.81243 3.95452 6.19458 3.9558 6.50387 4.13622L18.5039 11.1362C18.8111 11.3154 19 11.6443 19 12Z" class="fill"></path></svg></button>
    <div class="progress-wrapper">
      <div class="progress-container">
        <div class="buffered-bar"></div>
        <div class="progress-bar"></div>
        <!-- Tooltip de preview (hover) -->
        <div class="timecode-container hover-timecode" role="presentation" aria-hidden="true">
          <div class="timecode">00:00</div>
        </div>
        <!-- Tooltip del tiempo actual -->
        <div class="timecode-container current-timecode" role="presentation" aria-hidden="true">
          <div class="timecode-current">00:00</div>
        </div>
        <input id="progress" type="range" min="0" max="100" value="0" aria-label="Progress">
      </div>
    </div>
    <div class="volume-container">
      <button id="volume-btn" aria-label="Volume">
          <svg data-volume-icon="true" class="volume-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"><path d="M12.253 19.4L7.99 15.782a1 1 0 0 0-.647-.238H4.75a2 2 0 0 1-2-2v-3.086a2 2 0 0 1 2-2h2.594a1 1 0 0 0 .647-.238l4.262-3.62a1 1 0 0 1 1.647.762V18.64a1 1 0 0 1-1.647.762Z"/><path stroke-linecap="round" d="M16.664 8.542c.48.35.88.854 1.158 1.462c.277.607.424 1.295.424 1.996c0 .7-.147 1.39-.424 1.996c-.278.607-.677 1.112-1.158 1.462M18.7 6.424c.775.565 1.42 1.378 1.867 2.357c.447.978.683 2.089.683 3.219s-.236 2.24-.683 3.22c-.448.978-1.092 1.791-1.867 2.356"/></g></svg>
      </button>
      <div class="volume-slider-container">
        <input id="volume" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" orient="vertical">
      </div>
    </div>
    <button id="pip" aria-label="Picture in Picture">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.25 18.25h-3.5a3 3 0 0 1-3-3v-8.5a3 3 0 0 1 3-3h12.5a3 3 0 0 1 3 3v3.5"/><rect width="12" height="10" x="11" y="12" fill="currentColor" rx="2"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 7.667V10.4a.6.6 0 0 1-.176.424M6.667 11H9.4a.6.6 0 0 0 .424-.176M6 7l3 3l.824.824"/></g></svg>
    </button>
    <button id="fullscreen" aria-label="Fullscreen">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 8.345V6.25a2.5 2.5 0 0 1 2.5-2.5h2.095M3.75 15.655v2.095a2.5 2.5 0 0 0 2.5 2.5h2.095M20.25 8.345V6.25a2.5 2.5 0 0 0-2.5-2.5h-2.095m4.595 11.905v2.095a2.5 2.5 0 0 1-2.5 2.5h-2.095"/></svg>
    </button>
    <a href="https://sponsorcast.vercel.app" target="_blank" class="sponsorcast-logo" aria-label="SponsorCast">
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100" viewBox="0 0 500 127" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd" xmlns:xlink="http://www.w3.org/1999/xlink">
<g><path style="opacity:1" fill="#fff" d="M 450.5,5.5 C 459.347,4.87387 468.014,5.70721 476.5,8C 481.979,10.4306 485.479,14.5973 487,20.5C 492.975,43.5358 494.642,66.8692 492,90.5C 490.881,95.2391 488.381,99.0724 484.5,102C 468.616,110.557 451.616,115.557 433.5,117C 397.938,121.035 362.272,122.368 326.5,121C 315.802,119.961 309.135,114.295 306.5,104C 303.669,82.5892 302.835,61.0892 304,39.5C 304.963,27.2079 311.463,20.0412 323.5,18C 330.473,16.8134 337.473,15.8134 344.5,15C 380.025,12.251 415.358,9.08434 450.5,5.5 Z"/></g>
<g><path style="opacity:1" fill="#140a10" d="M 456.5,38.5 C 460.514,38.3345 464.514,38.5012 468.5,39C 469.337,40.0113 469.67,41.1779 469.5,42.5C 466.833,42.5 464.167,42.5 461.5,42.5C 462.631,53.1444 463.631,63.8111 464.5,74.5C 463.167,74.5 461.833,74.5 460.5,74.5C 459.167,64.505 457.834,54.505 456.5,44.5C 453.934,44.3444 451.434,44.6777 449,45.5C 446.035,44.2784 445.868,42.7784 448.5,41C 451.457,40.7206 454.123,39.8873 456.5,38.5 Z"/></g>
<g><path style="opacity:1" fill="#10070d" d="M 430.5,41.5 C 436.104,40.8106 440.771,42.4773 444.5,46.5C 444.113,47.7199 443.28,48.3865 442,48.5C 438.311,46.7823 434.478,46.2823 430.5,47C 428.496,49.8408 427.996,53.0074 429,56.5C 432.411,57.2931 435.911,57.7931 439.5,58C 447.173,61.8408 448.507,67.3408 443.5,74.5C 438.731,78.6342 433.398,79.4675 427.5,77C 425.963,75.8904 425.297,74.3904 425.5,72.5C 429.819,73.2488 434.152,73.4155 438.5,73C 442.057,69.8185 442.391,66.3185 439.5,62.5C 435.555,61.7315 431.555,61.2315 427.5,61C 421.51,53.4225 422.51,46.9225 430.5,41.5 Z"/></g>
<g><path style="opacity:1" fill="#170b12" d="M 404.5,45.5 C 408.689,45.1816 411.855,46.8482 414,50.5C 418.562,59.7369 420.729,69.4036 420.5,79.5C 419.349,80.731 418.183,80.731 417,79.5C 415.844,75.5817 415.344,71.5817 415.5,67.5C 411.76,67.2408 408.094,67.5741 404.5,68.5C 403.672,73.1315 403.172,77.7982 403,82.5C 401.667,83.8333 400.333,83.8333 399,82.5C 397.82,71.3252 398.486,60.3252 401,49.5C 402.032,47.9733 403.199,46.64 404.5,45.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 90.5,46.5 C 106.738,45.3998 115.071,53.0664 115.5,69.5C 115.446,78.2491 112.446,85.7491 106.5,92C 93.4596,99.8853 82.9596,97.3853 75,84.5C 70.2196,71.0566 73.0529,59.5566 83.5,50C 85.9252,48.7874 88.2585,47.6207 90.5,46.5 Z M 93.5,52.5 C 103.816,53.6534 109.149,59.4867 109.5,70C 109.146,77.0751 106.479,83.0751 101.5,88C 87.2132,92.8938 79.8799,87.7271 79.5,72.5C 79.233,62.1375 83.8997,55.4708 93.5,52.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 216.5,46.5 C 230.462,44.6304 238.629,50.6304 241,64.5C 242.62,75.6393 239.454,85.1393 231.5,93C 216.644,99.8225 206.144,95.6558 200,80.5C 196.767,64.6369 202.267,53.3036 216.5,46.5 Z M 219.5,52.5 C 230.294,52.9621 235.627,58.6287 235.5,69.5C 235.423,76.8171 232.757,82.9837 227.5,88C 213.571,92.5192 206.238,87.3525 205.5,72.5C 205.291,62.2043 209.958,55.5376 219.5,52.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 15.5,46.5 C 23.3707,45.6747 29.704,48.3414 34.5,54.5C 34.0142,56.4974 32.8475,57.8307 31,58.5C 27.6032,55.4763 23.6032,53.8096 19,53.5C 11.7254,54.9896 9.55876,59.323 12.5,66.5C 18.147,66.873 23.4803,68.373 28.5,71C 35.5185,79.2497 34.8519,86.9163 26.5,94C 20.2132,97.1555 13.8799,97.1555 7.5,94C 2.77347,91.6845 2.44014,89.1845 6.5,86.5C 11.5559,89.1173 16.8893,89.9506 22.5,89C 26.8541,85.2103 27.5207,80.877 24.5,76C 19.0961,74.99 13.7628,73.6566 8.5,72C 2.00734,60.9873 4.34067,52.4873 15.5,46.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 175.5,46.5 C 182.289,45.8183 188.122,47.8183 193,52.5C 193.923,55.2778 193.089,57.2778 190.5,58.5C 186.161,54.6571 181.161,53.1571 175.5,54C 172.581,55.8281 170.915,58.4947 170.5,62C 171.09,63.5095 171.756,65.0095 172.5,66.5C 179.007,66.6134 184.841,68.6134 190,72.5C 194.177,80.5821 193.011,87.7488 186.5,94C 179.391,97.2754 172.391,96.942 165.5,93C 163.771,91.2111 163.104,89.0444 163.5,86.5C 167.049,86.4392 170.382,87.2725 173.5,89C 184.539,90.6381 188.206,86.3048 184.5,76C 179.894,74.8387 175.227,73.8387 170.5,73C 167.572,71.7402 165.739,69.5735 165,66.5C 163.186,56.864 166.686,50.1973 175.5,46.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 257.5,46.5 C 268.47,45.4698 275.47,50.1365 278.5,60.5C 277.576,67.0171 274.576,72.3504 269.5,76.5C 272.597,82.3689 275.93,88.0356 279.5,93.5C 278.904,96.2464 277.237,97.0798 274.5,96C 272.667,94.8333 271.167,93.3333 270,91.5C 268.388,85.2536 265.054,80.2536 260,76.5C 258.644,77.3802 257.144,77.7135 255.5,77.5C 255.666,83.8421 255.5,90.1754 255,96.5C 253.556,98.1554 251.722,98.822 249.5,98.5C 248.665,84.3495 248.499,70.0162 249,55.5C 250.688,51.3148 253.521,48.3148 257.5,46.5 Z M 258.5,52.5 C 268.646,51.2933 272.813,55.6266 271,65.5C 269.773,67.7261 267.939,69.2261 265.5,70C 262.242,70.2117 259.076,70.7117 256,71.5C 254.582,66.5715 254.249,61.5715 255,56.5C 255.69,54.6498 256.856,53.3164 258.5,52.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 43.5,47.5 C 61.984,46.1442 69.8173,54.4776 67,72.5C 62.086,78.6506 55.586,81.6506 47.5,81.5C 47.8161,85.5246 47.9828,89.5246 48,93.5C 46,97.5 44,97.5 42,93.5C 41.3333,78.8333 41.3333,64.1667 42,49.5C 42.7172,48.9558 43.2172,48.2891 43.5,47.5 Z M 47.5,54.5 C 58.7585,53.7479 63.0918,58.7479 60.5,69.5C 56.8268,72.7743 52.4934,74.441 47.5,74.5C 47.5,67.8333 47.5,61.1667 47.5,54.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 152.5,47.5 C 154.017,47.5106 155.184,48.1772 156,49.5C 156.915,64.2234 156.415,78.89 154.5,93.5C 151.755,94.9753 149.588,94.3087 148,91.5C 141.501,82.5064 135.501,73.1731 130,63.5C 129.667,73.8333 129.333,84.1667 129,94.5C 126.733,95.9348 124.733,95.6015 123,93.5C 122.833,86.8333 122.667,80.1667 122.5,73.5C 122.384,65.7594 122.884,58.0927 124,50.5C 126.632,47.8076 128.966,48.141 131,51.5C 137.503,61.1685 143.503,71.1685 149,81.5C 149.333,71.1667 149.667,60.8333 150,50.5C 150.698,49.3094 151.531,48.3094 152.5,47.5 Z"/></g>
<g><path style="opacity:1" fill="#11070d" d="M 376.5,49.5 C 383.486,47.8285 388.486,50.1619 391.5,56.5C 391.113,57.7199 390.28,58.3865 389,58.5C 386.277,56.3061 383.277,54.6394 380,53.5C 377.497,53.99 375.497,55.3234 374,57.5C 371.607,64.1818 372.274,70.5151 376,76.5C 382.352,82.3717 387.185,81.205 390.5,73C 391.448,72.5172 392.448,72.3505 393.5,72.5C 392.319,83.0956 386.652,86.5956 376.5,83C 366.669,74.4998 365.002,64.6665 371.5,53.5C 373.21,52.1128 374.877,50.7794 376.5,49.5 Z"/></g>
<g><path style="opacity:1" fill="#fff" d="M 407.5,63.5 C 406.167,63.5 404.833,63.5 403.5,63.5C 403.5,61.1667 403.5,58.8333 403.5,56.5C 405.802,48.6171 408.635,48.6171 412,56.5C 412.813,58.4357 413.313,60.4357 413.5,62.5C 411.5,62.8333 409.5,63.1667 407.5,63.5 Z"/></g>
<g><path style="opacity:1" fill="#040203" d="M 337.5,55.5 C 344.429,55.051 349.262,58.051 352,64.5C 354.772,81.0538 347.939,88.5538 331.5,87C 329.376,85.8783 327.543,84.3783 326,82.5C 321.71,69.7689 325.543,60.7689 337.5,55.5 Z"/></g>
<g><path style="opacity:1" fill="#5c2649" d="M 403.5,56.5 C 403.5,58.8333 403.5,61.1667 403.5,63.5C 404.833,63.5 406.167,63.5 407.5,63.5C 406.081,64.4511 404.415,64.7845 402.5,64.5C 402.194,61.6146 402.527,58.9479 403.5,56.5 Z"/></g>
</svg>

  </a>
  </div>
  
`;

        wrapper.prepend(video);
        container.innerHTML = '';
        container.appendChild(wrapper);

        // Obtén las referencias a los nuevos elementos
        const progressContainer = wrapper.querySelector('.progress-container');
        const progressBar = wrapper.querySelector('.progress-bar');
        const bufferedBar = wrapper.querySelector('.buffered-bar');
        const progressInput = wrapper.querySelector('#progress');
        const timecodeContainer = wrapper.querySelector('.timecode-container');
        const timecode = wrapper.querySelector('.timecode');
        const hoverTimecode = wrapper.querySelector('.hover-timecode');
        const currentTimecode = wrapper.querySelector('.current-timecode');
        const hoverTimecodeText = hoverTimecode.querySelector('.timecode');
        const currentTimecodeText = currentTimecode.querySelector('.timecode-current');
        const volumeBtn = wrapper.querySelector('#volume-btn');
        const volumeSlider = wrapper.querySelector('#volume');
        const volumeIcon = wrapper.querySelector('.volume-icon');



        // Estado para controlar el tooltip
        let isHoveringProgress = false;
        let currentTooltipTime = 0;

        // Configura el volumen inicial
        video.volume = volumeSlider.value;

       // Actualiza el icono según el volumen
      function updateVolumeIcon() {
          if (video.muted || video.volume === 0) {
              volumeIcon.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"><path d="M12.253 19.4L7.99 15.782a1 1 0 0 0-.647-.238H4.75a2 2 0 0 1-2-2v-3.086a2 2 0 0 1 2-2h2.594a1 1 0 0 0 .647-.238l4.262-3.62a1 1 0 0 1 1.647.762V18.64a1 1 0 0 1-1.647.762Z"/><path stroke-linecap="round" d="m16.53 9.64l4.72 4.72m0-4.72l-4.72 4.72"/></g></svg>`;
          } else if (video.volume < 0.5) {
              volumeIcon.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"><path d="M12.253 19.4L7.99 15.782a1 1 0 0 0-.647-.238H4.75a2 2 0 0 1-2-2v-3.086a2 2 0 0 1 2-2h2.594a1 1 0 0 0 .647-.238l4.262-3.62a1 1 0 0 1 1.647.762V18.64a1 1 0 0 1-1.647.762Z"/><path stroke-linecap="round" d="M16.664 8.542c.48.35.88.854 1.158 1.462c.277.607.423 1.295.423 1.996c0 .7-.146 1.39-.423 1.996c-.278.607-.677 1.112-1.158 1.462"/></g></svg>`;
          } else {
              volumeIcon.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5"><path d="M12.253 19.4L7.99 15.782a1 1 0 0 0-.647-.238H4.75a2 2 0 0 1-2-2v-3.086a2 2 0 0 1 2-2h2.594a1 1 0 0 0 .647-.238l4.262-3.62a1 1 0 0 1 1.647.762V18.64a1 1 0 0 1-1.647.762Z"/><path stroke-linecap="round" d="M16.664 8.542c.48.35.88.854 1.158 1.462c.277.607.424 1.295.424 1.996c0 .7-.147 1.39-.424 1.996c-.278.607-.677 1.112-1.158 1.462M18.7 6.424c.775.565 1.42 1.378 1.867 2.357c.447.978.683 2.089.683 3.219s-.236 2.24-.683 3.22c-.448.978-1.092 1.791-1.867 2.356"/></g></svg>`;
          }
      }
        // Actualiza el icono al cargar
        updateVolumeIcon();

        // Control de volumen
        volumeSlider.addEventListener('input', () => {
            video.volume = volumeSlider.value;
            video.muted = false;
            updateVolumeIcon();
        });

        // Silenciar al hacer clic en el botón
        volumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            video.muted = !video.muted;
            if (!video.muted && video.volume === 0) {
                video.volume = 0.5;
                volumeSlider.value = 0.5;
            }
            updateVolumeIcon();
        });

        // Actualizar el slider cuando cambia el volumen
        video.addEventListener('volumechange', () => {
            if (!video.muted) {
                volumeSlider.value = video.volume;
            }
            updateVolumeIcon();
        });

        // Función para actualizar la posición del tooltip
        function updateTooltipPosition(percent, time) {
            const containerWidth = progressContainer.offsetWidth;
            const tooltipWidth = 60; // Ancho aproximado del tooltip

            let leftPosition = percent;

            // Prevenir que el tooltip se salga de los bordes
            if (leftPosition < 5) leftPosition = 5;
            if (leftPosition > 95) leftPosition = 95;

            timecodeContainer.style.left = `${leftPosition}%`;
            timecode.textContent = this.formatTime(time);
        }
        // Mostrar tooltip durante la reproducción normal
        video.addEventListener('timeupdate', () => {
            if (!video.duration) return;

            const percent = (video.currentTime / video.duration) * 100;
            progressBar.style.width = `${percent}%`;
            progressInput.value = percent;

            // Actualizar buffer
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const bufferedPercent = (bufferedEnd / video.duration) * 100;
                bufferedBar.style.width = `${bufferedPercent}%`;
            }

            // Actualizar tooltip del tiempo actual
            currentTimecodeText.textContent = this.formatTime(video.currentTime);
            currentTimecode.style.left = `${percent}%`;
        });

        // Tooltip de preview (al pasar el mouse)
        progressContainer.addEventListener('mouseenter', () => {
            isHoveringProgress = true;
            timecodeContainer.style.opacity = '1';
        });

        progressContainer.addEventListener('mousemove', (e) => {
            if (!video.duration) return;

            const rect = progressContainer.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const time = pos * video.duration;

            timecode.textContent = this.formatTime(time);
            timecodeContainer.style.left = `${pos * 100}%`;
        });

        progressContainer.addEventListener('mouseleave', () => {
            isHoveringProgress = false;
            timecodeContainer.style.opacity = '0';
        });

        // Al hacer clic en la barra
        progressContainer.addEventListener('click', (e) => {
            if (!video.duration) return;

            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const time = pos * video.duration;
            video.currentTime = time;

            // Actualizar tooltip después del salto
            timecode.textContent = this.formatTime(time);
            timecodeContainer.style.left = `${pos * 100}%`;
        });

        // Mostrar/ocultar controles al interactuar con el video
        wrapper.addEventListener('mouseenter', () => {
            wrapper.querySelector('.controls').style.opacity = '1';
        });

        wrapper.addEventListener('mouseleave', () => {
            wrapper.querySelector('.controls').style.opacity = '0';
            if (!isHoveringProgress) {
                timecodeContainer.style.opacity = '0';
            }
        });

        // Controles personalizados
        const playBtn = wrapper.querySelector('#play');
        const progress = wrapper.querySelector('#progress');
        const volume = wrapper.querySelector('#volume');
        const fullscreenBtn = wrapper.querySelector('#fullscreen');
        const pipBtn = wrapper.querySelector('#pip');

        // Verificar si el navegador soporta Picture-in-Picture
        if ('pictureInPictureEnabled' in document) {
            pipBtn.style.display = 'block';

            pipBtn.addEventListener('click', async () => {
                try {
                    if (video !== document.pictureInPictureElement) {
                        await video.requestPictureInPicture();
                        pipBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.75 5.75h3.5a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H5.75a3 3 0 0 1-3-3v-3.5"/><rect width="12" height="10" x="13" y="12" fill="currentColor" rx="2" transform="rotate(180 13 12)"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 13.667V16.4a.6.6 0 0 1-.176.424M14.667 17H17.4a.6.6 0 0 0 .424-.176M14 13l3 3l.824.824"/></g></svg>
                        `;
                    } else {
                        await document.exitPictureInPicture();
                        pipBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.25 18.25h-3.5a3 3 0 0 1-3-3v-8.5a3 3 0 0 1 3-3h12.5a3 3 0 0 1 3 3v3.5"/><rect width="12" height="10" x="11" y="12" fill="currentColor" rx="2"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 7.667V10.4a.6.6 0 0 1-.176.424M6.667 11H9.4a.6.6 0 0 0 .424-.176M6 7l3 3l.824.824"/></g></svg>
                        `;
                    }
                } catch (error) {
                    console.error('Error al manejar Picture-in-Picture:', error);
                }
            });

            // Escuchar cambios en el estado de Picture-in-Picture
            video.addEventListener('enterpictureinpicture', () => {
                pipBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.75 5.75h3.5a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H5.75a3 3 0 0 1-3-3v-3.5"/><rect width="12" height="10" x="13" y="12" fill="currentColor" rx="2" transform="rotate(180 13 12)"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 13.667V16.4a.6.6 0 0 1-.176.424M14.667 17H17.4a.6.6 0 0 0 .424-.176M14 13l3 3l.824.824"/></g></svg>
                `;
            });

            video.addEventListener('leavepictureinpicture', () => {
                pipBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><g fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.25 18.25h-3.5a3 3 0 0 1-3-3v-8.5a3 3 0 0 1 3-3h12.5a3 3 0 0 1 3 3v3.5"/><rect width="12" height="10" x="11" y="12" fill="currentColor" rx="2"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 7.667V10.4a.6.6 0 0 1-.176.424M6.667 11H9.4a.6.6 0 0 0 .424-.176M6 7l3 3l.824.824"/></g></svg>
                `;
            });
        } else {
            // Ocultar el botón si no es compatible
            pipBtn.style.display = 'none';
        }

        playBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-pause-icon="true" class="pauseIcon">
        <path fill-rule="evenodd" clip-rule="evenodd" class="fill" d="M8 4C6.89543 4 6 4.89543 6 6V18C6 19.1046 6.89543 20 8 20C9.10457 20 10 19.1046 10 18V6C10 4.89543 9.10457 4 8 4ZM16 4C14.8954 4 14 4.89543 14 6V18C14 19.1046 14.8954 20 16 20C17.1046 20 18 19.1046 18 18V6C18 4.89543 17.1046 4 16 4Z"></path>
      </svg>`;
            } else {
                video.pause();
                playBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-play-icon="true" class="playIcon">
        <path d="M19 12C19 12.3557 18.8111 12.6846 18.5039 12.8638L6.50387 19.8638C6.19458 20.0442 5.81243 20.0455 5.50194 19.8671C5.19145 19.6888 5 19.3581 5 19L5 5C5 4.64193 5.19145 4.3112 5.50194 4.13286C5.81243 3.95452 6.19458 3.9558 6.50387 4.13622L18.5039 11.1362C18.8111 11.3154 19 11.6443 19 12Z" class="fill"></path>
      </svg>`;
            }
        });

        volume.addEventListener('input', () => {
            video.volume = volume.value;
        });

        video.addEventListener('timeupdate', () => {
            progress.value = (video.currentTime / video.duration) * 100;
        });

        progress.addEventListener('input', () => {
            video.currentTime = (progress.value / 100) * video.duration;
        });

        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                wrapper.requestFullscreen();
                fullscreenBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.345 3.75v2.095a2.5 2.5 0 0 1-2.5 2.5H3.75M8.345 20.25v-2.095a2.5 2.5 0 0 0-2.5-2.5H3.75M15.655 3.75v2.095a2.5 2.5 0 0 0 2.5 2.5h2.095M15.655 20.25v-2.095a2.5 2.5 0 0 1 2.5-2.5h2.095"/></svg>`;
            } else {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 8.345V6.25a2.5 2.5 0 0 1 2.5-2.5h2.095M3.75 15.655v2.095a2.5 2.5 0 0 0 2.5 2.5h2.095M20.25 8.345V6.25a2.5 2.5 0 0 0-2.5-2.5h-2.095m4.595 11.905v2.095a2.5 2.5 0 0 1-2.5 2.5h-2.095"/></svg>`;
            }
        });

        // Atajos de teclado tipo YouTube
        wrapper.addEventListener('keydown', e => {
            switch (e.key) {
                case 'k':
                case ' ':
                    e.preventDefault();
                    playBtn.click();
                    break;
                case 'f':
                    fullscreenBtn.click();
                    break;
                case 'm':
                    video.muted = !video.muted;
                    e.preventDefault();
                    volumeBtn.click();
                    break;
                case 'ArrowRight':
                    video.currentTime += 5;
                    break;
                case 'ArrowLeft':
                    video.currentTime -= 5;
                    break;
            }
        });
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
        <p class="error-message">${this.escapeHtml(message)}</p>
        ${this.shouldShowErrorCode(message) ? `<code class="error-code">ERROR_${Date.now()}</code>` : ''}
      </div>
    `;
    }

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