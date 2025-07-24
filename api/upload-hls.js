import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';

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
    const uploadRoot = path.join(process.cwd(), 'v');

    // Verifica si la carpeta raíz existe, si no la crea
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

    // Crear directorio para el video
    const videoDir = path.join(uploadRoot, videoId);
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    const uploadedFiles = [];
    let hasManifest = false;

    // Procesar archivos subidos
    for (const [fieldName, fileArray] of Object.entries(files)) {
      const fileList = Array.isArray(fileArray) ? fileArray : [fileArray];
      
      for (const file of fileList) {
        const filename = file.originalFilename || file.newFilename;
        const finalPath = path.join(videoDir, filename);
        
        // Mover archivo al directorio final
        fs.renameSync(file.filepath, finalPath);
        
        if (filename.endsWith('.m3u8')) {
          hasManifest = true;
        }
        
        uploadedFiles.push({
          fieldName,
          originalName: file.originalFilename,
          filename,
          size: file.size,
          path: finalPath
        });
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

    // Guardar metadata
    fs.writeFileSync(
      path.join(videoDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    res.status(200).json({
      success: true,
      videoId,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles.map(f => ({ name: f.filename, size: f.size })),
      playUrl: `${req.headers.origin || process.env.HOST}/api/playlist/${videoId}`,
      embedCode: `<sponsor-cast src="${videoId}" github-user="${githubUser}"></sponsor-cast>`
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
}
