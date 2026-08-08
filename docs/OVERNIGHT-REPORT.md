# 🌙 Noční běh — v6.2 rebrand-ready + teaser stránky — ranní report

**Datum:** 8. 8. 2026 · **Branch:** `feat/v6.2-rebrand-ready` · **Produkce:** nedotčena (stále v6.1.0)

## TL;DR
Vše hotovo, všechny 3 test gates **PASS**. Nic nenasazeno, `tipovacka.html` needitována, žádný DB write.
Branch je pushnutý a čeká na tvůj review + merge. Merge = `git checkout main && git merge feat/v6.2-rebrand-ready` (+ deploy jako obvykle).

---

## Co je hotové

### Fáze 1 — Config extraction (rebrand-ready groundwork) ✅
Tournament data MS 2026 vytažená z `tipovacka.html` (jen čteno, **0 editů**) do:
- `config/ms2026.js` — `window.TOURNAMENT_CONFIG` (scoring, hosty, datumy, statistiky, champion/střelec, barvy, cesty k seedům).
- `assets/seed/ms2026/teams.json` — **48 týmů** (`code, name_cs, name_en, group`).
- `assets/seed/ms2026/matches.json` — **104 zápasů** (72 group + 32 playoff; `id, phase, group, round, team1, team2, datetime, venue`).
- `assets/seed/ms2026/stadiums.json` — **16 stadionů** (+ STAD_EXTRA detaily, dvojjazyčně).
- `scripts/gen-seed-ms2026.mjs` — extraktor (parsuje pole z `tipovacka.html`, needituje ji).
- `scripts/validate-seed.mjs` — **TEST GATE**, nezávislý parser.
- `config/_schema.md` — dokumentace formátu pro budoucí turnaje.

**TEST GATE 1: ✅ PASS** — `node scripts/validate-seed.mjs`:
> ✅ PASS — seed přesně odpovídá tipovacka.html (104 zápasů, 48 týmů, 12 skupin — vše shodné).
Porovnává počet/ID/oba týmy/datum-čas/stadion/fázi každého zápasu + úplnost skupin.

### Fáze 2 — Teaser stránky AFCON 2027 + EURO 2028 ✅
`AFCON2027/index.html` a `EURO2028/index.html` — samostatné „coming soon" stránky:
- Low-poly identita shodná s landing v6.1 (logo, faceted grafika, hero polygony, Space Grotesk+Inter, stejné CSS variables).
- Živý **countdown** do výkopu (dny/hod/min/s), status „Připravujeme", hostitelé + vlajky, fakta (týmy/zápasy).
- Sekce „Co to bude" (bodování/žebříček/síň slávy), **předběžný zájem** → `zapis_zajem_secure` RPC (turnaj_id `afcon2027`/`euro2028`).
- Plná CZ/EN (`ms26_lang`), dark/light (`ms26_theme`), `prefers-reduced-motion`, a11y (sr-only/aria/alt), SEO (title/description/canonical/OG/twitter), AYDEA footer, odkaz zpět na `/`. **Bez manifestu.**
- `vercel.json`: přidány rewrites `/AFCON2027` a `/EURO2028`. **Všechny existující rewrites + cron zachovány** (ověřeno).

**TEST GATE 2: ✅ PASS** — obě stránky lokálně (`preview` server):
- countdown běží (AFCON ~315 dní, EURO ~671 dní), tiká po sekundách;
- CZ↔EN přepíná vše, téma přepíná, light+dark čitelné, 0 chyb v konzoli;
- form: nevalidní e-mail → chyba + **žádný fetch**; validní → správný RPC payload `{p_turnaj_id, p_email}`.
- ⚠️ **DB write ZÁMĚRNĚ neproveden** — form ověřen přes `fetch` stub (viz „Rozhodnutí" níže).

### Fáze 3 — Landing teasery ✅
`index.html`: planned karty (AFCON/EURO) mají vedle „Předběžný zájem" i odkaz **„Více info →"** na nové teaser stránky. Bump `APP_VERSION` na **v6.2.0**. Archiv MS 2026 karta beze změny.

**TEST GATE 3: ✅ PASS** — landing se načte, footer v6.2.0, AFCON→/AFCON2027, EURO→/EURO2028, archiv→/tipovacka.html, statistiky i form beze změny, 0 chyb.

### Fáze 4 — Dokumentace ✅
- `docs/rebrand-guide.md` — nová sekce „v6.2 config-driven groundwork".
- `backend/sql/21_future_tournament.sql.draft` — reference SQL (přípona `.draft` = nespouští se).
- `changelog.md` — sekce v6.2.0 (označeno NENASAZENO).
- `HANDOFF.md` — poznámka o branchi v otevřených úkolech (produkční verze nezměněna).

---

## Ověřené datumy turnajů (web search 8. 8. 2026)

| Turnaj | Výkop | Hostitelé | Týmy | Zápasy |
|---|---|---|---|---|
| **AFCON 2027** | 19. 6. 2027 (finále 17. 7.) | Keňa, Uganda, Tanzanie | 24 | 52 |
| **EURO 2028** | 9. 6. 2028 (finále 9. 7.) | **Anglie, Skotsko, Wales, Irsko** | 24 | 51 |

Zdroje: CAF (cafonline.com — „opening 19 June, final 17 July 2027"), UEFA/Sky Sports (euro2028 „9 June – 9 July, 51 fixtures").

⚠️ **Odchylka od zadání — přečti:** zadání uvádělo u EURO 2028 i **Severní Irsko**. Podle
potvrzeného rozpisu UEFA je **Sev. Irsko vypadlo** (stadion Casement Park se nestaví) a
hostiteli jsou jen **Anglie, Skotsko, Wales a Irsko (Rep.)**. Použil jsem přesné 4 hostitele.
Zadaný výkop AFCON „21. 6." jsem opravil na oficiální **19. 6. 2027**.

---

## Rozhodnutí / co jsem záměrně přeskočil

1. **Reálný DB write při testu formuláře — PŘESKOČENO (bezpečnost).**
   Železné pravidlo #3 zakazuje jakýkoli DB write (i INSERT přes RPC). Zadání fáze 2 zároveň
   navrhovalo ověřit form přes `select count(*)` po odeslání. To je konflikt → zvolil jsem
   bezpečnou variantu: form odeslání jsem ověřil přes **stub `window.fetch`** (zachytí URL+payload,
   vrátí fake `{ok:true}`), takže je prokázané, že form volá správné RPC se správnými daty,
   ale **žádný řádek do `turnaj_zajem` nepřibyl**. Živá funkčnost RPC už byla ověřena ve v6.1.0.
   → **Vyžaduje tvé potvrzení:** je RPC path pro tebe „safe write"? Pokud ano, můžeš po mergi
   udělat jeden ostrý test odesláním e-mailu na produkci.

2. **Loader (HTML čte z config/seed místo hardcoded polí) — NEIMPLEMENTOVÁN (mimo rozsah + riziko).**
   Vyžadovalo by editaci `tipovacka.html` (zakázáno) nebo přepis herního jádra. Groundwork
   (data + schéma + validace) je připraven; loader patří na klon pro nový turnaj, ne na archiv.

3. **Anomálie ve zdroji — Levi's Stadium.** Řádek v poli `STAD` v `tipovacka.html` je zkrácený
   (chybí lat/lng/image; má jen 6 z 9 polí). V `stadiums.json` je označen `source_truncated:true`,
   detaily doplněny z `STAD_EXTRA`, foto existuje (`assets/stadiums/levis.jpeg`). Není to chyba
   seedu, jen věrně přenesený stav zdroje — případně oprav v `tipovacka.html` zvlášť (mimo tento běh).

---

## Co ověřit před mergem (doporučený review checklist)

- [ ] `git diff main..feat/v6.2-rebrand-ready` — projít změny (11 souborů, +2529 ř.).
- [ ] Přečíst `config/_schema.md` — sedí formát tvé představě rebrandu?
- [ ] Vizuálně projít `AFCON2027/index.html` a `EURO2028/index.html` (countdown, texty, vlajky).
- [ ] Potvrdit hostitele EURO 2028 (4 vs 5) a orientační časy výkopu (18:00 / 21:00 jsou odhad — countdown jede na den výkopu).
- [ ] `node scripts/validate-seed.mjs` → PASS (můžeš spustit sám).
- [ ] Rozhodnout bod #1 (reálný test formuláře) a #2 (kdy dělat loader).
- [ ] Merge + deploy: `git checkout main && git merge feat/v6.2-rebrand-ready && git push`.

## Doporučené další kroky
1. Po mergi 1× ostrý test předběžného zájmu na produkci (AFCON i EURO), pak `select count(*) from turnaj_zajem`.
2. Až bude jasné, kdy se AFCON/EURO rozjede → rozhodnout „nový Supabase projekt vs. reuse" (viz draft SQL).
3. Zvážit napojení `turnaj_zajem` na e-mail (notifikace při spuštění) — build je připravený sbírat.

---

## Bezpečnostní bilance běhu
✅ Žádný push na `main` · ✅ žádný deploy · ✅ `tipovacka.html` needitována (jen čtena) ·
✅ žádný DB write (jen SELECT + fetch stub) · ✅ `hrace`/`tipy`/`gigs_*` netknuty ·
✅ nic ve `vercel.json`/repu neodstraněno · ✅ vše na feature branchi, reverzibilní.
