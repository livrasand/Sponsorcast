export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Eliminar la cookie del creador
    res.setHeader('Set-Cookie', 
      'creator_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
