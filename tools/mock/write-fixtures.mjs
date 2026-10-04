// Writes tools/mock/captured.js from what tools/live/capture.js returns, for
// the pills, ribbon and tooltips mocks. Run with Node from the repo root:
//
//   civ7lab live eval --file tools/live/capture.js > capture.json
//   node tools/mock/write-fixtures.mjs capture.json

import { readFileSync, writeFileSync } from "node:fs";

const [input] = process.argv.slice(2);
if (!input) {
	console.error("usage: node tools/mock/write-fixtures.mjs capture.json");
	process.exit(1);
}
const captured = JSON.parse(readFileSync(input, "utf8"));
const header = `// Captured from a running game by tools/live/capture.js, written by
// tools/mock/write-fixtures.mjs: this mod's stylesheets, the top bar, the
// local player's ribbon entry and each tooltip, hovered and locked, as the
// game drew them in the ${captured.age || "game"}. Browser only. Do not edit by hand:
// capture again.
`;
writeFileSync("tools/mock/captured.js", `${header}export const CAPTURED = ${JSON.stringify(captured, null, "\t")};\n`);
console.log(`tools/mock/captured.js: ${captured.tooltips.length} tooltips, top bar ${captured.topBar.length} and ribbon ${captured.ribbon.length} characters`);
