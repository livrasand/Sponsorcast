import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getUserInfo, isSponsorOfCreator } from '../lib/github.js';
import { getCreatorPAT } from '../lib/database.js';

export default async function handler(req, res) {
  const { code, state, error: githubError, error_description } = req.query;

  // Manejar errores de GitHub OAuth
  if (githubError) {
    console.error('GitHub OAuth error:', githubError, error_description);
    return showErrorPage(res, 'GitHub OAuth Error', error_description || githubError);
  }

  if (!code || !state) {
    return showErrorPage(res, 'Missing Parameters', 'Missing authorization code or state parameter');
  }

  let statePayload;
  try {
    // Verificar y decodificar el estado seguro
    statePayload = jwt.verify(state, process.env.JWT_SECRET, {
      issuer: 'sponsorcast',
      audience: 'oauth-flow'
    });
  } catch (error) {
    console.error('Invalid state token:', error.message);
    return showErrorPage(res, 'Security Error', 'Invalid or expired state token');
  }

  const { githubUser, redirectUri, clientState } = statePayload;

  try {
    // 1. Intercambiar código por access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: `${process.env.HOST || 'https://sponsorcast.vercel.app'}/api/callback`
      },
      {
        headers: { 
          Accept: 'application/json',
          'User-Agent': 'SponsorCast/1.0'
        }
      }
    );

    const { access_token, token_type, scope } = tokenResponse.data;
    
    if (!access_token) {
      throw new Error('No access token received from GitHub');
    }

    // Log scopes para debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('GitHub token received with scopes:', scope);
    }

    // 2. Obtener información del usuario visitante
    const visitorInfo = await getUserInfo(access_token);
    if (!visitorInfo) {
      throw new Error('Could not retrieve user information from GitHub');
    }

    console.log(`User ${visitorInfo.login} attempting to access @${githubUser} content`);

    // 3. Obtener PAT del creador desde la base de datos
    const creatorPAT = await getCreatorPAT(githubUser);
    if (!creatorPAT) {
      console.error(`Creator ${githubUser} not found or no PAT configured`);
      return redirectWithError(redirectUri, 'creator_not_found', 
        `Creator @${githubUser} is not registered in SponsorCast`);
    }

    // 4. Verificar autorización (es sponsor O es el propietario)
    const isOwner = visitorInfo.login.toLowerCase() === githubUser.toLowerCase();
    const isValidSponsor = isOwner || await isSponsorOfCreator(creatorPAT, visitorInfo.login);
    
    if (!isValidSponsor) {
      console.log(`${visitorInfo.login} is not a sponsor of @${githubUser}`);
      return redirectWithError(redirectUri, 'not_sponsor', 
        `You need to be a GitHub Sponsor of @${githubUser} to access this content`, 
        { githubUser, visitorLogin: visitorInfo.login });
    }

    // 5. Crear token JWT de sesión para SponsorCast
    const sessionToken = jwt.sign(
      { 
        sponsor: true, 
        githubUser,
        visitorLogin: visitorInfo.login,
        visitorName: visitorInfo.name,
        isOwner,
        timestamp: Date.now()
      }, 
      process.env.JWT_SECRET, 
      { 
        expiresIn: '1h',
        issuer: 'sponsorcast',
        audience: 'session'
      }
    );

    console.log(`Access granted: ${visitorInfo.login} → @${githubUser}`);

    // 6. Redirigir de vuelta al sitio original con éxito
    return redirectWithSuccess(res, redirectUri, sessionToken, {
      githubUser,
      visitorLogin: visitorInfo.login,
      clientState
    });

  } catch (error) {
    console.error('OAuth callback error:', error.message);
    
    // Determinar el tipo de error para mejor UX
    let errorType = 'auth_failed';
    let errorMessage = 'Authentication failed';
    
    if (error.message.includes('access_token')) {
      errorType = 'token_exchange_failed';
      errorMessage = 'Failed to exchange authorization code';
    } else if (error.message.includes('user information')) {
      errorType = 'user_info_failed';
      errorMessage = 'Failed to retrieve user information';
    } else if (error.message.includes('Creator') && error.message.includes('not found')) {
      errorType = 'creator_not_found';
      errorMessage = error.message;
    }

    return redirectWithError(redirectUri, errorType, errorMessage);
  }
}

/**
 * Redirige al sitio original con parámetros de éxito
 */
function redirectWithSuccess(res, redirectUri, sessionToken, data) {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set('sponsor_status', 'true');
    url.searchParams.set('sponsor_token', sessionToken);
    url.searchParams.set('github_user', data.githubUser);
    url.searchParams.set('visitor_login', data.visitorLogin);
    
    if (data.clientState) {
      url.searchParams.set('state', data.clientState);
    }

    return res.writeHead(302, { 
      Location: url.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }).end();
  } catch (error) {
    console.error('Error constructing success redirect:', error);
    return showSuccessPage(res, data.githubUser, data.visitorLogin);
  }
}

/**
 * Redirige al sitio original con parámetros de error
 */
function redirectWithError(redirectUri, errorType, errorMessage, data = {}) {
  if (!redirectUri) {
    return showErrorPage(res, 'Authentication Error', errorMessage);
  }

  try {
    const url = new URL(redirectUri);
    url.searchParams.set('sponsor_status', 'false');
    url.searchParams.set('error', errorType);
    url.searchParams.set('error_message', errorMessage);
    
    if (data.githubUser) {
      url.searchParams.set('github_user', data.githubUser);
    }
    if (data.visitorLogin) {
      url.searchParams.set('visitor_login', data.visitorLogin);
    }

    return res.writeHead(302, { 
      Location: url.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }).end();
  } catch (error) {
    console.error('Error constructing error redirect:', error);
    return showErrorPage(res, 'Authentication Error', errorMessage);
  }
}

/**
 * Muestra página de error cuando no se puede redirigir
 */
function showErrorPage(res, title, message) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - SponsorCast</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 2rem;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 2.5rem;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #e53e3e;
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .btn {
          background: #4299e1;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          text-decoration: none;
          display: inline-block;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #3182ce;
        }
        .secondary {
          margin-left: 1rem;
          background: #e2e8f0;
          color: #4a5568;
        }
        .secondary:hover {
          background: #cbd5e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">❌</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="javascript:window.close()" class="btn">Close Window</a>
        <a href="javascript:history.back()" class="btn secondary">Go Back</a>
      </div>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(400).send(html);
}

/**
 * Muestra página de éxito cuando no se puede redirigir
 */
function showSuccessPage(res, githubUser, visitorLogin) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authentication Successful - SponsorCast</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          margin: 0;
          padding: 2rem;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 2.5rem;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        .icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #38a169;
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .user-info {
          background: #f7fafc;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
          font-family: monospace;
          font-size: 0.9rem;
        }
        .btn {
          background: #4299e1;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          text-decoration: none;
          display: inline-block;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #3182ce;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✅</div>
        <h1>Authentication Successful!</h1>
        <p>You are now authenticated as a sponsor of <strong>@${githubUser}</strong>.</p>
        <div class="user-info">
          Logged in as: <strong>@${visitorLogin}</strong>
        </div>
        <p>You can now close this window and reload the content.</p>
        <a href="javascript:window.close()" class="btn">Close Window</a>
      </div>
      <script>
        // Auto-close después de 5 segundos
        setTimeout(() => {
          window.close();
        }, 5000);
      </script>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}