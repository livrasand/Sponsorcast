import jwt from 'jsonwebtoken';
import { authenticateCreator } from '../../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Missing required fields: username, password' 
    });
  }

  try {
    const result = await authenticateCreator(username.toLowerCase(), password);

    if (result.success) {
      // Crear JWT para el creador
      const token = jwt.sign(
        { 
          creator: true,
          username: result.creator.username,
          timestamp: Date.now()
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );

      // Establecer cookie
      res.setHeader('Set-Cookie', 
        `creator_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        creator: result.creator,
        token
      });
    } else {
      res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
