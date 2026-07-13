import "dotenv/config";

import { seedDatabase } from "../lib/db/seed";

seedDatabase()
  .then((result) => {
    console.log("Seed complete", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

