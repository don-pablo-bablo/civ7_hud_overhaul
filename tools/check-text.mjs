// Checks the mods' text keys. Run from the repo root:
//
//   node tools/check-text.mjs                 the checks CI runs
//   node tools/check-text.mjs --game <path>   and the checks against the game
//   node tools/check-text.mjs --game <path> --write
//
// Every key the scripts use must have text: the mods' own, in their text
// files, or the game's, listed by name in tools/game-keys.txt. Every key of
// the mods' own must be used. Text players see must come from a key, never
// be written in a script.
//
// The mods' own text is in English and in each of LANGUAGES, in a file
// beside the English one that the modinfos list. Each language must have
// every key, with the English's placeholders and icons.
// tools/translated-from.txt records the English each translation was made
// from: when the English changes, the check fails until every language is
// updated and --write records the new English.
//
// With the game (its resources folder, or ./reference when it links there),
// also:
//
// - each game key the scripts use must still be in the game, and
//   tools/game-keys.txt must list exactly those (--write rewrites it);
// - text of the mods' own that the game has too must be switched to the
//   game's key, which the game translates, or kept on purpose in
//   tools/own-text.txt. CI checks the same against tools/game-text.txt: the
//   game's short translated labels as a hash of their words and their key,
//   none of the game's text (--write rewrites it);
// - the game's yield labels that have no text are listed. The tooltips show
//   them as Other.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const TEXT = ["mod/hud-overhaul/text/en_us/InGameText.xml", "mod/top-bar-tooltips/text/en_us/TopBarText.xml"];
const CODE = ["mod/hud-overhaul", "mod/top-bar-tooltips"];
const GAME_KEYS = "tools/game-keys.txt";
const OWN_TEXT = "tools/own-text.txt";
const TRANSLATED_FROM = "tools/translated-from.txt";
const GAME_TEXT = "tools/game-text.txt";
// The longest words tools/game-text.txt keeps: labels, not sentences.
const LABEL = 40;
const MODINFOS = ["mod/hud-overhaul/hud-overhaul.modinfo", "mod/top-bar-tooltips/top-bar-tooltips.modinfo"];
// The game's languages the mods are translated into. Its others show the
// English.
const LANGUAGES = ["de_DE", "es_ES", "fr_FR", "it_IT", "pl_PL", "pt_BR"];

const args = process.argv.slice(2);
const write = args.includes("--write");
const at = args.indexOf("--game");
const gamePath = at >= 0 ? args[at + 1] : existsSync("reference/Base") ? "reference" : null;

const errors = [];
const fail = (message) => errors.push(message);

function files(dir, test, list = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) files(path, test, list);
		else if (test(path)) list.push(path);
	}
	return list;
}

// Lines of a list file, without comments and blank lines: the first word
// of each, or the first few as a list.
function listFile(path, words = 1) {
	if (!existsSync(path)) return [];
	return readFileSync(path, "utf8")
		.split("\n")
		.map((line) => line.replace(/#.*/, "").trim())
		.filter(Boolean)
		.map((line) => (words == 1 ? line.split(/\s+/)[0] : line.split(/\s+/).slice(0, words)));
}

// A text file's entries: [key, language, text].
const entries = (file) => [...readFileSync(file, "utf8").matchAll(/<Replace Tag="(LOC_[A-Za-z0-9_]+)" Language="([^"]+)">\s*<Text>([\s\S]*?)<\/Text>/g)].map((m) => m.slice(1));

// The mods' own text: key to English text.
const own = new Map();
for (const file of TEXT) {
	const seen = new Set();
	for (const [key, language, text] of entries(file)) {
		if (language != "en_US") fail(`${file}: ${key} is in ${language}; this file is the English`);
		if (seen.has(key)) fail(`${file}: ${key} is there twice`);
		seen.add(key);
		// Top Bar and Tooltips' file replaces some of HUD Overhaul's.
		own.set(key, text);
	}
}

// The keys the scripts use, by file. A key the script finishes, such as
// `LOC_UI_CITY_DETAILS_${stage}` or "LOC_UI_CITY_DETAILS_" + stage, counts
// as its start with a *. The modinfos' titles are the game's module names,
// which it does not look up as text.
const used = new Map();
const use = (key, file) => used.set(key, used.get(key) ?? file);
for (const file of CODE.flatMap((dir) => files(dir, (path) => path.endsWith(".js")))) {
	const source = readFileSync(file, "utf8");
	for (const [, key] of source.matchAll(/["'`](LOC_[A-Za-z0-9_]+)["'`]/g)) use(key.endsWith("_") ? `${key}*` : key, file);
	for (const [, start] of source.matchAll(/`(LOC_[A-Za-z0-9_]*)\$\{/g)) use(`${start}*`, file);
	// The game names an option group's heading LOC_OPTIONS_GROUP_ and the
	// group in capitals.
	const groups = source.match(/OPTION_GROUPS = \{([^}]*)\}/)?.[1] ?? "";
	for (const [, group] of groups.matchAll(/"([a-z0-9_]+)"/g)) use(`LOC_OPTIONS_GROUP_${group.toUpperCase()}`, file);
}

let gameKeys = new Set(listFile(GAME_KEYS));
const fromGame = [...used.keys()].filter((key) => !own.has(key)).sort();
for (const key of own.keys()) {
	// A game key the mods give text, such as one the game leaves without.
	if (!key.includes("HUD_OVERHAUL")) continue;
	if (!used.has(key)) fail(`${key} has text but no script uses it`);
}

checkWritten();
checkTranslations();
if (gamePath) checkGame(realpathSync(gamePath));
else checkOwnFromFile();
for (const key of fromGame) {
	if (!gameKeys.has(key)) fail(`${used.get(key)}: ${key} has no text in the mods, and ${GAME_KEYS} does not list it as the game's`);
}

for (const message of errors) console.error(message);
console.log(`${used.size} keys used, ${own.size} of the mods' own, ${fromGame.length} the game's${gamePath ? `; checked against ${gamePath}` : ""}`);
console.log(`The mods' own text is in English, ${LANGUAGES.join(", ")}; the game's other languages show it in English.`);
if (errors.length) process.exit(1);

// Text players see, written in a script instead of taken from a key: a
// string with a word in it, given to textContent, innerHTML, a title, a
// label, a description, a tooltip or one of the tooltips' builders. A line
// that ends in "// mock only" is the mock's, which has no keys.
function checkWritten() {
	const sink = /(?:\.(?:textContent|innerHTML|innerText|title|placeholder)\s*=|\b(?:label|title|description|tooltip|text|name)\s*:|setAttribute\(\s*["'](?:title|aria-label|data-tooltip-content)["']\s*,|tooltipContent\s*=|\b(?:div|el|chip|row|section|head|message|group)\(\s*[^,()]*,)\s*(["'`])((?:(?!\1).)*)\1/g;
	for (const file of CODE.flatMap((dir) => files(dir, (path) => path.endsWith(".js")))) {
		readFileSync(file, "utf8")
			.split("\n")
			.forEach((line, i) => {
				if (/^\s*\/\//.test(line) || /\/\/ mock only\s*$/.test(line)) return;
				for (const [, , text] of line.matchAll(sink)) {
					const words = text.replace(/\$\{[^}]*\}/g, "");
					// Keys, class names, icons and numbers are not words; a
					// template cut short by one inside it is not checked.
					if (words.includes("${") || /^LOC_/.test(words) || /^(fs|blp):/.test(words) || /^[a-z0-9_:-]*( [a-z0-9_:-]+)*$/.test(words) || !/[A-Za-z]{2}/.test(words)) continue;
					fail(`${file}:${i + 1}: "${text}" is written in the script; give it a key in the text file`);
				}
			});
	}
}

// A text's words alone, to compare it with the game's: icons, bold, case
// and a full stop at the end do not count.
function words(text) {
	return text.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim().replace(/[.:]$/, "").toLowerCase();
}

// Without the game: the mods' own text whose words are one of the game's
// labels in tools/game-text.txt.
function checkOwnFromFile() {
	const byHash = new Map();
	for (const [print, ...keys] of listFile(GAME_TEXT, 4)) byHash.set(print, keys);
	const kept = new Set(listFile(OWN_TEXT));
	for (const [key, text] of own) {
		if (!key.includes("HUD_OVERHAUL") || kept.has(key) || words(text).length > LABEL) continue;
		const matches = byHash.get(hash(words(text)));
		if (matches) fail(`${key} "${text.trim()}" is the game's text too: use ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? ` or ${matches.length - 3} more` : ""}, or keep it in ${OWN_TEXT}`);
	}
	for (const key of kept) if (!own.has(key)) fail(`${OWN_TEXT}: ${key} is not one of the mods' keys`);
}

// A text's placeholders, icons and markup, which a translation must keep:
// "{1} [icon:YIELD_GOLD] [B] [/B]". A translation may add plurals the
// English does without, as Polish needs for "{1_Count} settlements".
function shape(text) {
	const marks = [];
	for (const [, n] of text.matchAll(/\{(\d+)(?:_[A-Za-z]+)?\s*[}\[]/g)) marks.push(`{${n}}`);
	for (const [tag] of text.matchAll(/\[(?:icon:[A-Za-z0-9_]+|\/?[BN]|\/?b|n)\]/g)) marks.push(tag);
	return [...new Set(marks)].sort().join(" ");
}

function hash(text) {
	return createHash("sha1").update(text).digest("hex").slice(0, 10);
}

// Each language's file beside each English one: every key, the English's
// shape, listed in the modinfos; and the English it was made from.
function checkTranslations() {
	const recorded = new Map(listFile(TRANSLATED_FROM, 2).map(([key, value]) => [key, value]));
	const current = new Map();
	for (const file of TEXT) {
		const english = new Map(entries(file).map(([key, , text]) => [key, text]));
		for (const [key, text] of english) current.set(`${basename(file)}:${key}`, hash(text));
		for (const language of LANGUAGES) {
			const path = join(dirname(file), "..", language.toLowerCase(), basename(file));
			if (!existsSync(path)) {
				fail(`${path} is missing: the ${language} text`);
				continue;
			}
			const translated = new Map();
			for (const [key, lang, text] of entries(path)) {
				if (lang != language) fail(`${path}: ${key} says ${lang}`);
				if (!english.has(key)) fail(`${path}: ${key} is not in the English`);
				translated.set(key, text);
			}
			for (const [key, text] of english) {
				if (!translated.has(key)) fail(`${path}: ${key} is missing`);
				else if (shape(translated.get(key)) != shape(text)) fail(`${path}: ${key} has "${shape(translated.get(key))}" where the English has "${shape(text)}"`);
			}
			const item = path.replace(/^mod\/[^/]+\//, "");
			for (const modinfo of MODINFOS) {
				const lists = readFileSync(modinfo, "utf8").includes(`<Item locale="${language}">${item}</Item>`);
				const needs = modinfo.startsWith(dirname(dirname(dirname(file)))) || readFileSync(modinfo, "utf8").includes(file.replace(/^mod\/[^/]+\//, ""));
				if (needs && !lists) fail(`${modinfo} does not list <Item locale="${language}">${item}</Item>`);
			}
		}
	}
	if (write) {
		writeFileSync(TRANSLATED_FROM, `# The English each translation was made from, written by tools/check-text.mjs --write\n# once every language is updated: the file and key, then a hash of the English.\n${[...current].map(([key, value]) => `${key} ${value}`).join("\n")}\n`);
		return;
	}
	for (const [key, value] of current) {
		if (!recorded.has(key)) fail(`${key.replace(/^[^:]+:/, "")} is new since ${TRANSLATED_FROM}: translate it, then run node tools/check-text.mjs --write`);
		else if (recorded.get(key) != value) fail(`${key.replace(/^[^:]+:/, "")}: the English changed since it was translated; update each language, then run node tools/check-text.mjs --write`);
	}
}

function checkGame(root) {
	// The English text a game loads: what each module's modinfo lists for
	// scope="game". The main menu's, such as the Hall of Fame's, is missing
	// in a game.
	const textFiles = [];
	for (const modinfo of files(root, (path) => path.endsWith(".modinfo"))) {
		for (const [, group] of readFileSync(modinfo, "utf8").matchAll(/<ActionGroup [^>]*scope="game"[^>]*>([\s\S]*?)<\/ActionGroup>/g)) {
			for (const [, block] of group.matchAll(/<UpdateText>([\s\S]*?)<\/UpdateText>/g)) {
				for (const [, item] of block.matchAll(/<Item>([^<]+)<\/Item>/g)) {
					const path = join(modinfo, "..", item.trim());
					if (!path.includes("/l10n/") && existsSync(path)) textFiles.push(path);
				}
			}
		}
	}
	const translated = files(root, (path) => path.endsWith(".xml") && path.includes("/l10n/"));
	// The game's English text, key to text.
	const game = new Map();
	for (const file of textFiles) {
		for (const [, key, text] of readFileSync(file, "utf8").matchAll(/<(?:Row|Replace)\s+Tag=["'](LOC_[A-Za-z0-9_]+)["'][^>]*>\s*<Text>([\s\S]*?)<\/Text>/g)) {
			if (!game.has(key)) game.set(key, text);
		}
	}
	// Keys with a translation in any language.
	const inOther = new Set();
	for (const file of translated) for (const [, key] of readFileSync(file, "utf8").matchAll(/Tag=["'](LOC_[A-Za-z0-9_]+)["']/g)) inOther.add(key);

	const has = (key) => (key.endsWith("*") ? [...game.keys()].some((k) => k.startsWith(key.slice(0, -1))) : game.has(key));
	for (const key of fromGame) if (!has(key)) fail(`${used.get(key)}: ${key} is not in the game`);
	const list = fromGame.filter(has);
	const stale = list.join("\n") != [...gameKeys].sort().join("\n");
	if (write) {
		writeFileSync(GAME_KEYS, `# The game's text keys the scripts use, written by tools/check-text.mjs --write.\n${list.join("\n")}\n`);
		console.log(`${GAME_KEYS}: ${list.length} keys`);
		gameKeys = new Set(list);
	} else if (stale) {
		fail(`${GAME_KEYS} is out of date: run node tools/check-text.mjs --game ${gamePath} --write`);
	}

	// The game's short translated labels, for CI.
	// One line per label, with up to three of its keys, the game's own
	// screens first.
	const labelKeys = new Map();
	for (const [key, text] of game) {
		if (!inOther.has(key) || !words(text) || words(text).length > LABEL) continue;
		labelKeys.set(hash(words(text)), [...(labelKeys.get(hash(words(text))) ?? []), key]);
	}
	const screen = (k) => (/^LOC_(PEDIA|TUTORIAL|ADVICE|HOF|CARD|LEADER_CHAIN)/.test(k) ? 1 : 0);
	const prints = [...labelKeys].map(([print, keys]) => `${print} ${keys.sort((a, b) => screen(a) - screen(b) || a.localeCompare(b)).slice(0, 3).join(" ")}`).sort();
	const printed = existsSync(GAME_TEXT) ? readFileSync(GAME_TEXT, "utf8").split("\n").filter((line) => line && !line.startsWith("#")) : [];
	if (write) {
		writeFileSync(GAME_TEXT, `# The game's short translated labels, written by tools/check-text.mjs --game <path> --write:\n# a hash of each one's words, then up to three of its keys. None of the game's text is here.\n${prints.join("\n")}\n`);
		console.log(`${GAME_TEXT}: ${prints.length} labels`);
	} else if (printed.join("\n") != prints.join("\n")) {
		fail(`${GAME_TEXT} is out of date: run node tools/check-text.mjs --game ${gamePath} --write`);
	}

	// Our text that the game has as well.
	const byWords = new Map();
	for (const [key, text] of game) {
		const w = words(text);
		if (w) byWords.set(w, [...(byWords.get(w) ?? []), key]);
	}
	const kept = new Set(listFile(OWN_TEXT));
	for (const [key, text] of own) {
		if (!key.includes("HUD_OVERHAUL") || kept.has(key)) continue;
		const matches = (byWords.get(words(text)) ?? []).filter((k) => inOther.has(k));
		if (!matches.length) continue;
		// Same case first, then the game's own screens before its
		// Civilopedia and tutorials.
		const rank = (k) => (game.get(k).trim() == text.trim() ? 0 : 2) + (/^LOC_(PEDIA|TUTORIAL|ADVICE|HOF|CARD|LEADER_CHAIN)/.test(k) ? 1 : 0);
		matches.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
		const shown = matches.slice(0, 3).map((k) => `${k} "${game.get(k).trim()}"`).join(", ");
		fail(`${key} "${text.trim()}" is the game's text too: use ${shown}${matches.length > 3 ? ` or ${matches.length - 3} more` : ""}, or keep it in ${OWN_TEXT}`);
	}
	for (const key of kept) if (!own.has(key)) fail(`${OWN_TEXT}: ${key} is not one of the mods' keys`);

	// The game's yield labels with no text.
	const labels = new Set();
	for (const file of files(root, (path) => path.endsWith(".xml") && path.includes("/data/"))) {
		for (const [, key] of readFileSync(file, "utf8").matchAll(/<Argument name="Tooltip">(LOC_[A-Za-z0-9_]+)</g)) labels.add(key);
	}
	const missing = [...labels].filter((key) => !game.has(key)).sort();
	if (missing.length) {
		console.log(`The game's labels with no text, shown as Other unless the mods give them text (${missing.length}):`);
		for (const key of missing) console.log(`  ${key}${own.has(key) ? ": the mods give it text" : ""}`);
	}
}
