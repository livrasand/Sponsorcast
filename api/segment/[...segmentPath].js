import jwt from 'jsonwebtoken';
import { getSignedVideoUrl } from '../../lib/r2-client.js';

export default async function handler(req, res) {
  const { segmentPath } = req.query;
  const token = req.cookies?.sponsor_token;

  try {
    // Verificar autenticación
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sponsor) {
      throw new Error('Unauthorized');
    }

    // segmentPath será un array como ["videoId", "segment_001.ts"]
    if (!Array.isArray(segmentPath) || segmentPath.length !== 2) {
      return res.status(400).json({ error: 'Invalid segment path' });
    }

    const [videoId, segmentName] = segmentPath;

    // Validar que el segmentName sea válido
    if (!segmentName.match(/^segment_\d+\.ts$/)) {
      return res.status(400).json({ error: 'Invalid segment name' });
    }

    try {
      // Obtener URL firmada del segmento desde R2
      const segmentUrl = await getSignedVideoUrl(videoId, segmentName, 300); // 5 minutos
      const response = await fetch(segmentUrl);
      
      if (!response.ok) {
        console.error(`Failed to fetch segment: ${response.status}`);
        return res.status(404).json({ error: 'Segment not found' });
      }

      const segmentBuffer = await response.arrayBuffer();

      res.setHeader('Content-Type', 'video/MP2T');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año, los segmentos no cambian
      res.setHeader('Content-Length', segmentBuffer.byteLength);

      return res.status(200).send(Buffer.from(segmentBuffer));

    } catch (fetchError) {
      console.error('Error fetching segment from R2:', fetchError);
      return res.status(500).json({ error: 'Failed to load video segment' });
    }

  } catch (authError) {
    console.error('Auth error:', authError);
    return res.status(403).json({ error: 'Unauthorized' });
  }
}