import { getSignedVideoUrl } from '../../lib/r2-client.js';

export default async function handler(req, res) {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ 
      exists: false, 
      error: 'Video ID is required' 
    });
  }

  try {
    // Intentar acceder al metadata del video
    const metadataUrl = await getSignedVideoUrl(videoId, 'metadata.json', 60);
    const response = await fetch(metadataUrl);
    
    if (response.ok) {
      const metadata = await response.json();
      return res.status(200).json({ 
        exists: true, 
        videoId,
        uploadedAt: metadata.uploadedAt,
        filesCount: metadata.files?.length || 0,
        totalSize: metadata.totalSize || 0,
        githubUser: metadata.githubUser
      });
    } else {
      return res.status(200).json({ 
        exists: false, 
        videoId,
        error: 'Video not found'
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(200).json({ 
      exists: false, 
      videoId, 
      error: error.message 
    });
  }
}