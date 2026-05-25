import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const buf = (await scryptAsync(pin, salt, 64)) as Buffer;
  const keyBuf = Buffer.from(key, "hex");
  if (buf.length !== keyBuf.length) return false;
  return timingSafeEqual(buf, keyBuf);
}
