export default function handler(req, res) {
  const client_id = process.env.GITHUB_CLIENT_ID;
  const githubUser = req.query['github-user'] || process.env.GITHUB_USER;
  const redirect_uri = `${process.env.HOST || 'http://localhost:3000'}/api/callback`;

  // Incluir el github-user en el state para pasarlo al callback
  const state = Buffer.from(JSON.stringify({ githubUser })).toString('base64');
  
  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=read:user read:org&state=${encodeURIComponent(state)}`;

  res.writeHead(302, { Location: url });
  res.end();
}
