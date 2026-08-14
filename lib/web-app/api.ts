export class ClubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function clubApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as { error?: string; details?: unknown } | null;
    throw new ClubApiError(
      error?.error ?? "The request could not be completed.",
      response.status,
      error?.details,
    );
  }
  return body as T;
}

export type ClubUser = {
  id: string;
  role: "member" | "store_owner" | "admin";
  firstName: string;
  email: string;
  dateOfBirth: string | null;
  storeName: string | null;
  isVendor: boolean;
};

export type MembershipPlan = {
  id: string;
  code: "one_month" | "three_month" | "six_month";
  name: string;
  durationMonths: number;
  priceCents: number;
};

export type MembershipState = {
  isMember: boolean;
  isNonMember: boolean;
  membership: null | {
    id: string;
    planId: string;
    planCode: string;
    planName: string;
    durationMonths: number;
    autoRenew: boolean;
    currentPeriodEnd: string;
  };
};

export type PickupLocation = {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  hoursText: string;
  bottlePriceCents: number;
  transportationFeeCents: number;
  stockQuantity: number;
  inStock: boolean;
};

export type PurchaseOrder = {
  id: string;
  locationId: string;
  locationName?: string;
  quantity: number;
  orderType: "personal" | "event";
  unitPriceCents: number;
  transportationFeeCents: number;
  totalCents: number;
  paid: boolean;
  status: string;
  pickupReadyAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function isAtLeast21(dateOfBirth: string) {
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birth.valueOf())) return false;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 21;
}
