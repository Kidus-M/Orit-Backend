import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import QRCode from "qrcode";

const qrDestination =
  process.env.EVENTS_QR_URL ??
  "https://orit-backend.vercel.app/wolf-den-events";
const outputDirectory = resolve(process.cwd(), "public", "qr");
const sharedOptions = {
  errorCorrectionLevel: "H" as const,
  margin: 4,
  width: 4000,
  color: {
    dark: "#000000",
    light: "#FFFFFF",
  },
};

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    QRCode.toFile(
      resolve(outputDirectory, "wolf-den-events-qr.png"),
      qrDestination,
      { ...sharedOptions, type: "png" },
    ),
    QRCode.toFile(
      resolve(outputDirectory, "wolf-den-events-qr.svg"),
      qrDestination,
      { ...sharedOptions, type: "svg" },
    ),
  ]);

  console.log("Generated Wolf Den events QR for " + qrDestination);
}

void main();
