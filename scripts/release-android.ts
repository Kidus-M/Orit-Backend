import {
  copyFile,
  mkdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, resolve } from "node:path";

const maximumApkBytes = 250 * 1024 * 1024;

function valuesFor(flag: string) {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === flag && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  }
  return values;
}

function valueFor(flag: string) {
  return valuesFor(flag).at(-1);
}

function fail(message: string): never {
  console.error("Android release failed: " + message);
  process.exit(1);
}

async function main() {
  const apkArgument = valueFor("--apk");
  const versionName = valueFor("--version")?.trim();
  const buildArgument = valueFor("--build");
  const minimumBuildArgument = valueFor("--minimum-build");
  const noteArguments = valuesFor("--note");
  const combinedNotes = valueFor("--notes");

  if (!apkArgument || !versionName || !buildArgument) {
    fail(
      "Use --apk <file> --version <name> --build <number> and optionally --note <text>.",
    );
  }

  const versionCode = Number(buildArgument);
  const minimumSupportedVersionCode = minimumBuildArgument
    ? Number(minimumBuildArgument)
    : versionCode;

  if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
    fail("--build must be a positive whole number.");
  }
  if (
    !Number.isSafeInteger(minimumSupportedVersionCode) ||
    minimumSupportedVersionCode < 1 ||
    minimumSupportedVersionCode > versionCode
  ) {
    fail("--minimum-build must be between 1 and the release build number.");
  }
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{0,39}$/.test(versionName)) {
    fail("--version contains unsupported characters.");
  }

  const sourceApk = resolve(apkArgument);
  if (extname(sourceApk).toLowerCase() !== ".apk") {
    fail("The release file must be an Android APK.");
  }

  let sourceStats;
  try {
    sourceStats = await stat(sourceApk);
  } catch {
    fail("APK not found: " + sourceApk);
  }
  if (
    !sourceStats.isFile() ||
    sourceStats.size < 1 ||
    sourceStats.size > maximumApkBytes
  ) {
    fail("APK must be a non-empty file smaller than 250 MB.");
  }

  const fileBytes = await readFile(sourceApk);
  const sha256 = createHash("sha256").update(fileBytes).digest("hex");
  const outputDirectory = resolve(process.cwd(), "public", "downloads");
  const outputName =
    "orit-tej-android-" + versionName + "-" + versionCode + ".apk";
  const outputApk = resolve(outputDirectory, outputName);
  const releaseNotes = [
    ...noteArguments,
    ...(combinedNotes ? combinedNotes.split("|") : []),
  ]
    .map((note) => note.trim())
    .filter(Boolean);

  await mkdir(outputDirectory, { recursive: true });
  await copyFile(sourceApk, outputApk);
  await writeFile(
    resolve(outputDirectory, "android-update.json"),
    JSON.stringify(
      {
        enabled: true,
        versionCode,
        versionName,
        minimumSupportedVersionCode,
        apkUrl: "/downloads/" + outputName,
        sha256,
        sizeBytes: sourceStats.size,
        releaseNotes,
        publishedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(
    "Published Android " + versionName + " (build " + versionCode + ")",
  );
  console.log("APK: public/downloads/" + basename(outputApk));
  console.log("SHA-256: " + sha256);
  console.log(
    minimumSupportedVersionCode === versionCode
      ? "Update mode: required for every older build"
      : "Required below build " + minimumSupportedVersionCode,
  );
}

void main();
