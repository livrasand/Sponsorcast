import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';

// Crear o actualizar un creador
export async function createCreator(creatorData) {
  const { username, email, pat_token, password } = creatorData;
  
  try {
    // Verificar si el creador ya existe
    const existingCreator = await getCreator(username);
    if (existingCreator) {
      throw new Error('Creator already exists');
    }

    // Encriptar el PAT y password
    const encryptedPat = encryptPAT(pat_token);
    const hashedPassword = await bcrypt.hash(password, 12);

    const creator = {
      username,
      email,
      pat_token: encryptedPat,
      password: hashedPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Guardar en KV
    await kv.set(`creator:${username}`, creator);
    
    // Agregar a la lista de creadores
    const creators = await kv.get('creators_list') || [];
    creators.push(username);
    await kv.set('creators_list', creators);

    return { success: true, creator: { username, email, created_at: creator.created_at } };
  } catch (error) {
    console.error('Error creating creator:', error);
    return { success: false, error: error.message };
  }
}

// Obtener un creador por username
export async function getCreator(username) {
  try {
    const creator = await kv.get(`creator:${username}`);
    return creator;
  } catch (error) {
    console.error('Error getting creator:', error);
    return null;
  }
}

// Autenticar un creador
export async function authenticateCreator(username, password) {
  try {
    const creator = await getCreator(username);
    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    const isValidPassword = await bcrypt.compare(password, creator.password);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password' };
    }

    return { 
      success: true, 
      creator: { 
        username: creator.username, 
        email: creator.email,
        created_at: creator.created_at
      } 
    };
  } catch (error) {
    console.error('Error authenticating creator:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

// Para seguridad, vamos a almacenar PATs de forma diferente
// Usaremos encriptación simple con la clave JWT_SECRET
function encryptPAT(pat) {
  // Encriptación simple usando Buffer y JWT_SECRET
  const secret = process.env.JWT_SECRET || 'default-secret';
  const combined = pat + secret;
  return Buffer.from(combined).toString('base64');
}

function decryptPAT(encryptedPat) {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const combined = Buffer.from(encryptedPat, 'base64').toString();
    return combined.replace(secret, '');
  } catch (error) {
    console.error('Error decrypting PAT:', error);
    return null;
  }
}

// Obtener el PAT desencriptado de un creador (solo para uso interno)
export async function getCreatorPAT(username) {
  try {
    const creator = await getCreator(username);
    if (!creator) {
      return null;
    }

    return decryptPAT(creator.pat_token);
  } catch (error) {
    console.error('Error getting creator PAT:', error);
    return null;
  }
}

// Actualizar PAT de un creador
export async function updateCreatorPAT(username, newPat) {
  try {
    const creator = await getCreator(username);
    if (!creator) {
      return { success: false, error: 'Creator not found' };
    }

    const encryptedPat = encryptPAT(newPat);
    creator.pat_token = encryptedPat;
    creator.updated_at = new Date().toISOString();

    await kv.set(`creator:${username}`, creator);
    return { success: true };
  } catch (error) {
    console.error('Error updating creator PAT:', error);
    return { success: false, error: error.message };
  }
}

// Obtener lista de todos los creadores
export async function getAllCreators() {
  try {
    const creatorsList = await kv.get('creators_list') || [];
    const creators = [];

    for (const username of creatorsList) {
      const creator = await getCreator(username);
      if (creator) {
        creators.push({
          username: creator.username,
          email: creator.email,
          created_at: creator.created_at,
          updated_at: creator.updated_at
        });
      }
    }

    return creators;
  } catch (error) {
    console.error('Error getting all creators:', error);
    return [];
  }
}
