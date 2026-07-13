import { config } from "dotenv";

import { seedDatabase } from "../lib/db/seed";

config({ path: ".env.local" });
config();

seedDatabase()
  .then((result) => {
    console.log("Seed complete", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
