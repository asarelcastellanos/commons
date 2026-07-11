/**
 * Password hashing for the portable auth default. Uses scrypt from Node's built-in
 * `node:crypto` — memory-hard, OWASP-acceptable, and crucially DEPENDENCY-FREE, so there is
 * no native module to compile (the same reason the project runs Node 24 LTS). A hosted
 * deployment may swap in argon2/bcrypt behind these same two functions.
 *
 * Stored format: `scrypt$<salt-hex>$<hash-hex>`. The leading tag lets us change algorithm
 * later without ever misreading an old hash.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

/** Hash a plaintext password into a self-describing `scrypt$salt$hash` string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Constant-time check of a plaintext password against a stored `scrypt$salt$hash` string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [tag, saltHex, hashHex] = stored.split("$");
  if (tag !== "scrypt" || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}
