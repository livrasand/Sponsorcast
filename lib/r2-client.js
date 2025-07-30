// lib/r2-client.js
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

const REGION = 'auto'; // Cloudflare R2 no usa regiones como AWS
const BUCKET = process.env.R2_BUCKET_NAME;

const s3 = new S3Client({
  region: REGION,
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

/**
 * Sube un archivo al bucket R2.
 * @param {string} videoId - ID del video (sirve como prefijo/ruta)
 * @param {string} filename - Nombre del archivo (ej: playlist.m3u8)
 * @param {Buffer|string} data - Contenido del archivo
 * @param {string} contentType - Tipo MIME (ej: video/MP2T o application/vnd.apple.mpegurl)
 */
export async function uploadToR2(videoId, filename, data, contentType = 'application/octet-stream') {
  const key = `${videoId}/${filename}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
      // R2 no soporta ACL en la API S3, pero se puede configurar a nivel bucket
    });

    await s3.send(command);
    console.log(`✅ Uploaded ${key} to R2 (${data.length} bytes)`);
    return getPublicUrl(videoId, filename);
  } catch (error) {
    console.error(`❌ Failed to upload ${key} to R2:`, error);
    throw new Error(`Failed to upload ${filename}: ${error.message}`);
  }
}

/**
 * Devuelve la URL pública del archivo en R2
 * @param {string} videoId 
 * @param {string} filename 
 * @returns {string}
 */
export function getPublicUrl(videoId, filename) {
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${videoId}/${filename}`;
}

/**
 * Generar URL firmada con expiración para archivos privados
 */
export async function getSignedVideoUrl(videoId, filename, expiresInSeconds = 3600) {
  const key = `${videoId}/${filename}`;
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    console.log(`📝 Generated signed URL for ${key} (expires in ${expiresInSeconds}s)`);
    return signedUrl;
  } catch (error) {
    console.error(`❌ Failed to generate signed URL for ${key}:`, error);
    throw new Error(`Failed to generate signed URL for ${filename}: ${error.message}`);
  }
}

/**
 * Verificar si un archivo existe en R2
 */
export async function fileExists(videoId, filename) {
  const key = `${videoId}/${filename}`;
  
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    await s3.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error(`❌ Error checking if ${key} exists:`, error);
    throw error;
  }
}

/**
 * Utilidad para subir desde archivo local
 */
export async function uploadLocalFile(videoId, filepath, contentType) {
  const filename = path.basename(filepath);
  const data = fs.readFileSync(filepath);
  return await uploadToR2(videoId, filename, data, contentType);
}

/**
 * Obtener metadatos de un archivo
 */
export async function getFileMetadata(videoId, filename) {
  const key = `${videoId}/${filename}`;
  
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key
    });

    const response = await s3.send(command);
    return {
      size: response.ContentLength,
      lastModified: response.LastModified,
      contentType: response.ContentType,
      etag: response.ETag
    };
  } catch (error) {
    console.error(`❌ Failed to get metadata for ${key}:`, error);
    throw new Error(`Failed to get metadata for ${filename}: ${error.message}`);
  }
}