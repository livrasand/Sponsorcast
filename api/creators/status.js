import jwt from 'jsonwebtoken';
import { getCreator } from '../../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies?.creator_token;
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.creator || !decoded.username) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    // Obtener información actualizada del creador
    const creator = await getCreator(decoded.username);
    
    if (!creator) {
      return res.status(401).json({ success: false, error: 'Creator not found' });
    }

    res.status(200).json({
      success: true,
      creator: {
        username: creator.username,
        email: creator.email,
        created_at: creator.created_at
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}
