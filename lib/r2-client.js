// lib/r2-client.js
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: data,
    ContentType: contentType,
    ACL: 'public-read' // opcional, dependiendo si quieres que los archivos sean accesibles públicamente
  });

  await s3.send(command);
  return getPublicUrl(videoId, filename);
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
 * Opcional: Generar URL firmada con expiración para archivos privados
 */
export async function getSignedVideoUrl(videoId, filename, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: `${videoId}/${filename}`
  });

  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Utilidad para subir desde archivo local
 */
export async function uploadLocalFile(videoId, filepath, contentType) {
  const filename = path.basename(filepath);
  const data = fs.readFileSync(filepath);
  return await uploadToR2(videoId, filename, data, contentType);
}
