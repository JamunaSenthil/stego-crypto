/**
 * CryptoManager — Handles encryption and decryption with PBKDF2-HMAC-SHA256 and AES-256-GCM.
 * Replicates the robust authenticated security design from SecureGuard AI stego-crypto.
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 100_000;

export class CryptoManager {
  /**
   * Derive an AES-GCM key from password and salt using PBKDF2 with SHA-256
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts plaintext data with password.
   * Output structure: [16-byte random salt] + [12-byte random IV] + [AES-GCM ciphertext + 16-byte tag]
   */
  public static async encrypt(data: Uint8Array | string, password: string): Promise<Uint8Array> {
    const rawData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await this.deriveKey(password, salt);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      rawData as BufferSource
    );

    const ciphertext = new Uint8Array(ciphertextBuffer);
    const result = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.length);
    result.set(salt, 0);
    result.set(iv, SALT_LENGTH);
    result.set(ciphertext, SALT_LENGTH + IV_LENGTH);

    return result;
  }

  /**
   * Decrypts payload with password.
   * Expects: [16-byte salt] + [12-byte IV] + [ciphertext]
   * Throws Error if password is wrong or payload is corrupted.
   */
  public static async decrypt(encryptedData: Uint8Array, password: string): Promise<Uint8Array> {
    if (encryptedData.length < SALT_LENGTH + IV_LENGTH + 16) {
      throw new Error('Payload too short — not a valid encrypted bundle.');
    }

    const salt = encryptedData.slice(0, SALT_LENGTH);
    const iv = encryptedData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = encryptedData.slice(SALT_LENGTH + IV_LENGTH);

    try {
      const key = await this.deriveKey(password, salt);
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        ciphertext as BufferSource
      );
      return new Uint8Array(decryptedBuffer);
    } catch {
      throw new Error('Invalid password or corrupted authentication tag.');
    }
  }

  /**
   * Wrap multiple independently-encrypted slots into a multislot JSON container
   */
  public static wrapMultislot(slotBlobs: Uint8Array[]): Uint8Array {
    const wrapper = {
      format: 'multislot',
      version: 2,
      slots: slotBlobs.map(b => this.bytesToBase64(b)),
    };
    return new TextEncoder().encode(JSON.stringify(wrapper));
  }

  /**
   * Extract individual slot byte arrays from a multislot container (or single slot)
   */
  public static extractSlots(rawBytes: Uint8Array): Uint8Array[] {
    try {
      const text = new TextDecoder().decode(rawBytes);
      const parsed = JSON.parse(text);
      if (parsed && parsed.format === 'multislot' && Array.isArray(parsed.slots)) {
        return parsed.slots.map((s: string) => this.base64ToBytes(s));
      }
    } catch {
      // Not JSON, treat as single raw encrypted slot
    }
    return [rawBytes];
  }

  /**
   * Convert bytes to Base64
   */
  public static bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to bytes
   */
  public static base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
