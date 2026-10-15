// Builds Pablo's Top Bar and Tooltips in build/top-bar-tooltips: each file
// its modinfo lists, from mod/top-bar-tooltips if it is there, else from
// HUD Overhaul's mod/hud-overhaul. Run from the repo root after any change
// to a shared file:
//
//   node tools/build-top-bar.mjs

import { cpSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const OWN = "mod/top-bar-tooltips";
const SHARED = "mod/hud-overhaul";
const OUT = "build/top-bar-tooltips";
const MODINFO = "top-bar-tooltips.modinfo";

const modinfo = readFileSync(join(OWN, MODINFO), "utf8");
const files = [...modinfo.matchAll(/<Item>([^<]+)<\/Item>/g)].map((match) => match[1]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(OWN, MODINFO), join(OUT, MODINFO));
let missing = 0;
for (const file of files) {
	const from = [join(OWN, file), join(SHARED, file)].find(existsSync);
	if (!from) {
		console.error(`missing: ${file}`);
		missing++;
		continue;
	}
	mkdirSync(dirname(join(OUT, file)), { recursive: true });
	cpSync(from, join(OUT, file));
}
console.log(`${OUT}: ${files.length - missing} files`);
if (missing) process.exit(1);
