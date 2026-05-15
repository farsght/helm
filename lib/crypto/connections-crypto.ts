/**
 * lib/crypto/connections-crypto.ts — AES-256-GCM envelope encryption for
 * connection secrets.
 *
 * Envelope stored as a JSON string in `connections.secret_ciphertext`:
 *   { "v": 1, "alg": "aes-256-gcm", "iv": "<base64>", "ct": "<base64>", "tag": "<base64>" }
 *
 * Key env var: CONNECTIONS_ENCRYPTION_KEY
 *   Format: base64-encoded 32-byte key (44 chars with padding, or 43 without).
 *   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Runtime rules:
 *   - Missing/invalid key => hard error; never silently fall back
 *   - Never log plaintext secrets
 *   - Decrypt only in trusted server paths
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALG = 'aes-256-gcm' as const;
const VERSION = 1;

interface SecretEnvelope {
  v: number;
  alg: typeof ALG;
  iv: string;  // base64
  ct: string;  // base64
  tag: string; // base64
}

function getKey(): Buffer {
  const b64 = process.env.CONNECTIONS_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      '[connections-crypto] CONNECTIONS_ENCRYPTION_KEY is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `[connections-crypto] CONNECTIONS_ENCRYPTION_KEY must decode to exactly 32 bytes, got ${key.length}.`,
    );
  }
  return key;
}

/**
 * Encrypt a plaintext string. Returns the JSON envelope as a string,
 * ready to store in `connections.secret_ciphertext`.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope: SecretEnvelope = {
    v: VERSION,
    alg: ALG,
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: tag.toString('base64'),
  };
  return JSON.stringify(envelope);
}

/**
 * Decrypt a ciphertext string produced by `encryptSecret`.
 * Expects the JSON envelope format.
 */
export function decryptSecret(ciphertext: string): string {
  const key = getKey();

  let envelope: SecretEnvelope;
  try {
    envelope = JSON.parse(ciphertext) as SecretEnvelope;
  } catch {
    throw new Error('[connections-crypto] secret_ciphertext is not valid JSON');
  }

  if (envelope.v !== VERSION || envelope.alg !== ALG) {
    throw new Error(
      `[connections-crypto] Unsupported envelope version/algorithm: v=${envelope.v} alg=${envelope.alg}`,
    );
  }

  const iv = Buffer.from(envelope.iv, 'base64');
  const ct = Buffer.from(envelope.ct, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');

  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ct).toString('utf8') + decipher.final('utf8');
}
