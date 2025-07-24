import jwt from 'jsonwebtoken';

export default function handler(req, res) {
  const token = req.cookies?.sponsor_token;
  const githubUser = req.query['github-user'] || process.env.GITHUB_USER;

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar si el token es válido y para el usuario correcto
    if (decoded.sponsor && decoded.githubUser === githubUser) {
      return res.status(200).json({ 
        valid: true, 
        githubUser: decoded.githubUser,
        expiresAt: decoded.exp 
      });
    }
    
    throw new Error('Invalid token or unauthorized user');
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
