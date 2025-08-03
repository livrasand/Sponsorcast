import jwt from 'jsonwebtoken';
import { applyCORS } from '../lib/cors.js';

export default function handler(req, res) {
  if (applyCORS(req, res)) return;
  
  const githubUser = req.query['github-user'] || process.env.GITHUB_USER;
  
  // Método 1: Verificar token Bearer en header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    return validateToken(res, token, githubUser);
  }

  // Método 2: Verificar token en cookie (método legacy)
  const cookieToken = req.cookies?.sponsor_token;
  if (cookieToken) {
    return validateToken(res, cookieToken, githubUser);
  }

  // Método 3: Verificar token en query parameter (para compatibilidad)
  const queryToken = req.query.token;
  if (queryToken) {
    return validateToken(res, queryToken, githubUser);
  }

  // Sin token válido
  return res.status(401).json({ 
    error: 'No authentication token provided',
    methods: ['Authorization: Bearer <token>', 'Cookie: sponsor_token', 'Query: ?token=<token>']
  });
}

/**
 * Valida un token JWT y verifica autorización
 */
function validateToken(res, token, githubUser) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'sponsorcast',
      audience: 'session'
    });
    
    // Verificar que es un token de sponsor válido
    if (!decoded.sponsor) {
      throw new Error('Invalid token type');
    }

    // Verificar que el token es para el usuario correcto
    if (decoded.githubUser.toLowerCase() !== githubUser.toLowerCase()) {
      throw new Error('Token is for different GitHub user');
    }

    // Verificar que no ha expirado (adicional a la verificación JWT)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token has expired');
    }

    // Token válido - devolver información de autorización
    return res.status(200).json({ 
      valid: true,
      authorized: true,
      githubUser: decoded.githubUser,
      visitorLogin: decoded.visitorLogin,
      visitorName: decoded.visitorName || null,
      isOwner: decoded.isOwner || false,
      expiresAt: decoded.exp,
      issuedAt: decoded.iat,
      tokenAge: now - decoded.iat
    });
    
  } catch (error) {
    console.error('Token validation failed:', error.message);
    
    // Determinar el tipo específico de error
    let errorCode = 'invalid_token';
    let errorMessage = 'Invalid or expired token';
    
    if (error.name === 'TokenExpiredError') {
      errorCode = 'token_expired';
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'malformed_token';
      errorMessage = 'Malformed token';
    } else if (error.message.includes('different GitHub user')) {
      errorCode = 'wrong_user';
      errorMessage = `Token is not valid for user @${githubUser}`;
    } else if (error.message.includes('Invalid token type')) {
      errorCode = 'invalid_token_type';
      errorMessage = 'Token is not a valid sponsor session token';
    }

    return res.status(403).json({ 
      error: errorMessage,
      code: errorCode,
      valid: false,
      authorized: false
    });
  }
}