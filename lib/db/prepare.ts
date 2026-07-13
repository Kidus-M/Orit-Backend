import { getEnv } from "@/lib/env";
import { seedDatabase } from "@/lib/db/seed";

let preparation: Promise<unknown> | undefined;

export function prepareDatabase() {
  if (!preparation) {
    preparation = getEnv().SEED_IF_EMPTY
      ? seedDatabase()
      : Promise.resolve();
  }
  return preparation;
}

