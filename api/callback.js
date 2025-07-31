import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getUserInfo, isSponsorOfCreator } from '../lib/github.js';
import { getCreatorPAT } from '../lib/database.js';

export default async function handler(req, res) {
  const code = req.query.code;
  const state = req.query.state;
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // Decodificar el state para obtener githubUser y redirectUri
    let githubUser = process.env.GITHUB_USER;
    let redirectUri = null;
    
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        githubUser = decoded.githubUser || githubUser;
        redirectUri = decoded.redirectUri; // ✨ NUEVO: URL de regreso
      } catch (e) {
        console.warn('Failed to decode state:', e);
      }
    }

    // 1. Obtener access token
    const { data } = await axios.post(
      'https://github.com/login/oauth/access_token',
      { client_id, client_secret, code },
      { headers: { Accept: 'application/json' } }
    );

    const access_token = data.access_token;
    
    if (!access_token) {
      throw new Error('No access token received');
    }

    // 2. Obtener información del visitante
    const visitorInfo = await getUserInfo(access_token);
    if (!visitorInfo) {
      throw new Error('Could not get visitor information');
    }

    // 3. Obtener PAT del creador
    const creatorPAT = await getCreatorPAT(githubUser);
    if (!creatorPAT) {
      throw new Error(`Creator ${githubUser} not found or no PAT configured`);
    }

    // 4. Verificar si el visitante es sponsor del creador O ES EL PROPIETARIO
    const isOwner = visitorInfo.login === githubUser;
    const valid = isOwner || await isSponsorOfCreator(creatorPAT, visitorInfo.login);
    
    if (!valid) {
      // NUEVO: Si hay redirectUri, redirigir con error
      if (redirectUri && isValidRedirectUri(redirectUri)) {
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set('sponsor_status', 'false');
        errorUrl.searchParams.set('error', 'not_sponsor');
        errorUrl.searchParams.set('github_user', githubUser);
        
        return res.redirect(errorUrl.toString());
      }
      
      // Fallback: mostrar página de error
      return res.status(403).send(`
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; text-align: center;">
            <h2>❌ Not a Sponsor</h2>
            <p>You need to be a GitHub Sponsor of <strong>@${githubUser}</strong> to access this content.</p>
            <p><a href="https://github.com/sponsors/${githubUser}" style="background: #ff6b6b; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px;">❤️ Become a Sponsor</a></p>
            <p><a href="javascript:window.close()">Close this window</a></p>
          </body>
        </html>
      `);
    }

    // 5. Firmar JWT con información del usuario (válido por 1 hora)
    const token = jwt.sign(
      { 
        sponsor: true, 
        githubUser,
        visitorLogin: visitorInfo.login,
        timestamp: Date.now()
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // ✨ NUEVO: Si hay redirectUri, redirigir de vuelta al sitio web
    if (redirectUri && isValidRedirectUri(redirectUri)) {
      const successUrl = new URL(redirectUri);
      successUrl.searchParams.set('sponsor_status', 'true');
      successUrl.searchParams.set('sponsor_token', token);
      successUrl.searchParams.set('github_user', githubUser);
      successUrl.searchParams.set('visitor_login', visitorInfo.login);
      
      return res.redirect(successUrl.toString());
    }

    // 6. Fallback: Establecer cookie y mostrar página de éxito
    res.setHeader('Set-Cookie', `sponsor_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);
    
    res.send(`
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; text-align: center;">
          <h2>✅ Authentication Successful!</h2>
          <p>You are now authenticated as a sponsor of <strong>@${githubUser}</strong>.</p>
          <p>You can now close this window and reload the content.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Callback error:', error);
    
    // ✨ NUEVO: Si hay redirectUri, redirigir con error
    if (redirectUri && isValidRedirectUri(redirectUri)) {
      const errorUrl = new URL(redirectUri);
      errorUrl.searchParams.set('sponsor_status', 'false');
      errorUrl.searchParams.set('error', 'auth_failed');
      errorUrl.searchParams.set('message', error.message);
      
      return res.redirect(errorUrl.toString());
    }
    
    res.status(500).send(`
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; text-align: center;">
          <h2>❌ Authentication Error</h2>
          <p>There was an error during authentication: ${error.message}</p>
          <p><a href="javascript:window.close()">Close this window</a></p>
        </body>
      </html>
    `);
  }
}

// ✨ NUEVO: Función de seguridad para validar redirectUri
function isValidRedirectUri(redirectUri) {
  try {
    const url = new URL(redirectUri);
    
    // Lista blanca de dominios permitidos (opcional)
    const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || null;
    
    if (allowedDomains) {
      const hostname = url.hostname.toLowerCase();
      const isAllowed = allowedDomains.some(domain => {
        domain = domain.trim().toLowerCase();
        return hostname === domain || hostname.endsWith('.' + domain);
      });
      
      if (!isAllowed) {
        console.warn(`Redirect URI not in allowed domains: ${hostname}`);
        return false;
      }
    }
    
    // Validaciones básicas de seguridad
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }
    
    // Evitar localhost en producción (opcional)
    if (process.env.NODE_ENV === 'production' && 
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Invalid redirect URI:', redirectUri, error);
    return false;
  }
}