let cachedKey: CryptoKey | null = null;
let cachedKeyRaw: string | null = null;

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveKey(encryptionKey: string): Promise<CryptoKey> {
  if (cachedKey && cachedKeyRaw === encryptionKey) {
    return cachedKey;
  }

  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(encryptionKey),
  );

  cachedKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  cachedKeyRaw = encryptionKey;
  return cachedKey;
}

export async function encrypt(
  text: string,
  encryptionKey: string,
): Promise<string> {
  const key = await deriveKey(encryptionKey);
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const encoded = new TextEncoder().encode(text);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    encoded,
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const authTag = encryptedBytes.slice(-16);
  const ciphertext = encryptedBytes.slice(0, -16);

  return `${bufferToHex(iv.buffer)}:${bufferToHex(authTag.buffer)}:${bufferToHex(ciphertext.buffer)}`;
}

export async function decrypt(
  encryptedText: string,
  encryptionKey: string,
): Promise<string> {
  const parts = encryptedText.split(":");
  if (parts.length < 3) {
    throw new Error("Invalid encrypted payload format");
  }

  const [ivHex, authTagHex, ...rest] = parts;
  const ciphertextHex = rest.join(":");

  const iv = hexToBuffer(ivHex);
  const authTag = hexToBuffer(authTagHex);
  const ciphertext = hexToBuffer(ciphertextHex);

  const combined = new Uint8Array([
    ...new Uint8Array(ciphertext),
    ...new Uint8Array(authTag),
  ]);

  const key = await deriveKey(encryptionKey);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    key,
    combined,
  );

  return new TextDecoder().decode(decrypted);
}

export function isEncrypted(text: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]{32}:/i.test(text);
}
