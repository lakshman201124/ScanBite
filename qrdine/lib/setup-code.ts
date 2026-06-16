/**
 * Staff onboarding via one-time setup codes (Q4 / §2.1a of the build plan).
 *
 * Flow: admin creates a staff record (name + role only) and issues a single-use
 * setup code, handed over in person. The staff member redeems it to set their own
 * PIN — the admin never learns the PIN. No SMS/email is involved.
 *
 * Setup codes are hashed at rest with the same scrypt KDF used for PINs
 * (lib/pin.ts), are single-use, and expire after 24h. Redemption is rate-limited
 * per restaurant (see rateLimiters.setupRedeem).
 */
import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { hashPin, verifyPin } from "@/lib/pin";

const SETUP_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SETUP_CODE_LENGTH = 8;
// Unambiguous alphabet — no I/L/O/0/1 so a code read aloud can't be mistyped.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateSetupCode(length = SETUP_CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/**
 * Generate a fresh setup code for a staff user, store its hash + expiry on the
 * user row, and return the PLAINTEXT code (shown to the admin exactly once).
 */
export async function issueSetupCode(userId: string): Promise<string> {
  const code = generateSetupCode();
  const hash = await hashPin(code);
  await prisma.user.update({
    where: { id: userId },
    data: {
      setup_code_hash: hash,
      setup_code_expires_at: new Date(Date.now() + SETUP_CODE_TTL_MS),
    },
  });
  return code;
}

export type PendingStaff = { id: string; name: string; role: string };

/**
 * Resolve a setup code to the staff user it belongs to, scoped to one restaurant.
 * Scans only users in that restaurant with a live (non-expired) pending code and
 * constant-time compares each — the set is tiny and the route is rate-limited.
 * Returns null if no valid match.
 */
export async function findUserBySetupCode(
  restaurantId: string,
  code: string
): Promise<PendingStaff | null> {
  const candidates = await prisma.user.findMany({
    where: {
      restaurant_id: restaurantId,
      role: { in: ["chef", "waiter"] },
      setup_code_hash: { not: null },
      setup_code_expires_at: { gt: new Date() },
    },
    select: { id: true, name: true, role: true, setup_code_hash: true },
  });

  for (const c of candidates) {
    if (c.setup_code_hash && (await verifyPin(code, c.setup_code_hash))) {
      return { id: c.id, name: c.name, role: c.role };
    }
  }
  return null;
}
