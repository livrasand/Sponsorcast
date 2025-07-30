// api/upload-hls.js
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createId } from '@paralleldrive/cuid2';
import { uploadToR2 } from '../lib/r2-client.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uploadRoot = path.join(os.tmpdir(), 'sponsorcast-uploads');
    if (!fs.existsSync(uploadRoot)) {
      fs.mkdirSync(uploadRoot, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadRoot,
      keepExtensions: true,
      multiples: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB
    });

    const [fields, files] = await form.parse(req);
    const videoId = fields.videoId?.[0] || createId();
    const githubUser = fields.githubUser?.[0] || process.env.GITHUB_USER;

    const uploadedFiles = [];
    let hasManifest = false;

    for (const [fieldName, fileArray] of Object.entries(files)) {
      const fileList = Array.isArray(fileArray) ? fileArray : [fileArray];

      for (const file of fileList) {
        const filename = file.originalFilename || file.newFilename;
        const buffer = fs.readFileSync(file.filepath);

        const contentType = filename.endsWith('.m3u8')
          ? 'application/vnd.apple.mpegurl'
          : filename.endsWith('.ts')
            ? 'video/MP2T'
            : 'application/octet-stream';

        const publicUrl = await uploadToR2(videoId, filename, buffer, contentType);

        if (filename.endsWith('.m3u8')) {
          hasManifest = true;
        }

        uploadedFiles.push({
          fieldName,
          originalName: file.originalFilename,
          filename,
          size: file.size,
          url: publicUrl
        });

        fs.unlinkSync(file.filepath);
      }
    }

    if (!hasManifest) {
      return res.status(400).json({
        success: false,
        error: 'No playlist.m3u8 file found in uploaded files'
      });
    }

    // Crear metadata
    const metadata = {
      id: videoId,
      githubUser,
      uploadedAt: new Date().toISOString(),
      files: uploadedFiles,
      totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0)
    };

    await uploadToR2(videoId, 'metadata.json', JSON.stringify(metadata, null, 2), 'application/json');

    res.status(200).json({
      success: true,
      videoId,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles.map(f => ({ name: f.filename, size: f.size })),
      playUrl: `${req.headers.origin || process.env.HOST}/api/playlist/${videoId}`,
      embedCode: `<sponsor-cast src="${videoId}" github-user="${githubUser}"></sponsor-cast>`,
      totalSize: metadata.totalSize
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
}