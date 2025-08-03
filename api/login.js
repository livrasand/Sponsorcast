import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export default function handler(req, res) {
  const { 
    'github-user': githubUser, 
    redirect_uri: redirectUri,
    state: clientState 
  } = req.query;

  // Validar parámetros requeridos
  if (!githubUser) {
    return res.status(400).json({ 
      error: 'Missing required parameter: github-user' 
    });
  }

  // Validar y sanitizar redirect_uri
  const validatedRedirectUri = validateRedirectUri(redirectUri);
  if (!validatedRedirectUri) {
    return res.status(400).json({ 
      error: 'Invalid or unsafe redirect_uri' 
    });
  }

  // Crear estado seguro con información del cliente
  const statePayload = {
    githubUser: githubUser.toLowerCase().trim(),
    redirectUri: validatedRedirectUri,
    clientState: clientState || null,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex')
  };

  // Firmar el estado con JWT para prevenir manipulación
  const secureState = jwt.sign(statePayload, process.env.JWT_SECRET, {
    expiresIn: '10m', // El flujo OAuth debe completarse en 10 minutos
    issuer: 'sponsorcast',
    audience: 'oauth-flow'
  });

  // Configuración OAuth de GitHub
  const client_id = process.env.GITHUB_CLIENT_ID;
  const redirect_uri = `${process.env.HOST || 'https://sponsorcast.vercel.app'}/api/callback`;
  
  if (!client_id) {
    return res.status(500).json({ 
      error: 'GitHub OAuth not configured' 
    });
  }

  // Construir URL de autorización de GitHub
  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', client_id);
  githubAuthUrl.searchParams.set('redirect_uri', redirect_uri);
  githubAuthUrl.searchParams.set('scope', 'read:user read:org read:sponsorships');
  githubAuthUrl.searchParams.set('state', secureState);
  githubAuthUrl.searchParams.set('allow_signup', 'false'); // Solo usuarios existentes

  // Log para debugging (en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('OAuth flow initiated:', {
      githubUser,
      redirectUri: validatedRedirectUri,
      hasClientState: !!clientState
    });
  }

  // Redirigir a GitHub
  res.writeHead(302, { 
    Location: githubAuthUrl.toString(),
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end();
}

/**
 * Valida y sanitiza el redirect_uri para prevenir ataques de redirección abierta
 */
function validateRedirectUri(redirectUri) {
  if (!redirectUri) {
    return null;
  }

  try {
    const url = new URL(redirectUri);
    
    // Solo permitir HTTPS en producción
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      console.warn('Redirect URI must use HTTPS in production:', redirectUri);
      return null;
    }
    
    // Permitir HTTP solo para localhost en desarrollo
    if (url.protocol === 'http:' && 
        !['localhost', '127.0.0.1'].includes(url.hostname)) {
      console.warn('HTTP only allowed for localhost:', redirectUri);
      return null;
    }

    // Validar protocolos permitidos
    if (!['https:', 'http:'].includes(url.protocol)) {
      console.warn('Invalid protocol:', url.protocol);
      return null;
    }

    // Lista blanca de dominios (opcional)
    if (process.env.ALLOWED_REDIRECT_DOMAINS) {
      const allowedDomains = process.env.ALLOWED_REDIRECT_DOMAINS
        .split(',')
        .map(d => d.trim().toLowerCase());
      
      const hostname = url.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain);
      });
      
      if (!isAllowed) {
        console.warn('Domain not in whitelist:', hostname);
        return null;
      }
    }

    // Prevenir localhost en producción (opcional)
    if (process.env.NODE_ENV === 'production' && 
        ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
      console.warn('Localhost not allowed in production');
      return null;
    }

    // Validar longitud máxima de URL
    if (redirectUri.length > 2048) {
      console.warn('Redirect URI too long');
      return null;
    }

    return url.toString();
  } catch (error) {
    console.warn('Invalid redirect URI:', redirectUri, error.message);
    return null;
  }
}