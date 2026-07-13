import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

import { getEnv } from "@/lib/env";

const keyLength = 64;
const options: ScryptOptions = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function passwordInput(password: string) {
  return `${password}:${getEnv().PASSWORD_PEPPER}`;
}

function deriveKey(
  input: string,
  salt: Buffer,
  length: number,
  deriveOptions: ScryptOptions,
) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(input, salt, length, deriveOptions, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await deriveKey(
    passwordInput(password),
    salt,
    keyLength,
    options,
  );

  return [
    "scrypt",
    options.N,
    options.r,
    options.p,
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
  const actual = await deriveKey(
    passwordInput(password),
    Buffer.from(saltText, "base64url"),
    expected.length,
    {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: options.maxmem,
    },
  );

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
