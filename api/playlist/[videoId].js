import jwt from 'jsonwebtoken';
import { getSignedVideoUrl } from '../../lib/r2-client.js';

export default async function handler(req, res) {
  const { videoId } = req.query;
  const token = req.cookies?.sponsor_token;

  try {
    // Verificar autenticación
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sponsor) {
      throw new Error('Unauthorized');
    }

    // Obtener el manifest desde R2
    try {
      const manifestUrl = await getSignedVideoUrl(videoId, 'playlist.m3u8', 300); // 5 minutos
      const response = await fetch(manifestUrl);
      
      if (!response.ok) {
        console.error(`Failed to fetch manifest: ${response.status}`);
        return res.status(404).json({ error: 'Video not found' });
      }

      let manifest = await response.text();
      
      // Reemplazar las URLs de los segmentos para que apunten a nuestro endpoint
      manifest = manifest.replace(
        /^(segment_\d+\.ts)$/gm, 
        `${req.headers.origin || process.env.HOST}/api/segment/${videoId}/$1`
      );

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
      
      return res.status(200).send(manifest);
      
    } catch (fetchError) {
      console.error('Error fetching from R2:', fetchError);
      return res.status(500).json({ error: 'Failed to load video manifest' });
    }

  } catch (authError) {
    console.error('Auth error:', authError);
    return res.status(403).json({ error: 'Unauthorized' });
  }
}