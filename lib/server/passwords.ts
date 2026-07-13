import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { getEnv } from "@/lib/env";

const scrypt = promisify(nodeScrypt);
const keyLength = 64;
const cost = 32768;
const blockSize = 8;
const parallelization = 1;
const maxmem = 64 * 1024 * 1024;

function passwordInput(password: string) {
  return `${password}:${getEnv().PASSWORD_PEPPER}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(passwordInput(password), salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem,
  })) as Buffer;

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltText, hashText] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    !n ||
    !r ||
    !p ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  const expected = Buffer.from(hashText, "base64url");
  const actual = (await scrypt(
    passwordInput(password),
    Buffer.from(saltText, "base64url"),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem,
    },
  )) as Buffer;

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
