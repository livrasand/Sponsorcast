export default function handler(req, res) {
  const client_id = process.env.GITHUB_CLIENT_ID;
  const githubUser = req.query['github-user'] || process.env.GITHUB_USER;
  
  // Siempre usar la URL registrada en GitHub OAuth App
  const redirect_uri = `${process.env.HOST || 'https://sponsorcast.vercel.app'}/api/callback`;
  
  // Capturo el redirect_uri dinámico del sitio web del usuario
  const dynamicRedirect = req.query['redirect_uri'];
  
  // Incluyo tanto el github-user como el redirect_uri dinámico en el state
  const stateData = { 
    githubUser,
    redirectUri: dynamicRedirect || null // El sitio web al que regresar
  };
  
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
  
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=read:user read:org read:sponsorships&state=${encodeURIComponent(state)}`;

  res.writeHead(302, { Location: url });
  res.end();
}