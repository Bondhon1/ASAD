import crypto from 'crypto';

const ENCRYPTION_KEY_BASE64 = process.env.ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

/**
 * Get the encryption key as a Buffer (decoded from Base64)
 */
function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY_BASE64) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  const key = Buffer.from(ENCRYPTION_KEY_BASE64, 'base64');
  
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must be exactly 32 bytes when decoded. Got ${key.length} bytes. Generate with: openssl rand -base64 32`);
  }
  
  return key;
}

/**
 * Encrypt sensitive data (like refresh tokens)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a random encryption key (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex').substring(0, 32);
}
