/**
 * lib/crypto.ts — AES-256-GCM encrypt/decrypt helpers for connection credentials.
 *
 * Format: `<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * Key source: CONNECTIONS_ENCRYPTION_KEY env var (32-byte hex = 64 hex chars).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(keyHex?: string): Buffer {
  const hex = keyHex ?? process.env.CONNECTIONS_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      'CONNECTIONS_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32',
    );
  }
  if (hex.length !== 64) {
    throw new Error('CONNECTIONS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encrypt(plaintext: string, keyHex?: string): string {
  const key = getKey(keyHex);
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a string produced by `encrypt`.
 * Expects `iv:authTag:ciphertext` (all hex-encoded).
 */
export function decrypt(ciphertext: string, keyHex?: string): string {
  const key = getKey(keyHex);
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format. Expected iv:authTag:ciphertext.');
  }
  const [ivHex, authTagHex, encHex] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
