#!/usr/bin/env node
// validate-seed.mjs — TEST GATE: ověří, že assets/seed/ms2026/matches.json přesně
// odpovídá polím SZ + PZ v tipovacka.html (zdroj pravdy). Nezávislý parser (nesdílí
// kód s generátorem), aby chytil i chybu v generátoru.
// Spuštění: node scripts/validate-seed.mjs   → exit 0 = PASS, exit 1 = FAIL
//
// Porovnává: počet zápasů, ID, oba týmy, datum/čas, stadion, fázi/skupinu/kolo.
// Bonus: teams.json vs TEAMS (počet + úplnost skupin).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'tipovacka.html'), 'utf8');
const seedM = JSON.parse(readFileSync(join(ROOT, 'assets/seed/ms2026/matches.json'), 'utf8'));
const seedT = JSON.parse(readFileSync(join(ROOT, 'assets/seed/ms2026/teams.json'), 'utf8'));

function lit(name) {
  const m = html.match(new RegExp('var\\s+' + name + '\\s*=\\s*([\\[{][\\s\\S]*?[\\]}]);', 'm'));
  if (!m) throw new Error('Nenalezeno v tipovacka.html: ' + name);
  return Function('"use strict";return (' + m[1] + ');')();
}
const SZ = lit('SZ'), PZ = lit('PZ'), TEAMS = lit('TEAMS');

const p2 = n => String(n).padStart(2, '0');
// kanonická podoba zápasu ze zdrojového řádku [id,code,t1,t2,y,mo,d,h,mi,venue]
function canonSrc(r, phase) {
  return [r[0], phase, phase === 'group' ? r[1] : '-', phase === 'playoff' ? r[1] : '-',
    r[2], r[3], `${r[4]}-${p2(r[5])}-${p2(r[6])}T${p2(r[7])}:${p2(r[8])}`, r[9]].join(' | ');
}
function canonSeed(x) {
  return [x.id, x.phase, x.phase === 'group' ? x.group : '-', x.phase === 'playoff' ? x.round : '-',
    x.team1, x.team2, x.datetime, x.venue].join(' | ');
}

const srcRows = [...SZ.map(r => canonSrc(r, 'group')), ...PZ.map(r => canonSrc(r, 'playoff'))];
const seedRows = seedM.map(canonSeed);

const fails = [];

// 1) počet
if (srcRows.length !== seedRows.length)
  fails.push(`Počet zápasů: zdroj ${srcRows.length} vs seed ${seedRows.length}`);

// 2) řádek po řádku (dle ID)
const srcById = new Map(); [...SZ.map(r => [r[0], canonSrc(r, 'group')]), ...PZ.map(r => [r[0], canonSrc(r, 'playoff')])].forEach(([id, c]) => srcById.set(id, c));
const seedById = new Map(seedM.map(x => [x.id, canonSeed(x)]));
for (const [id, c] of srcById) {
  if (!seedById.has(id)) { fails.push(`Zápas ID ${id} chybí v seedu`); continue; }
  if (seedById.get(id) !== c) fails.push(`Zápas ID ${id} se liší:\n  zdroj: ${c}\n  seed:  ${seedById.get(id)}`);
}
for (const id of seedById.keys()) if (!srcById.has(id)) fails.push(`Zápas ID ${id} je v seedu navíc (není ve zdroji)`);

// 3) teams: počet + skupiny úplné + kryjí se se zápasy
const srcTeamCount = Object.values(TEAMS).reduce((s, g) => s + g.length, 0);
if (srcTeamCount !== seedT.length) fails.push(`Počet týmů: zdroj ${srcTeamCount} vs seed ${seedT.length}`);
for (const grp of Object.keys(TEAMS)) {
  const srcNames = TEAMS[grp].map(r => r[0]).sort();
  const seedNames = seedT.filter(t => t.group === grp).map(t => t.name_cs).sort();
  if (JSON.stringify(srcNames) !== JSON.stringify(seedNames))
    fails.push(`Skupina ${grp} se liší: zdroj [${srcNames}] vs seed [${seedNames}]`);
}
// každý tým ve skupinových zápasech musí existovat v teams.json
const teamSet = new Set(seedT.map(t => t.name_cs));
for (const r of SZ) for (const nm of [r[2], r[3]])
  if (!teamSet.has(nm)) fails.push(`Tým "${nm}" ze zápasu ${r[0]} chybí v teams.json`);

if (fails.length) {
  console.error('❌ FAIL — seed neodpovídá tipovacka.html:\n');
  fails.slice(0, 40).forEach(f => console.error(' • ' + f));
  if (fails.length > 40) console.error(` … a ${fails.length - 40} dalších`);
  process.exit(1);
}
console.log('✅ PASS — seed přesně odpovídá tipovacka.html');
console.log(`   ${seedRows.length} zápasů (72 group + 32 playoff), ${seedT.length} týmů, 12 skupin — vše shodné.`);
process.exit(0);
