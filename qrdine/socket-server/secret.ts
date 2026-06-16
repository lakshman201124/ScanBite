/**
 * Fail-closed secret access for the standalone Socket.IO server.
 *
 * Mirror of qrdine/lib/secret.ts — the socket server is a separate runtime
 * compiled without the Next.js "@/" path alias, so it can't import from lib/.
 * If AUTH_SECRET is missing or too short we throw rather than verifying socket
 * tokens with a publicly-known fallback key.
 */

const MIN_SECRET_LENGTH = 32;

let cachedKey: Uint8Array | null = null;

function readAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters. ` +
        "Refusing to run the socket server with an insecure fallback secret."
    );
  }
  return secret;
}

export function getAuthSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  cachedKey = new TextEncoder().encode(readAuthSecret());
  return cachedKey;
}
