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

const ink = readToken("ink");
const steelDark = readToken("steel-dark");
const steel = readToken("steel");
const brass = readToken("brass");
const brassLight = readToken("brass-light");
const white = "#FFFFFF";
const darkSurfaces = ["surface", "surface-muted", "surface-subtle", "mist", "mist-light", "band", "band-dark"];
const textPairs = [
  ["white on brass (primary button)", contrast(white, brass)],
  ["ink on brass", contrast(ink, brass)],
  ...darkSurfaces.flatMap((name) => {
    const color = readToken(name);
    return [
      [`ink on ${name}`, contrast(ink, color)],
      [`steel on ${name}`, contrast(steel, color)],
      [`steel-dark on ${name}`, contrast(steelDark, color)],
      [`brass-light on ${name}`, contrast(brassLight, color)],
    ];
  }),
  ["success on success background", contrast(readToken("status-success"), readToken("status-success-bg"))],
  ["warning on warning background", contrast(readToken("status-warning"), readToken("status-warning-bg"))],
  ["danger on danger background", contrast(readToken("status-danger"), readToken("status-danger-bg"))],
];

for (const [label, value] of textPairs) {
  console.log(`${label}: ${value.toFixed(2)}:1`);
  if (value < 4.5) throw new Error(`${label} does not meet WCAG AA for normal text.`);
}

const brassOnSurface = contrast(brass, readToken("surface"));
console.log(`brass on surface, not for small text: ${brassOnSurface.toFixed(2)}:1`);
