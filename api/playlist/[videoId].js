import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { videoId } = req.query;
  const token = req.cookies?.sponsor_token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sponsor) throw new Error('Unauthorized');

    const filePath = path.resolve(`./videos/${videoId}/playlist.m3u8`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Manifest not found');
    }

    const manifest = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.status(200).send(manifest);
  } catch (err) {
    return res.status(403).send('Unauthorized');
  }
}
