import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const packagePath = path.join(projectRoot, "package.json");
const srcDir = path.join(projectRoot, "src");

function fail(message) {
  console.error(`\n[ERROR] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(packagePath)) fail(`package.json not found at ${packagePath}`);
if (!fs.existsSync(srcDir)) fail(`src folder not found at ${srcDir}`);

console.log(`[OK] Project root: ${projectRoot}`);

const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
pkg.scripts = {
  ...(pkg.scripts ?? {}),
  dev: "vite",
  build: "vite build",
  preview: "vite preview",
  typecheck: "tsc --noEmit"
};
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
console.log("[OK] package.json scripts verified.");

let lucide;
try {
  const lucideUrl = pathToFileURL(
    path.join(projectRoot, "node_modules", "lucide-react", "dist", "esm", "lucide-react.js")
  ).href;
  lucide = await import(lucideUrl);
} catch (firstError) {
  try {
    lucide = await import("lucide-react");
  } catch (secondError) {
    fail(`lucide-react could not be loaded. Run npm install first.\n${secondError.message}`);
  }
}

function collectSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(full));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const sourceFiles = collectSourceFiles(srcDir);
const affectedFiles = sourceFiles.filter((file) =>
  /\bCircleEuro\b/.test(fs.readFileSync(file, "utf8"))
);

if (affectedFiles.length > 0) {
  const candidates = ["Euro", "BadgeEuro", "CircleDollarSign", "Coins", "BadgeDollarSign"];
  const combinedAffectedSource = affectedFiles
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  const replacement = candidates.find(
    (name) => typeof lucide[name] !== "undefined" &&
      !new RegExp(`\\b${name}\\b`).test(combinedAffectedSource)
  );

  if (!replacement) {
    fail("No safe replacement icon was found in the installed lucide-react package.");
  }

  for (const file of affectedFiles) {
    const original = fs.readFileSync(file, "utf8");
    const updated = original.replace(/\bCircleEuro\b/g, replacement);
    fs.writeFileSync(file, updated, "utf8");
    console.log(
      `[FIXED] ${path.relative(projectRoot, file)}: CircleEuro -> ${replacement}`
    );
  }
} else {
  console.log("[OK] No CircleEuro references remain.");
}

// Validate every named runtime import from lucide-react before invoking Vite.
const missing = [];
const importRegex = /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g;

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(importRegex)) {
    const specifiers = match[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    for (const specifier of specifiers) {
      if (specifier.startsWith("type ")) continue;
      const exportedName = specifier.split(/\s+as\s+/)[0].trim();
      if (exportedName && typeof lucide[exportedName] === "undefined") {
        missing.push(`${path.relative(projectRoot, file)} -> ${exportedName}`);
      }
    }
  }
}

if (missing.length > 0) {
  console.error("\n[ERROR] Unsupported lucide-react imports were found:");
  for (const item of missing) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(`[OK] Validated lucide-react imports in ${sourceFiles.length} TypeScript files.`);
console.log("[SUCCESS] Automated source repair and import validation completed.");
