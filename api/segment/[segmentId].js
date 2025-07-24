import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { segmentId } = req.query;
  const token = req.cookies?.sponsor_token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sponsor) throw new Error('Unauthorized');

    const segmentPath = path.resolve(`./videos/fragments/${segmentId}.ts`);
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
