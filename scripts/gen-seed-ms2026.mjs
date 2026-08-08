#!/usr/bin/env node
// gen-seed-ms2026.mjs — extrahuje tournament-specific data MS 2026 z tipovacka.html
// do strukturovaných seed souborů. NEEDITUJE tipovacka.html (jen čte).
// Spuštění: node scripts/gen-seed-ms2026.mjs
//
// Zdrojová pravda = pole TEAMS / SZ / PZ / STAD / STAD_EXTRA v tipovacka.html.
// Jediná "přidaná" data jsou anglické názvy týmů (EN_MAP) — v tipovacka.html nejsou,
// ale UI je dvojjazyčné. Vše ostatní se parsuje 1:1, nic se nevymýšlí.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'tipovacka.html');
const OUT = join(ROOT, 'assets', 'seed', 'ms2026');

const html = readFileSync(SRC, 'utf8');

// --- vytáhne JS array/object literal "var NAME=<...>;" a bezpečně ho vyhodnotí ---
function extractLiteral(name) {
  const re = new RegExp('var\\s+' + name + '\\s*=\\s*([\\[{][\\s\\S]*?[\\]}]);', 'm');
  const m = html.match(re);
  if (!m) throw new Error('Nenalezeno: ' + name);
  // literály obsahují jen data (řetězce, čísla, pole/objekty) — žádné volání funkcí
  return Function('"use strict";return (' + m[1] + ');')();
}

const TEAMS = extractLiteral('TEAMS');
const SZ = extractLiteral('SZ');
const PZ = extractLiteral('PZ');
const STAD = extractLiteral('STAD');
const STAD_EXTRA = extractLiteral('STAD_EXTRA');

// --- EN názvy týmů (jediná přidaná data; standardní překlady, ověřeno ručně) ---
const EN_MAP = {
  'Mexiko':'Mexico','Jihoafricka rep.':'South Africa','Jizni Korea':'South Korea','Cesko':'Czechia',
  'Kanada':'Canada','Katar':'Qatar','Svycarsko':'Switzerland','Bosna a Hercegovina':'Bosnia and Herzegovina',
  'Brazilie':'Brazil','Maroko':'Morocco','Haiti':'Haiti','Skotsko':'Scotland',
  'USA':'USA','Paraguay':'Paraguay','Australie':'Australia','Turecko':'Türkiye',
  'Nemecko':'Germany','Curacao':'Curaçao','Pobrezi slonoviny':'Ivory Coast','Ekvador':'Ecuador',
  'Nizozemsko':'Netherlands','Japonsko':'Japan','Svedsko':'Sweden','Tunisko':'Tunisia',
  'Belgie':'Belgium','Egypt':'Egypt','Iran':'Iran','Novy Zeland':'New Zealand',
  'Spanelsko':'Spain','Kapverdy':'Cape Verde','Saudska Arabie':'Saudi Arabia','Uruguay':'Uruguay',
  'Francie':'France','Senegal':'Senegal','Irak':'Iraq','Norsko':'Norway',
  'Argentina':'Argentina','Alzirsko':'Algeria','Rakousko':'Austria','Jordansko':'Jordan',
  'Portugalsko':'Portugal','DR Kongo':'DR Congo','Uzbekistan':'Uzbekistan','Kolumbie':'Colombia',
  'Anglie':'England','Chorvatsko':'Croatia','Ghana':'Ghana','Panama':'Panama'
};

// deterministický slug jako "code" (ne vymyšlená fakta, jen stabilní identifikátor)
function slug(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// pad na 2 číslice
const p2 = n => String(n).padStart(2, '0');
// [y,m,d,h,min] -> "YYYY-MM-DDTHH:MM" (wall-clock přesně jako ve zdroji)
function isoOf(y, mo, d, h, mi) { return `${y}-${p2(mo)}-${p2(d)}T${p2(h)}:${p2(mi)}`; }

// --- teams.json ---
const teams = [];
for (const grp of Object.keys(TEAMS)) {
  for (const row of TEAMS[grp]) {
    const cs = row[0];
    if (!EN_MAP[cs]) throw new Error('Chybí EN překlad pro tým: ' + cs);
    teams.push({ code: slug(cs), name_cs: cs, name_en: EN_MAP[cs], group: grp });
  }
}

// --- matches.json (SZ = group, PZ = playoff) ---
// SZ/PZ formát: [id, group|round, team1, team2, year, month, day, hour, minute, venue]
function mapMatch(row, phase) {
  const [id, code, team1, team2, y, mo, d, h, mi, venue] = row;
  return {
    id,
    phase,
    group: phase === 'group' ? code : null,
    round: phase === 'playoff' ? code : null,
    team1, team2,
    datetime: isoOf(y, mo, d, h, mi),
    venue
  };
}
const matches = [
  ...SZ.map(r => mapMatch(r, 'group')),
  ...PZ.map(r => mapMatch(r, 'playoff'))
];

// --- stadiums.json (STAD + STAD_EXTRA; jeden řádek STAD je ve zdroji zkrácený) ---
// STAD formát (očekávaný): [name, city, country, capacity, usage, lat, lng, image, wiki]
const stadiums = STAD.map(row => {
  const name = row[0];
  const ex = STAD_EXTRA[name] || {};
  const full = row.length >= 9; // zkrácený řádek (Levi's) full=false
  return {
    name,
    city: row[1] ?? null,
    country: row[2] ?? null,
    capacity_wc: row[3] ?? null,     // kapacita v režimu MS
    capacity_std: ex.stdCap ?? null, // standardní kapacita
    usage: full ? row[4] : null,
    lat: full ? row[5] : null,
    lng: full ? row[6] : null,
    image: full ? ('assets/stadiums/' + row[7]) : null,
    plan: ex.planek ?? null,
    wiki: row[row.length - 1] ?? null,
    address: ex.addr ?? null,
    home_cs: ex.homeCs ?? null, home_en: ex.homeEn ?? null,
    desc_cs: ex.descCs ?? null, desc_en: ex.descEn ?? null,
    fact_cs: ex.factCs ?? null, fact_en: ex.factEn ?? null,
    source_truncated: !full || undefined // příznak jen u zkráceného řádku
  };
});

mkdirSync(OUT, { recursive: true });
const write = (f, obj) => writeFileSync(join(OUT, f), JSON.stringify(obj, null, 2) + '\n');
write('teams.json', teams);
write('matches.json', matches);
write('stadiums.json', stadiums);

console.log('✅ Vygenerováno do assets/seed/ms2026/:');
console.log('   teams.json    :', teams.length, 'týmů');
console.log('   matches.json  :', matches.length, 'zápasů (group', SZ.length, '+ playoff', PZ.length, ')');
console.log('   stadiums.json :', stadiums.length, 'stadionů',
  stadiums.some(s => s.source_truncated) ? '(pozor: 1 zkrácený řádek ve zdroji)' : '');
