/**
 * Fail-closed secret access.
 *
 * Replaces the insecure `process.env.AUTH_SECRET ?? "fallback-secret"` pattern.
 * If AUTH_SECRET is missing or too short we throw rather than silently signing
 * and verifying tokens with a publicly-known fallback key (which would let
 * anyone mint a valid staff/chef/admin token).
 */

const MIN_SECRET_LENGTH = 32;

let cachedKey: Uint8Array | null = null;

function readAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters. ` +
        "Refusing to run with an insecure fallback secret. Set a strong AUTH_SECRET."
    );
  }
  return secret;
}

/**
 * The AUTH_SECRET encoded for jose HS256 sign/verify. Fails closed.
 * Cached after first successful read.
 */
export function getAuthSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  cachedKey = new TextEncoder().encode(readAuthSecret());
  return cachedKey;
}
