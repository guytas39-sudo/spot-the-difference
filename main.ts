// Entry program for best-spot-the-difference-game-20261121-0451.
// Copies the game and its screenshots into the output directory and writes
// the dossier the scorer rebuilds with the same library: the program runs
// twice and both runs must write the same bytes, so every step is a plain
// copy plus the deterministic buildDossier call.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
for (const sub of ['game', 'screenshots']) {
  rmSync(join(outDir, sub), { recursive: true, force: true });
  cpSync(join(here, sub), join(outDir, sub), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('wrote', join(outDir, 'dossier.json'));
