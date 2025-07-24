import { createCreator } from '../../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, pat_token, password } = req.body;

  // Validaciones básicas
  if (!username || !email || !pat_token || !password) {
    return res.status(400).json({ 
      error: 'Missing required fields: username, email, pat_token, password' 
    });
  }

  // Validar formato del PAT (debe empezar con ghp_)
  if (!pat_token.startsWith('ghp_')) {
    return res.status(400).json({ 
      error: 'Invalid PAT format. GitHub PATs should start with "ghp_"' 
    });
  }

  // Validar longitud mínima del password
  if (password.length < 8) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters long' 
    });
  }

  try {
    const result = await createCreator({
      username: username.toLowerCase(),
      email,
      pat_token,
      password
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Creator registered successfully',
        creator: result.creator
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
