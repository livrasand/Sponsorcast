import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default function handler(req, res) {
  const { segmentId } = req.query;
  const token = req.cookies?.sponsor_token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sponsor) throw new Error('Unauthorized');

    // Usar el mismo directorio temporal que upload-hls.js
    const uploadRoot = path.join(os.tmpdir(), 'sponsorcast-uploads');
    
    // El segmentId puede venir en formato "videoId/segment.ts" o solo "segment.ts"
    let segmentPath;
    if (segmentId.includes('/')) {
      // Si ya incluye el path completo
      segmentPath = path.join(uploadRoot, segmentId);
    } else {
      // Buscar en el directorio de fragmentos (mantenemos compatibilidad)
      segmentPath = path.join(uploadRoot, 'fragments', segmentId);
      
      // Si no existe en fragments, buscar en subdirectorios
      if (!fs.existsSync(segmentPath)) {
        // Buscar el archivo .ts en todos los subdirectorios
        const directories = fs.readdirSync(uploadRoot, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const dir of directories) {
          const candidatePath = path.join(uploadRoot, dir, segmentId);
          if (fs.existsSync(candidatePath)) {
            segmentPath = candidatePath;
            break;
          }
        }
      }
    }
    if (!fs.existsSync(segmentPath)) {
      return res.status(404).send('Segment not found');
    }

    const stream = fs.createReadStream(segmentPath);
    res.setHeader('Content-Type', 'video/MP2T');
    stream.pipe(res);
  } catch (err) {
    return res.status(403).send('Unauthorized');
  }
}
