const ENC_KEY_HEX = process.env.ENCRYPTION_KEY;

function getKeyBuffer(): ArrayBuffer {
  if (!ENC_KEY_HEX) {
    throw new Error("Missing ENCRYPTION_KEY env var");
  }
  const bytes = new Uint8Array(ENC_KEY_HEX.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  // Ensure we pass the exact ArrayBuffer slice backing the view
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function encryptToBase64(plainText: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    getKeyBuffer(),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  const combined = new Uint8Array(iv.byteLength + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.byteLength);
  return Buffer.from(combined).toString("base64");
}

export async function decryptFromBase64(cipherB64: string): Promise<string> {
  const data = Buffer.from(cipherB64, "base64");
  const iv = data.slice(0, 12);
  const cipherBytes = data.slice(12);
  const key = await crypto.subtle.importKey(
    "raw",
    getKeyBuffer(),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(cipherBytes)
  );
  return new TextDecoder().decode(plainBuf);
}


