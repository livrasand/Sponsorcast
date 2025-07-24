import formidable from 'formidable';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();
  form.uploadDir = './uploads';
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err || !files.video) {
      return res.status(400).json({ error: 'No video uploaded' });
    }

    const inputPath = files.video.filepath;
    const videoId = path.basename(inputPath, path.extname(inputPath));
    const outputDir = `./videos/${videoId}`;
    fs.mkdirSync(outputDir, { recursive: true });

    const ffmpegArgs = [
      '-i', inputPath,
      '-codec:', 'copy',
      '-start_number', '0',
      '-hls_time', '5',
      '-hls_list_size', '0',
      '-f', 'hls',
      `${outputDir}/playlist.m3u8`
    ];

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.stderr.on('data', data => console.error(data.toString()));
    ffmpeg.on('exit', code => {
      if (code === 0) {
        res.status(200).json({ videoId });
      } else {
        res.status(500).json({ error: 'ffmpeg failed' });
      }
    });
  });
}
