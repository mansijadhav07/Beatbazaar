import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = await fs.readFile(path.join(root, "src/app/globals.css"), "utf8");

function readToken(name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match) throw new Error(`Missing color token --${name}.`);
  return match[1];
}

function luminance(color) {
  const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

async function sourceFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(entryPath);
      return /\.(?:tsx|jsx)$/.test(entry.name) ? [entryPath] : [];
    })
  );
  return nested.flat();
}

const ink = readToken("ink");
const steelDark = readToken("steel-dark");
const brass = readToken("brass");
const mist = readToken("mist");
const white = "#FFFFFF";
const lightSurfaces = [
  ["white", white],
  ["mist", mist],
  ["mist-light", readToken("mist-light")],
  ["surface-muted", readToken("surface-muted")],
  ["surface-subtle", readToken("surface-subtle")],
];
const textPairs = [
  ["ink on brass", contrast(ink, brass)],
  ["dark ink on brass", contrast(readToken("ink-dark"), brass)],
  ...lightSurfaces.map(([surface, color]) => [`ink on ${surface}`, contrast(ink, color)]),
  ...lightSurfaces.map(([surface, color]) => [`dark steel on ${surface}`, contrast(steelDark, color)]),
  ["white on ink", contrast(white, ink)],
  ["white on dark ink", contrast(white, readToken("ink-dark"))],
  ["success on success background", contrast(readToken("status-success"), readToken("status-success-bg"))],
  ["warning on warning background", contrast(readToken("status-warning"), readToken("status-warning-bg"))],
  ["danger on danger background", contrast(readToken("status-danger"), readToken("status-danger-bg"))],
];

for (const [label, value] of textPairs) {
  console.log(`${label}: ${value.toFixed(2)}:1`);
  if (value < 4.5) throw new Error(`${label} does not meet WCAG AA for normal text.`);
}

const brassOnWhite = contrast(brass, white);
const brassOnMist = contrast(brass, mist);
console.log(`brass on white, not for text: ${brassOnWhite.toFixed(2)}:1`);
console.log(`brass on mist, not for text: ${brassOnMist.toFixed(2)}:1`);
if (brassOnWhite >= 4.5 || brassOnMist >= 4.5) {
  throw new Error("The palette check expects brass to remain disallowed for text on light surfaces.");
}

const approvedBrassAccentCounts = new Map([
  ["src/components/brand/WaveformMotif.tsx", 1],
  ["src/components/catalog/BeatCard.tsx", 3],
  ["src/components/catalog/TrackAudioPlayer.tsx", 1],
  ["src/components/player/PersistentPlayer.tsx", 3],
]);
const violations = [];
const occurrences = new Map();
for (const file of await sourceFiles(path.join(root, "src"))) {
  const relativePath = path.relative(root, file).split(path.sep).join("/");
  const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\btext-brass(?:-dark|-light)?\b/.test(line)) {
      occurrences.set(relativePath, (occurrences.get(relativePath) || 0) + 1);
      if (!approvedBrassAccentCounts.has(relativePath)) {
        violations.push(`${relativePath}:${index + 1}`);
      }
    }
  });
}
for (const [file, expectedCount] of approvedBrassAccentCounts) {
  const actualCount = occurrences.get(file) || 0;
  if (actualCount !== expectedCount) {
    violations.push(`${file}: expected ${expectedCount} decorative or dark-surface accents, found ${actualCount}`);
  }
}
if (violations.length) {
  throw new Error(`Brass text classes require a dark surface or decorative use:\n${violations.join("\n")}`);
}

console.log("Brass text classes are limited to the approved dark-surface and decorative components.");
