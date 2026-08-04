// Regenerates src/data/catalog.ts from the design prototype in design/.
//
// The prototype is the catalog's source of truth. Executing its own eras()
// method and emitting TypeScript from the result means the shipped data
// cannot drift from the design. Run after editing the prototype:
//
//   node scripts/generate-catalog.mjs
//
// Entry ids are the prototype's glyph codes, which are stable and unique, so
// regenerating never remaps saved progress.
import fs from 'node:fs';

const PROTOTYPE = 'design/Road to Doomsday.dc.html';
const OUTPUT = 'src/data/catalog.ts';

const src = fs.readFileSync(PROTOTYPE, 'utf8');
const match = src.match(/<script type="text\/x-dc" data-dc-script data-props="\{\}">([\s\S]*?)<\/script>/);
if (!match) throw new Error(`no dc script block found in ${PROTOTYPE}`);

const Component = new Function(
  match[1].replace('class Component extends DCLogic', 'class Component') + '\nreturn Component;',
)();
const eras = new Component().eras();

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const isNumbered = (eps) =>
  eps.every((t, i) => t === 'EPISODE ' + String(i + 1).padStart(2, '0'));

const out = [];
out.push("import type { Era } from './types';");
out.push('');
out.push('/** Placeholder titles for series whose episode names we do not list. */');
out.push('const numbered = (n: number): string[] =>');
out.push("  Array.from({ length: n }, (_, i) => `EPISODE ${String(i + 1).padStart(2, '0')}`);");
out.push('');
out.push('/**');
out.push(' * The full rewatch catalog, in story order (in-universe chronology), grouped');
out.push(' * into eras. Ported from the Claude Design prototype in `design/`.');
out.push(' */');
out.push('export const CATALOG: readonly Era[] = [');

for (const er of eras) {
  out.push('  {');
  out.push(`    id: ${q(er.id)},`);
  out.push(`    name: ${q(er.name)},`);
  out.push(`    span: ${q(er.span)},`);
  out.push(`    dialect: ${q(er.dialect)},`);
  if (er.parallel) out.push('    parallel: true,');
  out.push('    palette: {');
  out.push(`      bg: ${q(er.bg)},`);
  out.push(`      ink: ${q(er.ink)},`);
  out.push(`      sub: ${q(er.sub)},`);
  out.push(`      accent: ${q(er.a)},`);
  out.push(`      card: ${q(er.cb)},`);
  out.push(`      border: ${q(er.bd)},`);
  out.push(`      posterBg: ${q(er.pbg)},`);
  out.push(`      posterInk: ${q(er.pink)},`);
  out.push('    },');
  out.push('    entries: [');
  for (const e of er.entries) {
    out.push('      {');
    out.push(`        id: ${q(e.glyph)},`);
    out.push(`        kind: ${q(e.kind)},`);
    out.push(`        title: ${q(e.t)},`);
    out.push(`        year: ${q(e.y)},`);
    if (e.kind === 'film') {
      out.push(`        minutes: ${e.r},`);
    } else {
      if (isNumbered(e.eps)) {
        out.push(`        episodes: numbered(${e.eps.length}),`);
      } else {
        out.push('        episodes: [');
        for (const t of e.eps) out.push(`          ${q(t)},`);
        out.push('        ],');
      }
      out.push(`        episodeMinutes: ${e.epMin},`);
    }
    out.push(`        tier: ${e.tier},`);
    out.push(`        stingers: ${e.st},`);
    out.push(`        clue: ${q(e.clue)},`);
    if (e.svc) out.push(`        service: ${q(e.svc)},`);
    if (e.url) out.push(`        url: ${q(e.url)},`);
    if (e.drop) out.push(`        drop: ${q(e.drop)},`);
    out.push('      },');
  }
  out.push('    ],');
  out.push('  },');
}
out.push('];');
out.push('');
out.push('/** Every entry, flattened out of its era. */');
out.push('export const ALL_ENTRIES = CATALOG.flatMap((era) => era.entries);');
out.push('');

fs.writeFileSync(OUTPUT, out.join('\n'));
const count = eras.reduce((n, er) => n + er.entries.length, 0);
console.log(`${OUTPUT}: ${eras.length} eras, ${count} entries`);
