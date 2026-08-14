import { z } from "zod";

export {
  MEMBERSHIP_RENEWAL_TERMS_VERSION,
  PICKUP_AGE_ATTESTATION_VERSION,
  PRIVACY_POLICY_VERSION,
  VENDOR_COMPLIANCE_VERSION,
} from "@/lib/compliance-versions";
import {
  MEMBERSHIP_RENEWAL_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
} from "@/lib/compliance-versions";

function parseIsoBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isAtLeast21(dateOfBirth: string, now = new Date()) {
  const birthDate = parseIsoBirthDate(dateOfBirth);
  if (!birthDate || birthDate.year < 1900) return false;

  const today = {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };
  if (
    birthDate.year > today.year ||
    (birthDate.year === today.year &&
      (birthDate.month > today.month ||
        (birthDate.month === today.month && birthDate.day > today.day)))
  ) {
    return false;
  }

  const age =
    today.year -
    birthDate.year -
    (today.month < birthDate.month ||
    (today.month === birthDate.month && today.day < birthDate.day)
      ? 1
      : 0);
  return age >= 21;
}

export const adultBirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid birthdate")
  .refine((value) => parseIsoBirthDate(value) !== null, {
    message: "Enter a valid birthdate",
  })
  .refine((value) => isAtLeast21(value), {
    message: "You must be 21 or older to purchase alcohol",
  });

export const privacyConsentSchema = z.object({
  privacyConsent: z.literal(true),
  privacyPolicyVersion: z.literal(PRIVACY_POLICY_VERSION),
});

export const membershipRenewalConsentSchema = z.object({
  autoRenewConsent: z.literal(true),
  renewalTermsVersion: z.literal(MEMBERSHIP_RENEWAL_TERMS_VERSION),
});
