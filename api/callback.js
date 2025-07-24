import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getUserInfo } from '../lib/github.js';
import { getCreatorPAT } from '../lib/database.js';
import { isSponsorOfCreator } from '../lib/github.js';

export default async function handler(req, res) {
  const code = req.query.code;
  const state = req.query.state;
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // Decodificar el state para obtener el githubUser
    let githubUser = process.env.GITHUB_USER; // fallback
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        githubUser = decoded.githubUser || githubUser;
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

    // 4. Verificar si el visitante es sponsor del creador
    const valid = await isSponsorOfCreator(creatorPAT, visitorInfo.login);

    if (!valid) {
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
        timestamp: Date.now()
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // 6. Establecer cookie y redirigir
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
