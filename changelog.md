# Changelog

Formát `vMAJOR.MINOR.PATCH - D. M. RRRR`. Stejný formát jako footer.

## v5.12.49 - 13. 7. 2026

- **Menu na desktopu** se roztáhne přes celou šířku obsahu (položky rovnoměrně).
- **Vysvětlivky (ⓘ)**: doba zobrazení se řídí délkou textu (3,2–12 s, dřív fixně 3 s) a toast jde zavřít klepnutím.
- **Zakončení** má v menu nové emoji 🏁 (odlišení od 🏆 Turnaj).

## v5.12.48 - 13. 7. 2026

UX batch dle feedbacku:
- **Karta zápasu — transparentní výsledek playoff**: pod skóre po 90 min se nově zobrazí i finále („po prodloužení 3:1 · postup: Argentina" / „na penalty postoupil X") místo matoucího „FT".
- **Timeline gólů**: góly blízko sebe se už nepřekrývají (odstupňování do dvou úrovní).
- **Sdílet výsledek**: velké tlačítko nahrazeno malým „📤 Sdílet" vedle Sestřihu a Statistik.
- **Filtry a submenu na plnou šířku** (hlavně mobil): Řadit dle data/skupin, rychlé filtry (Vše · Dnes · Zítra · Neuložené · 🔥 · ✅ · 🔴 — výsledkové jen emoji s tooltipem), submenu Turnaj (5 položek) i Týmy & hráči vždy na jeden řádek přes celou šířku.

## v5.12.47 - 13. 7. 2026

Přihlášení/registrace: přidán 12s timeout — při zamrzlém síťovém požadavku (mobilní síť, PWA) už nezůstane viset „Připojuji se…", ale zobrazí se chyba připojení a jde to hned zkusit znovu. Backend i login flow ověřeny (RPC < 200 ms).

## v5.12.46 - 13. 7. 2026

Feedback batch 2:
- **Tipy ostatních opraveny** (hlavně mobil): ukotvené sloupce měly rozjeté šířky (th 220px vs. td 148px) → obsah přetékal pod ukotvený výsledek, mizely názvy týmů i ⓘ. Šířky sjednoceny přes CSS proměnné (desktop 230px, mobil 152px), názvy se zalamují, ⓘ viditelné, ukotvená část oddělena stínem. **Badges (SNIPER apod.) u jmen hráčů odstraněny** (rival jen ★).
- **Infoboxy — křížek všude**: i18n refresh mazal křížky přepsáním obsahu; nově je hlídá MutationObserver a doplní je po každém překreslení (vč. boxu v Žebříčku a Soutěže o peníze).
- **Submenu výraznější**: aktivní pod-záložka je plná modrá pilulka se stínem, větší tlačítka, vnitřní oddělení od menu.

## v5.12.45 - 13. 7. 2026

Feedback batch:
- **Menu**: ikonky u všech položek (⚽ 👀 🏅 🏆 👥 💬 🛠️).
- **Submenu (huby)**: opraveno odsazení a přesah — sub-záložky nově navazují na menu v jednom spojeném boxu (desktop i mobil).
- **Infoboxy**: všechny ⓘ boxy jdou skrýt křížkem (po reloadu se zase objeví).
- **Zápasy**: ikonka výkonu (🔥/🟢/🔴) + body se nově zobrazují i adminovi u odehraných zápasů (vč. bonusu za postup), decentně pod tipem.
- **Denní recap přepracován dle vzoru**: odesílatel 🤖 Tipovačka bot, vlajky a české názvy týmů, poznámka „na penalty / v prodloužení postoupil X", tipéři dne, **📊 aktuální pořadí (top 3)**, **📈 skokan / 📉 propad dne**, „Dnes se hraje" v patičce. Čas změněn na **07:00 ČR** (05:00 UTC).
- Oprava: recap počítal pořadí jen z prvních 1000 tipů (PostgREST limit) — nyní stránkuje se stabilním řazením; ověřeno proti DB (320/290/270 přesně sedí).

## v5.12.44 - 13. 7. 2026

**📰 Denní recap v Diskuzi.** Každé ráno v 9:00 se nahoře v Diskuzi objeví automatický souhrn včerejška: výsledky (s prokliky na karty zápasů) + 🏅 tipéři dne (nejvíc bodů za včerejší zápasy). Nová edge fce `daily-recap` + denní cron; žádný zásah do účtů ani příspěvků (karta je mimo vlákno diskuze).

## v5.12.43 - 13. 7. 2026

**Velká reorganizace menu (13 → 7 položek) + veřejné statistiky + novinky.** Záloha: git tag `v5.12.42-stable` + archive/.
- **⚽ Zápasy** (dřív Moje tipy) vstřebaly Výsledky: nové filtry 🔥 Přesné / ✅ Bodované / 🔴 Mimo (fungují ve skupinách i play-off), ikony výkonu a body už byly. Staré odkazy na Výsledky přesměrovány.
- **🏆 Turnaj** — nový hub s pod-záložkami Skupiny · Play-off · **Statistiky** · Stadiony · Historie. Klik na Turnaj otevře aktuální fázi (teď Play-off).
- **📊 Statistiky turnaje zveřejněny** (dřív zamčené v Zakončení): střelci, hráčské/gólové/týmové/stadionové zajímavosti — vše s prokliky. **Auto-aktualizace cronem** (nová edge fce `stats-cron`, každých 10 min doplní góly/asistence, boxscore, hráče i návštěvy nově dohraných zápasů).
- **Týmy & hráči** — druhý hub (Týmy · Hráči).
- **Zakončení** je nyní čistě tipérské (turnajový blok nahrazen odkazem na Statistiky).
- **Tipy ostatních**: sloupce Zápas + Výsledek jsou ukotvené — při posunu do stran se hýbou jen hráči a tipy.
- **Karta zápasu**: okamžitá **timeline gólů** z naší cache (střelci, minuty, penalty/vlastňáky, domácí nahoře/hosté dole) — nečeká na ESPN.
- **Zajímavost dne** v boxu „Dnes se hraje" (rotuje denně: top střelec, nejrychlejší gól, asistence, penalty…).
- **Karta týmu**: „Nej střelec na MS" se průběžně aktualizuje o letošní góly (např. Messi 13 + 8 letos = 21).

## v5.12.42 - 13. 7. 2026

**Nová záložka 🧑 Hráči + opravy kapacit stadionů + prokliky hráčů všude.**
- **Záložka Hráči** v menu: žebříčky Góly / Asistence / G+A / Střely / Karty / Brankáři + fulltext hledání hráče či týmu; klik na hráče → profil, na tým → stránka týmu.
- **Prokliky na hráče z karty zápasu**: góly, karty, střídání i sestavy (hřiště + lavička) jsou klikací → profil hráče (lazy načtení dat).
- **Profil hráče rozšířen**: ⌀ na zápas (góly, asistence, střely, fauly; brankář zákroky/obdržené) + střelecká konverze; jména hráčů mají vlaječku týmu.
- **Kapacity stadionů opraveny** (všech 16): staré hodnoty byly před-turnajové odhady — u 14 stadionů byla reálná návštěva vyšší než uváděná kapacita. Nově oficiální čísla (Wikipedia/FIFA), sedí s max. návštěvami z ESPN (Azteca 80 824, MetLife 80 663…).
- **🏟️ Stadionové zajímavosti v Zakončení**: celková a ⌀ návštěvnost, vyprodané zápasy (69 ze 100!), nejvyšší ⌀ návštěva, nejgólovější/nejchudší stadion — s prokliky na stadiony.
- Vlaječky týmů doplněny do gólových zajímavostí a týmových rekordů.

## v5.12.41 - 13. 7. 2026

Zakončení — ceny za remízy rozděleny: **🤝 Remízový král** = nejvíc trefených remíz; **❤️ Milovník remíz** = nejvyšší podíl remízových tipů (styl, min. 30 hodnocených).

## v5.12.40 - 13. 7. 2026

**Hráčské profily + hráčské zajímavosti.**
- Nová tabulka `player_match_stats` (3 158 řádků, 100 zápasů, jen additivní) — per-zápas staty všech nastoupivších hráčů z ESPN soupisek. Ověřeno křížem: góly 278=278, asistence 211=211 vs. minuty gólů.
- **Profil hráče**: klik na jméno hráče (střelci, asistence, hattricky, penalty, vlastňáky, hráčské zajímavosti) otevře kartu — zápasy/góly/asistence/střely/karty/fauly (brankář: zákroky, obdržené, čistá konta) + seznam zápasů s G/A s proklikem; klik na tým otevře profil týmu.
- **🧑 Hráčské zajímavosti** (Turnaj): nejvíc karet, brankář turnaje, nejvíc čistých kont, žolík ze střídačky (54 gólů po střídání!), nejefektivnější střelec, nejvíc střel bez gólu, nejfaulovanější hráč, největší faulista.
- Texty: odstraněny popisky „(ESPN)" ze Zakončení; cena „Sázka na jistotu" přejmenována na **🤝 Remízový král** (= kdo tipoval nejvyšší podíl remíz).
- Admin „Načíst chybějící" doplňuje minuty gólů, týmové i hráčské staty naráz.

## v5.12.39 - 13. 7. 2026

**Asistence + návštěvy + prokliky na týmy všude.**
- 🅰️ **Asistence z ESPN** (nový sloupec `goal_minutes.assist`, backfill 100 zápasů, 211 asistencí): střelecká tabulka má sloupec Asist., nově **Král asistencí** a **🍁 Kanadské bodování (G+A)**.
- 🏟️ **Návštěvy a rozhodčí** (nové sloupce `match_stats.attendance/referee`): největší návštěva (s proklikem), průměrná návštěva, nejvytíženější rozhodčí.
- **Prokliky na profil týmu**: karta zápasu (klik na název týmu v hlavičce), Zakončení (síla týmů, agregáty, čitelnost — všechny názvy týmů), rozpis v profilu týmu (soupeři). Tabulka/Výsledky/Tipy už měly.

## v5.12.38 - 13. 7. 2026

Zakončení — **oprava rozdělení filtru Tipovačka vs. Turnaj**. Blok Turnaj dřív obsahoval i statistiky o tipérech; nově čisté rozdělení:
- **📊 Tipovačka**: podium, ceny, 🌐 Tipovačka v číslech (nejtěžší/nejlehčí zápas dle bodování, překvapení, rekordy tipérů), 👑 bitva o titul, 🧬 podobnost tipérů, 🎯 extra tipy, vysvědčení hráče.
- **🏟️ Turnaj**: pouze fotbal — král střelců, gólové zajímavosti, nejpozdější gól, síla týmů, týmové rekordy a agregáty.

## v5.12.37 - 12. 7. 2026

Zakončení — sekce 🏟️ Turnaj rozšířena o kompletní balík statistik (vše z existujících dat, s prokliky na zápasy):
- 🥅 **Gólové zajímavosti** doplněny: gólovost (⌀/zápas, bez branek), nejgólovější zápas, góly v nastavení (45+/90+), **otočky** (vítěz prohrával), **hattricky** + dvougólové výkony, prodloužení (z toho penalty).
- ⚔️ **Síla týmů**: top 5 ofenziv a defenziv (celkem + ⌀/zápas), nejvíc čistých kont, **čitelnost pro tipéry** (na kterém týmu hráči nejvíc/nejméně bodovali).
- 📊 **Týmové agregáty (ESPN)**: fair-play vs. nejtvrdší tým, střelecká konverze (nejchladnokrevnější / nejvíc střel na gól), nejvyšší ⌀ držení míče, **„vyhrál bez míče"**, král rohů, nejvíc ofsajdů, brankářská zeď.

## v5.12.36 - 12. 7. 2026

- **Žebříček — mini graf předělán**: místo kumulativní čáry (která z principu vždy končila nahoře a nic neříkala) nově **5 sloupečků = body za posledních 5 zápasů** (zelená přesný / oranžová +rozdíl / modrá vítěz / červená mimo) + vysvětlivka pod žebříčkem a tooltip s přesnými hodnotami.
- **Zakončení — filtr sekcí** nahoře: Vše / 📊 Tipovačka / 🏟️ Turnaj (vysvědčení hráče přesunuto do sekce Tipovačka).

## v5.12.35 - 12. 7. 2026

Zakončení — **turnajové statistiky týmů a hráčů** (zamčené, jen admin). Sekce rozdělena na „📊 Statistiky tipérů" a „🏟️ Turnaj v číslech — týmy a hráči".
- ⚽ **Král střelců — průběžné pořadí** (top 8, z toho penalty, v kolika zápasech skóroval) — přímá vazba na Extra tipy.
- 🥅 **Gólové zajímavosti**: nejrychlejší gól (2' Saibari), penalty proměněné 14× / **neproměněné 6×** (jména + minuta + proklik na zápas, mj. Messi 2×), vlastní góly 14× (s prokliky), histogram gólů podle minut (75 gólů v 76.–90.+!).
- 📈 **Týmové rekordy** z ESPN boxscore: nejtvrdší zápas (fauly+karty), nejvíc střel, nejjednoznačnější držení míče, nejvíc rohů, brankářský koncert — vše s proklikem na zápas.
- Nová cache `match_stats` + edge fce `match-stats-sync` (ESPN boxscore + penaltové události); admin tlačítko „Načíst chybějící" nově plní i statistiky.
- Ověřeno: 97/97 zápasů, penalty konzistentní (14 proměněných + 6 neproměněných = 20 kopaných dle boxscore).

## v5.12.34 - 12. 7. 2026

Opravy dle zpětné vazby hráčů:
- **LIVE filtr v Moje tipy** — hledá nově napříč fázemi (živé playoff zápasy se zobrazí, i když je zvolená skupinová část; dřív ukazoval prázdno).
- **Remízové tipy v play-off:**
  - Při ukládání remízového tipu **bez postupujícího** se zobrazí varování (+3 b by propadly) s možností se vrátit.
  - Uložený remízový tip bez postupujícího jde nově **doplnit dodatečně** — přímo v řádku zápasu, ale jen **do výkopu**. Po výkopu se zobrazí „bez tipu na postup".
- **Prokliky na stadiony** — klik vede vždy na **konkrétní stadion** (scroll + zvýraznění): opraveno v Moje tipy (dřív jen obecně na Stadiony) a přidán proklik i z karty zápasu. Ověřeno pokrytí všech 104 zápasů.

## v5.12.33 - 5. 7. 2026

Moje tipy — u odehraných zápasů nově decentní **ikonka výkonu** (🔥 přesný / 🟢 správný trend / 🔴 mimo) na bodovém řádku pod tipem, sladěná s Výsledky. Vejde se na desktop i mobil, tipování budoucích zápasů beze změny.

## v5.12.32 - 5. 7. 2026

Výsledky — nový **filtr podle tvého tipu**: Vše · 🔥 Přesné · ✅ Bodované · 🔴 Mimo (chip lišta pod řazením, funguje ve skupinách i play-off).

## v5.12.31 - 5. 7. 2026

Balík oprav a vylepšení:
- **„Doplnit chybějící tipy"** — tlačítko nyní přepne na správnou fázi (skupiny/playoff) + resetuje filtr a doscrolluje na první chybějící tip (dřív nedělalo nic, když byl chybějící tip v jiné fázi).
- **Header mini widgety** — „Tipy: skupiny" odkazuje do skupinové fáze, „Tipy: play-off" do playoff (dřív oba stejně).
- **Výsledky, sloupec „Můj tip"** — přesný tip = 🔥, správný trend = zelená tečka, mimo = červená tečka; u každého decentně počet získaných bodů (vč. bonusu za postup).
- **Zakončení:**
  - Stupně vítězů graficky vylepšeny (barvy medailí, jasné 1./2./3. místo na sloupci).
  - Grafy: popisky os přesunuty pod graf jako malý čitelný popisek (dřív „zápasy →" uvnitř grafu, zvětšené a matoucí jako tlačítko).
  - „Tvůj turnaj v kostce" a „Den po dni" jdou nově posouvat i na desktopu (kolečko myši → vodorovně + tažení, viditelný scrollbar).
  - Čeština: „Nejdelší série trefů" → „Nejdelší bodovací série".

## v5.12.30 - 5. 7. 2026

Admin může nově upravit i **postupujícího** u tipů (playoff remíza), nejen skóre:
- RPC `admin_upsert_tip_secure` rozšířena o `p_postup` (stejná validace jako u hráče: jen remízový tip na play-off, jinak null).
- V admin matici: klik na buňku playoff zápasu → po zadání remízového skóre se admin zeptá i na postupujícího (H = domácí / A = host).
- Oprava dat: Jendak6 u Brazílie–Norsko (z91) doplněn postup Brazílie (tip 1:1 zůstává).

## v5.12.29 - 5. 7. 2026

Zakončení — úpravy dle zpětné vazby (stále zamčené, jen admin):
- **Smolař/lucker závěru nově bodově** — místo pouhé změny výsledku (H/D/A) se počítá ztráta/zisk bodů pozdním gólem (85.–90.+), takže se chytnou i ztracené **přesné tipy** (např. z89 Kanada–Maroko: Jendak6 tipoval 0:2, gól v 90+8 → 0:3, přišel o přesný tip). U každého zápasu skóre před→po + kolik bodů to udělalo.
- **Graf kumulativních bodů**: přidána 4. (úzká) linie **1. místo (průběžný lídr)** = kdo zrovna vedl, vedle finálního vítěze.
- **Čeština**: „Přesných trefů" → „Přesných tipů"; „Nejčastěji přetipoval / Tvůj přemožitel" → „Nejčastěji jsi přebodoval / Nejčastěji tě přebodoval (N× víc bodů)".
- **Po zveřejnění** (`FINALE_PUBLIC=true`) bude Zakončení **první tab** + domovská obrazovka + welcome popup jako první slide (ostatní login popupy potlačeny). Zatím neaktivní (zamčené).

## v5.12.28 - 2. 7. 2026

**Oprava ručního „Načíst výsledky z ESPN" u play-off.** Dřív ukládalo finální skóre včetně prodloužení (přepsalo správná data z cronu) → rozbilo bodování remízových tipů (Belgie–Senegal uloženo 3:2 místo 2:2 po 90').
- Edge fce `results-refresh` nově dopočítá server-side správné řádky `resolved` = 90' skóre + postupující u play-off (stejná logika jako cron, prodloužení se nepočítá). Multi-day fetch zachován.
- Klient upsertne `resolved` (vč. postupujícího, čímž maže i staré chybné hodnoty); když `resolved` chybí, spadne zpět na staré mapování (bezpečná degradace).
- Data z81 Belgie–Senegal opravena na 2:2 + postupující H.
- Ověřeno: server vrací z81 = 2:2/H (ne 3:2), z80 2:1, z82 2:0; klientská transformace + fallback otestovány.

## v5.12.27 - 2. 7. 2026

Odstraněno tlačítko **„Navrhnout tip" (🤖)** u zadávání tipů — nefungovalo spolehlivě (navrhovalo pořád 1:1) a na mobilu bylo stejně skryté. Minimální zásah: tlačítko se nevykresluje, ostatní logika tipování beze změny.

## v5.12.26 - 2. 7. 2026

**Oprava bodování postupujícího (+3).** Bonus se nově uděluje **jen za správně tipnutou remízu + správného postupujícího** — přesně jak popisují pravidla.
- Dřív ho dostal i ten, kdo tipoval **výhru** u zápasu, který skončil remízou po 90' (tj. špatný výsledek = 0 bodů základ, ale i tak +3). To bylo nelogické.
- Opraveno konzistentně na dvou místech: serverová funkce `get_leaderboard_snapshot_secure` (chirurgický `regexp_replace` jen bloku bonusu, zbytek funkce byte-identický) + klientský `calcAdvBonus`.
- Dopad: **5 hráčů −3 body** (Belgie–Senegal 2:2 — tipovali výhru Belgie). Pořadí se nepřeskládalo. Ostatní beze změny.
- Ověřeno: ground-truth SQL (staré vs. nové body), tělo funkce po zásahu, 9 unit-testů klienta.

## v5.12.25 - 1. 7. 2026

Zakončení — **prezentační vrstva** (zamčené, jen admin). Dávka 3/N.
- 🎉 **Welcome popup s konfetami** při otevření (jméno šampiona) + tlačítko „🎉 Úvod" na přehrání.
- 📖 **Tvůj turnaj v kostce** — swipe karty (Spotify-Wrapped styl): tipy, přesné, série, nejlepší den, sólo trefy, pozdní góly, umístění.
- 🗓️ **Den po dni** — sloupcová timeline bodů (zeleně nej den, červeně nejslabší).
- 📤 **Sdílení vysvědčení** — tlačítko vygeneruje obrázek 1080×1350 (medaile + 6 statistik) → Web Share / stažení PNG.
- Ověřeno v preview: konfety (canvas + úklid), obrázek (validní PNG), story/timeline render.

## v5.12.24 - 1. 7. 2026

Zakončení — **reálné minuty gólů z ESPN** (nová cache, zamčené jen admin). Dávka 2b/N.
- Nová tabulka `goal_minutes` + edge funkce `goal-minutes-sync` (stahuje minuty gólů z ESPN, jen veřejná data).
- **🕐 Uteklo o pozdní gól** (smolař) / **🍀 Zachránil pozdní gól** (lucker): gól v 85.–90.+ min otočil výsledek — bez něj bys tipoval správně. Nahrazuje proxy „rozdíl ≤1".
- Ceny **😈 Smolař závěru / 🍀 Lucker závěru** dle reálných dat.
- Turnaj v číslech: **🕐 Nejpozdější gól** + počet zápasů rozhodnutých pozdním gólem.
- Admin lišta: „Minuty gólů X/Y načteno" + tlačítko dohrání z ESPN.
- Ověřeno proti DB: všech 79 zápasů rekonstrukce 90' = skóre; 10 zápasů otočeno pozdním gólem; nejpozdější gól Arnautović 90+12' (z56).

## v5.12.23 - 1. 7. 2026

Zakončení — **🌍 Turnaj v číslech** (globální statistiky, zamčené, jen admin). Dávka 2/N.
- Nejtěžší / nejlehčí zápas (kolik hráčů bodovalo), 😱 největší překvapení (výsledek nejvíc proti kurzům + kdo ho trefil).
- 🔥 Rekordy: nejvíc bodů v jednom zápase (kdo a v jakém) + nejdelší série trefů.
- 👑 **Bitva o titul** — graf vývoje bodů TOP 4 (kdo kdy vedl).
- 🧬 **Podobnost tipérů** — nej/nejméně shodné dvojice (% stejných tipů).
- 🎯 **Extra tipy odhaleny** — vítěz turnaje / král střelců každého hráče vs. skutečnost.
- Ověřeno proti DB: nejtěžší zápas #13 (0/14), nejlehčí #25 (14/14), 98 přesných trefů.

## v5.12.22 - 1. 7. 2026

Zakončení — detailní rozbor hráče + nové ceny (zamčené, jen admin). Dávka 1/N.
- Nová sekce **🔎 Detailní rozbor**: konzistence (rozptyl bodů → stabilní/houpačka), úspěšnost u gólových vs. opatrných zápasů, nemesis/nejlepší tým, body co ležely, „uteklo o gól" (smůla vs. těsná trefa), věštec na outsidery (dle kurzů).
- Nové ceny: **🎰 Věštec, 😈 Smolař, 🍀 Šťastlivec, 🪨 Nejstabilnější**.
- Pozn.: „uteklo o gól" = zápasy rozhodnuté rozdílem ≤1 (minuty gólů neukládáme).
- Ověřeno: outsider/kurzová logika i metriky na reálných datech.

## v5.12.21 - 1. 7. 2026

Zakončení — vysvětlivky, klikací zápasy, ceny/superlativy (zamčené, jen admin).
- **Viditelné vysvětlivky** „ⓘ Co znamenají statistiky?" (rozklikávací — funguje i na mobilu, ne jen hover).
- **Klikací zápasy** ve vysvědčení → otevřou detail karty (statistiky + tipy ostatních).
- **🏅 Ceny turnaje**: Šampion, Snajpr, Prorok, Sólo král, Král série, Riskér, Sázka na jistotu, Skupinový/Playoff král, Nejlepší den — automaticky z dat.

## v5.12.20 - 1. 7. 2026

Zakončení / vysvědčení — vylepšení dle feedbacku (stále zamčené, jen admin).
- Jasnější dlaždice + **tooltipy** u každé (co přesně znamená); „přesných · 15 %" pohromadě místo matoucí zvlášť „přesnost".
- Nová dlaždice **sólo trefy** (přesné trefy, které nikdo jiný netrefil).
- Nová sekce **🎯 Všechny přesné trefy** (výpis zápasů).
- Nová sekce **🌟 V čem jsi jiný** (sólo trefy + nejlepší „proti proudu").
- Nová sekce **⚔️ Rival** (koho nejčastěji přetipoval / tvůj přemožitel).
- Grafy mají **popisy os** (hodnoty + „zápasy →").
- **Kumulativní graf** nově porovnává **ty vs. průměr vs. vítěz** v jednom.
- Engine ověřen proti reálným datům; sólo trefy ověřeny proti DB.

## v5.12.19 - 1. 7. 2026

Zakončení turnaje / vysvědčení tipéra — ZAMČENÝ náhled (jen admin).
- Nová záložka **🏆 Zakončení** (zatím vidí jen admin, `FINALE_PUBLIC=false` → zveřejní se až na schválení).
- **Pódium** top 3 + **vysvědčení každého hráče** (lze projet kohokoliv přes výběr).
- Statistiky: body, přesných, úspěšnost, ⌀ b/zápas, přesnost %, body za postup, nejdelší série, trefené remízy, nejlepší den, největší trefa, DNA stylu.
- **Grafy** (SVG): skladba tipů (donut), body podle fáze, kumulativní body, vývoj pořadí.
- Core čísla brána ze **serverového žebříčku** + ověřovací plaketa „✓ sedí se žebříčkem" (engine ověřen proti reálným datům: Adam 247, Michal 221 vč. postupu, Jendak6 219).

## v5.12.18 - 1. 7. 2026

Oprava (jádro): tipy ostatních se u nezačatých playoff zápasů nezobrazovaly (ořez 1000 řádků).
- **Příčina:** funkce `get_visible_tips_secure` vracela tipy jako tabulku a PostgREST ořezal odpověď na 1000 řádků. V DB je 1101 tipů; seřazené dle čísla zápasu se do 1000 vešly jen zápasy do č. 78, takže **všech 96 tipů na playoff 79+ se useklo** (týkalo se hlavně admina, ale i běžní hráči už měli přes 1000 viditelných tipů).
- **Oprava:** funkce nyní vrací **jeden JSON agregát** (`jsonb_agg`) místo tabulky → 1 řádek, žádný ořez. Data byla celou dobu v pořádku, jen se odpověď tiše usekla.
- Odstraněn dočasný diagnostický řádek.

## v5.12.17 - 1. 7. 2026

Diagnostika (dočasná) pro dohledání proč admin nevidí cizí tipy.
- V „Tipy ostatních" se adminovi ukáže řádek se stavem: verze appky, kolik hráčů má načtené tipy, celkem tipů, loadOK. + tlačítka „Načíst tipy znovu" a „Vyčistit cache + obnovit" (odregistruje starý service worker a promaže cache).

## v5.12.16 - 1. 7. 2026

Oprava: admin neviděl cizí tipy u nezačatých zápasů v tabulce Ostatní.
- **Skutečná příčina** (konečně): tabulka „Tipy ostatních" skrývala cizí tipy u ještě nezačatých zápasů podle pravidla „vidíš, jen když jsi tipoval nebo zápas začal" a **nebrala ohled na admina**. Proto jsi od Mexiko–Ekvádor dále (nezačaté playoff zápasy) viděl jen svoje. Data i RPC přitom byla celou dobu v pořádku (admin dostává všechny tipy).
- **Oprava:** admin teď v tabulce Ostatní (i u bonusových tipů) vidí **všechny cizí tipy**, konzistentně s kartou zápasu a admin záložkou. Běžným hráčům zůstává fér skrývání nezačatých zápasů beze změny.

## v5.12.15 - 1. 7. 2026

Oprava: cizí tipy se u někoho nenačítaly (stará verze z cache) + odolnost.
- Ověřeno kompletně: DB data neporušená (zápas 79 má všech 13 tipů), funkce/RPC vrací data správně (HTTP 200), frontend render funguje. Příčina: **service worker servíroval starší HTML z cache** (byl o verzi pozadu).
- **SW přepnut na network-first** – appka teď vždy načte nejnovější verzi, cache jen jako offline záloha.
- **loadAllTips self-heal**: když načtení cizích tipů selže nebo přijde prázdné, samo to zkusí ještě jednou; karta zápasu si tipy sama donačte a obnoví.

## v5.12.14 - 30. 6. 2026

Admin: postupující v tipech + přilepená hlavička.
- V admin tabulce tipů se nově u play-off remízových tipů ukáže **zvolený postupující** (→ vlajka) + po zápase ✓/✗ a **bonus +3** přímo v buňce.
- **Přilepená hlavička** se jmény hráčů (drží se nahoře při scrollu dolů) + **přilepený první sloupec** se zápasem (drží se při vodorovném scrollu) — už je vždy jasné, který tip je čí.

## v5.12.13 - 30. 6. 2026

Dvě opravy: počet gólů na hřišti + postupující v tipech ostatních.
- **Sestava na hřišti:** u hráče s víc góly se teď zobrazí **počet** (např. ⚽2). Dřív se číslo nevešlo.
- **Tipy ostatních (play-off):** když někdo tipne remízu, je teď vidět **koho zvolil na postup** (→ vlajka + tým) — v kartě zápasu i v tabulce Ostatní, jako admin i hráč. Po zápase ✓/✗ a **bonus +3** za správného postupujícího se ukáže přímo u tipu.
- (DB: `get_visible_tips_secure` nově vrací i sloupec `postup`.)

## v5.12.12 - 30. 6. 2026

Pavouk – KOMPLETNÍ oprava osmifinálových feederů dle oficiálního FIFA bracketu.
- Zdroj pravdy: ESPN **core API `matchNumber`** (= oficiální FIFA číslo zápasu) + feeder placeholdery s ověřeným pořadím. Předchozí pokusy vycházely z chybně přečtené tabulky.
- Správné napojení osmifinále: 89←Z73,**Z76** (Kanada × vítěz Niz–Maroko), 90←**Z75,Z78**, 91←Z74,**Z77**, 95←Z86,**Z87**, 96←Z85,**Z88**. (92,93,94 i celé čtvrtfinále/semifinále/finále už byly správně.)
- Ověřeno: 0 nesrovnalostí proti ESPN, bijekce 32, a kontrola proti reálné situaci (Kanada vs vítěz Nizozemsko–Maroko).

## v5.12.11 - 30. 6. 2026

Footer datum automaticky dle posledního deploye.
- Datum ve footeru se teď bere **automaticky z `Last-Modified` souboru** (= reálné datum nasazení), takže už nikdy nebude staré. Fallback = konstanta (taky aktualizována).
- Pozn.: HEAD požadavek obchází service worker i cache, takže datum je vždy čerstvé.

## v5.12.10 - 29. 6. 2026

Pavouk – předrátování feederů dle oficiálního FIFA bracketu.
- Ověřeno proti oficiální FIFA struktuře (přes stadiony) i proti živým ESPN datům: naše napojení sedělo celé kromě **prohozených domácích feederů u osmifinále 90 a 91**.
- Opraveno: **osmifinále 90** ← vítězové **Z76 a Z77** (Philadelphia), **osmifinále 91** ← vítězové **Z74 a Z78** (MetLife). Tím vítěz zápasu Z74 (např. Brazílie) správně postupuje do zápasu 91, jak má dle FIFA/ESPN.
- Zbytek pavouka (88–104, čtvrtfinále, semifinále, finále) byl správně. Validace: bijekce 32, 0 topologických porušení.

## v5.12.9 - 29. 6. 2026

Pavouk – oprava rozsypané návaznosti po doplnění postupujících.
- **Bug:** feeder topologie se parsovala z aktuálních názvů týmů. Jakmile se „Vítěz Z73" přepsal na reálný tým (např. „Canada"), parser selhal a strom se rozsypal → osmifinálové zápasy končily vedle špatných 16F zápasů (proto se Kanada objevila vedle Brazílie).
- **Oprava:** feedery se nově čtou z **původních placeholderů** zachycených při startu (nezávisle na přepsaných týmech). Pavouk teď navazuje správně – postupující tým sedí u svého 16F zápasu.

## v5.12.8 - 29. 6. 2026

Pavouk play-off – spojovací čáry mezi koly.
- Bracket nyní **vizuálně navazuje**: každá dvojice zápasů je propojená spojovací čárou do navazujícího zápasu (16F → osmifinále → čtvrtfinále → semifinále → finále). Dřív tam byly jen krátké pahýly, takže to vypadalo jako nepropojené plovoucí boxy.
- Zarovnání bylo už dřív přesné (každý zápas přesně mezi svými dvěma feedery), doplněny tedy jen klasické bracket spojnice.

## v5.12.7 - 28. 6. 2026

Sestavy: góly/karty/střídání výrazně přímo na hřišti (jako FlashScore/ESPN).
- Odznáčky nyní sedí **přímo na dresovém kolečku hráče**: **⚽ gól** (vč. počtu), **🟨/🟥 karta** v rohu, **červená ↓** u vystřídaných hráčů – výrazné a na první pohled čitelné.
- Sekce **Střídání** ukazuje příchozí (▲) i s jejich góly/kartami.

## v5.12.6 - 28. 6. 2026

Sestřih rovnou rozbalený + spolehlivost, sestavy bohatší a hezčí.
- **Sestřih se u dohraných zápasů rozbalí rovnou** při otevření karty (velký 16:9, dominantní). Znovu klik na tlačítko = sbalí.
- **Oprava „videa nefungují":** přehrávač přes YouTube IFrame API zachytí selhání (práva na obsah, nebo zablokovaný YouTube blokovačem reklam) a **automaticky ukáže náhled s prokliknutím „Přehrát na YouTube"** místo mrtvé černé plochy. Vždy tedy funkční odkaz.
- **Sestavy hezčí + víc info:** hřiště s vápny, u hráčů ikonky **⚽ gólů, 🟨🟥 karet a ▼ vystřídání**, a nová sekce **Střídání** (kdo přišel na hřiště). Data z ESPN mapovaná přes ID hráče (spolehlivé).
- Pozn.: hodnocení hráčů (rating) stále nelze – Livesport/SofaScore blokují přístup.

## v5.12.5 - 28. 6. 2026

Sestavy na hřišti s rozestavením (jako FlashScore).
- V kartě zápasu se **základní sestavy** nově zobrazují **na hřišti dle rozestavení** (formace, čísla + jména, obě mužstva na jednom hřišti) místo prostého seznamu. Data z ESPN (formace + pozice hráčů), bezpečně, bez scrapingu.
- Pozn.: **hodnocení hráčů (6.0, 5.4…) z Livesportu/SofaScore přidat nelze** – tyto služby blokují automatický přístup (403/CORS), proto je u hráčů nezobrazujeme.
- Když ESPN u zápasu pozice nedodá, automatický fallback na původní seznam.

## v5.12.4 - 28. 6. 2026

Video sestřih přímo v kartě zápasu (YouTube embed).
- Tlačítko **▶ Sestřih** u dohraných zápasů nyní **přehraje video přímo v appce** (rozklikávací 16:9 přehrávač, znovu klik = sbalí).
- Video se dohledává přes **YouTube Data API** s preferencí **oficiálních kanálů (FIFA aj.)** před spamem; nalezené ID se **cachuje 1× na zápas** v DB (tabulka `match_media`) → minimální kvóta.
- API klíč je uložen **jen na serveru** (privátní tabulka `app_secrets`, čte výhradně edge funkce přes service-role) – nikdy ve frontendu ani v gitu.
- Když se sestřih nenajde, tlačítko bezpečně **otevře YouTube vyhledávání** (fallback). Embed = `youtube-nocookie.com`.

## v5.12.3 - 28. 6. 2026

Karta zápasu – odkaz na detail vede přímo na zápas.
- Tlačítko **📊 Statistiky & sestavy** nyní vede **přímo na stránku daného zápasu na ESPN** (statistiky, sestavy) – spolehlivý deep-link, funguje v ČR. Fallback na cílené vyhledávání, pokud se zápas zatím nedohledá.
- Pozn.: přímý odkaz na hodnocení hráčů (SofaScore/WhoScored/Livesport/FotMob) nelze garantovat – tyto služby blokují automatizovaný přístup (403) a CORS; proto deep-link na ESPN, který je dostupný a stabilní. (YouTube embed sestřihů se chystá zvlášť.)

## v5.12.2 - 28. 6. 2026

Karta zápasu – externí odkazy u dohraných zápasů.
- **▶ Sestřih** – odkaz na YouTube vyhledání highlightů zápasu (oficiální FIFA/vysílatel, funguje v ČR).
- **📊 Hodnocení hráčů** – odkaz na vyhledání hodnocení hráčů (Livesport/WhoScored/SofaScore).
- Záměrně **pouze odkazy ven, žádný scraping** – tyto služby nemají veřejné API a blokují roboty; bezpečné, nic neohrožuje appku ani data.

## v5.12.1 - 28. 6. 2026

Doladění bonusu za postupujícího + transparentnost.
- **Bonus za správného postupujícího je 3 body** (dřív 5) — konzistentní s 3 body za vítěze; +1 za rozdíl skóre zůstává.
- **Tabulka bodů** doplněna do info boxu, Pravidla/FAQ i popupu: 10 přesný · 3 vítěz/remíza · +1 rozdíl · +3 postup.
- **Žebříček** nově ukazuje samostatně „+Xb postup" u hráče (leaderboard funkce vrací sloupec `adv`), ať není bonus jen schovaný v součtu.

## v5.12.0 - 28. 6. 2026

**Play-off: tipuje se výsledek po 90 minutách + tip na postupujícího (+5 b).** Velký, pečlivě připravený zásah.
- **Skóre = základní hrací doba (90 min)** jako u sázkovky. Prodloužení se do skóre nepočítá (cron dopočítá 90' z ESPN linescores po poločasech; admin může opravit). Penaltový rozstřel se do skóre nepočítá.
- **U remízového play-off tipu** se objeví výběr „Kdo postoupí?" (vlajky domácí/hosté). Za správného postupujícího **+5 bodů** — plošně pro všechny, kdo trefí (i u rozhodného tipu se bere tipovaný vítěz). Bonus jen u zápasů rozhodnutých po remíze v 90' (prodloužení/penalty).
- Bodování jinak beze změny: 10 přesný / 3 vítěz-remíza / +1 rozdíl. Skupiny zcela beze změny.
- DB: nové sloupce `tipy.postup`, `vysledky.postupujici`; leaderboard funkce + save RPC rozšířeny (bonus počítá autoritativně server). cron-results v8.
- UI: výběr postupujícího u tipu, zobrazení u uloženého tipu (✓+5 / ✗), info box v Play-off fázi, doplněno do Pravidla/FAQ, **jednorázový vyskakovací popup** pro všechny vysvětlující systém.
- Bezpečně: nové sloupce nullable, skupiny i účty nedotčeny, vše ověřeno (bodovací logika na 7 případech, 90' výpočet na reálných datech, UI v preview).

## v5.11.4 - 28. 6. 2026

Transparentní info o bodování play-off. V záložce Moje tipy se ve fázi Play-off zobrazí info box: tipuje se výsledek po základní hrací době **i prodloužení**, penaltový rozstřel se nepočítá (zápas na penalty = remíza, skóre po prodloužení). Stejná věta doplněna do Pravidla/FAQ. Plný i18n. (Beze změny bodovací logiky - jen zprůhlednění stávajícího chování.)

## v5.11.3 - 28. 6. 2026

**Pavouk se teď doplňuje i v otevřené appce** (nejen po reloadu/přihlášení). Dřív server (cron) doplnil rozlosované týmy do DB správně, ale otevřená appka je načítala jen při přihlášení - proto auto-refresh ani tlačítko VÝSLEDKY pavouk neaktualizovaly.
- Nová `refreshPlayoffNames()` napojená na **auto-refresh (každých 30 s)** i na tlačítko **VÝSLEDKY** - obojí teď doplní nově rozlosované play-off týmy do pavouka, Tipů i Výsledků a překreslí (jen když se něco změnilo, nepřerušuje psaní tipu).

## v5.11.2 - 28. 6. 2026

**Částečný resolve play-off** - rozhodnuté týmy se zobrazí, i když soupeř ještě není znám.
- Dřív se zápas play-off doplnil jen když byli známí OBA týmy. Proto se týmy z dohraných skupin (Anglie, Chorvatsko, Ghana...) neukázaly, dokud nebyli rozhodnuti jejich soupeři (3. místa / další skupiny).
- Nově se doplní každá strana zvlášť: pavouk i Tipy ukáží „Anglie vs ?" hned, jak je Anglie jistá. Tipovat půjde po doplnění obou týmů.
- cron-results v7: částečný resolve (stačí jedna strana), široké okno 12 dní. Frontend `applyZapasyMetaNames` + pavouk doplněny per-tým. Aktuálně známé strany doplněny hned.

## v5.11.1 - 28. 6. 2026

Dva fixy:
- **Footer datum** - konstanty data verze nebyly aktualizované (zůstaly 12.6.). Opraveno na 28.6.2026.
- **Tlačítko „Tipni teď"** (banner odpočtu) nereagovalo, když nejbližší nezatipovaný zápas byl play-off a v Moje tipy byla aktivní fáze Skupiny → input nebyl v DOM. Nově tlačítko nejdřív přepne na správnou záložku, fázi (Skupiny/Play-off) a zruší filtr, pak skočí na políčko + zvýrazní řádek.

## v5.11.0 - 28. 6. 2026

**Záložka Play-off předělána na pořádný pavouk (bracket strom).** Dřív jen syrové sloupce boxů. Nově:
- Vizuální bracket strom - feeder dvojice u sebe, navazující zápas vycentrovaný mezi nimi, propojovací linky.
- Karty s vlajkami, skóre, **zvýrazněním postupujícího** (vítěz tučně/zeleně, poražený zašedlý; u remízy/penalt dle toho, kdo je v dalším kole).
- LIVE indikátor u probíhajícího zápasu, datum + stadion, klik otevře detail zápasu.
- Box **vítěze turnaje** 🏆 + zápas o 3. místo zvlášť.
- Horizontální scroll (standard pro pavouk), funguje na mobilu i desktopu. Nerozhodnuté zápasy ukazují placeholder, doplní se samy.

## v5.10.6 - 17. 6. 2026

Fix: u prohozených zápasů (oprava rozpisu v5.10.4) chyběly kurzy. Příčina: párování kurzů vyžadovalo shodu pořadí domácí/host s Odds API, a poslední sync proběhl před opravou rozpisu. Opraveno dvojím způsobem:
- **Párování kurzů nezávislé na pořadí** domácí/host (robustní i pro budoucí play-off, kde Odds API může mít jiné pořadí než my). Kurzy se přiřadí podle našeho pořadí týmů.
- **Kurzy znovu načteny** pro všech 24 prohozených zápasů (z10 Švýcarsko–Bosna apod.) - 71/72 skupin teď má kurzy (chybí jen odehraný z7, který je nepotřebuje). Plná záloha `match_odds_bak_oddsfix`.

## v5.10.5 - 17. 6. 2026

**OPRAVA PLAY-OFF (73-104) + skupinové stadiony.** Navazuje na v5.10.4 (skupinové datumy). Zjištěno, že celý play-off pavouk byl postavený jinak než oficiální/ESPN rozpis (jiné datumy, stadiony i párování dvojic).

- **Play-off kompletně přestaveno dle ESPN** (autoritativní zdroj): správné datumy, stadiony, pořadí i bracket struktura (kdo s kým hraje). Ověřeno: bijekce 32↔32 zápasů, 0 topologických porušení (každý zápas je po svých feeder-zápasech). PZ v `tipovacka.html` + `zapasy_meta`.
- **Bezpečné:** play-off má 0 uložených tipů (placeholdery nelze tipovat), takže žádná migrace tipů. Auto-resolve (v5.9.1) navíc plní reálné týmy dle času. Plná záloha `zapasy_meta_bak_pzfix`.
- **Skupinové stadiony** opraveny dle ESPN u 42 zápasů (kosmetika - jen fotka/štítek). ESPN přejmenoval Azteca→Estadio Banorte.
- Vše ověřeno proti ESPN, JS validní, odehrané zápasy nedotčeny.

## v5.10.4 - 17. 6. 2026

**OPRAVA ROZPISU SKUPIN dle oficiálního/ESPN rozpisu.** 46 ze 72 skupinových zápasů mělo špatný čas/datum, z toho 24 i prohozené domácí/hosty (vs. realita). Všechny chyby byly u budoucích zápasů; 26 OK a všech 19 odehraných bylo správně (nedotčeno).

- **Časy/data** opraveny u všech 46 zápasů (SZ v `tipovacka.html` + `zapasy_meta`).
- **Domácí/hosty** srovnány na oficiální pořadí u 24 zápasů. Aby hráči o nic nepřišli, **uložené tipy na těchto zápasech byly automaticky prohozeny** (tip „X:Y" → „Y:X") — predikce zůstává identická, jen v novém pořadí týmů. Ověřeno: 47/47 tipů, 0 chyb, plná záloha (`tipy_bak_szfix`, `zapasy_meta_bak_szfix`).
- Bezpečnost: vše zálohováno před změnou, každý krok ověřen proti ESPN (0 zbylých neshod), odehrané zápasy beze změny.

Pozn.: stadiony (venue) u některých přeřazených zápasů ještě neodpovídají – kosmetické (jen fotka/štítek), neovlivňuje tipy ani skóre; oprava zvlášť. Play-off datumy prověřím samostatně.

## v5.10.3 - 13. 6. 2026

**FIX: prohlížeč nenabízel uložení hesla při loginu.** Přihlašovací i registrační pole byla v `<div>`, ne ve `<form>` – Firefox/Chrome nabídnou uložení přihlašovacích údajů spolehlivě jen při submitu skutečného formuláře. Login i registrace jsou teď `<form>` se submit handlerem (preventDefault → doLogin/doReg), pole mají `name` atributy. Enter i klik fungují stejně jako dřív, jen browser teď nabídne „Uložit heslo". Žádná změna v auth logice.

## v5.10.2 - 13. 6. 2026

**FIX: rozdělaný tip se mazal po ~15-30 s.** Příčina: live poll (každých 30 s, během hracího dne) překresloval seznam Tipů a smazal neuložené hodnoty v políčkách. Dvě vrstvy opravy:
- Live poll už **nepřekreslí Tipy, když právě píšeš** (kurzor v políčku tipu).
- `renderTipy()` při jakémkoli překreslení **zachová rozdělané neuložené hodnoty + fokus a pozici kurzoru** (chrání i proti ostatním zdrojům re-renderu, ne jen pollu).

## v5.10.1 - 13. 6. 2026

LIVE proužek nahoře je nově klikací – klik na probíhající zápas otevře jeho kartu (detail). Dřív šlo otevřít jen přes malé „i" u řádku zápasu, které v proužku nebylo. Mapování na zápas přes názvy týmů, kliknutí obsluhuje existující globální listener.

## v5.10.0 - 13. 6. 2026

Dvě nové funkce (F12 + rozšíření achievementů):

- **F12 Sdílení výsledku zápasu (PNG):** v kartě zápasu u dohraného zápasu, kde máš svůj tip, je tlačítko "📤 Sdílet výsledek". Vyrenderuje hezký obrázek (týmy + vlajky, finální skóre, tvůj tip + body, 🔥 u přesného) a nabídne Web Share (mobil) nebo stažení (desktop). Čistě canvas, žádný zásah do řádků tabulky (vyhnutí se původnímu riziku F12 s `.mr`).
- **Achievementy v profilu hráče:** klik na jméno v žebříčku → detail nově ukazuje grid 10 achievementů (splněné barevně, nesplněné zašedlé s popisem jak je získat): První zásah, Sniper, Ostrostřelec, Ve formě, Mág remíz, Black Sheep, Comeback, Kompletista, Stovkař, Lídr. Počítáno z reálných tipů/výsledků, plný i18n. Kompaktní badge v řádku žebříčku zůstávají beze změny.

## v5.9.7 - 13. 6. 2026

Žebříček – ke všem 4 boxíkům dashboardu (Přesné tipy, Správné trendy, Bonus za rozdíl, Úspěšnost) přidáno nenápadné „i" v rohu s vysvětlivkou statistiky. Na desktopu hover tooltip, na mobilu tap → toast. Plný i18n.

## v5.9.6 - 13. 6. 2026

Dva fixy z reálného provozu:

- **iOS posuvník hráčů (Tipy ostatních + Admin):** tah za slider iPhone interpretoval jako posun celé stránky (rubber-band). Přidáno `touch-action:none` na slider (gesto zůstane na posuvníku), `overscroll-behavior-x:contain` na tabulku (konec rubber-bandu) a `env(safe-area-inset-bottom)` odsazení nad home indikátor. Slider je i o něco vyšší (snazší chycení).
- **Žebříček "Úspěšnost" přepočítána na výstižnější metriku:** dřív `body / (zápasů × 10)` = podíl z teoretického maxima (přesný tip v každém zápase), což trestalo i velmi dobré tipující (2/4 přesné + 1 trend = jen 57 %). Nově = **% zápasů, kde jsi trefil aspoň vítěze/remízu** (přesné + správné trendy / ohodnocené). Stejný příklad → 75 %. Sub-popisek ukazuje "X/Y zápasů", tooltip vysvětluje výpočet. Změněno i v dashboardu i v řádkovém success baru.

## v5.9.5 - 12. 6. 2026

Fix: v Tipy ostatních sloupec "Můj tip" nezobrazoval 🔥 u přesného tipu (ostatní hráči ho měli). Sjednoceno - 🔥 se ukazuje i u vlastního přesného tipu.

## v5.9.4 - 12. 6. 2026

i18n sjednocení live označení: v CZ všude **ŽIVĚ** (badge u zápasu, LIVE filter chip, karta zápasu, admin hláška), v EN všude **LIVE**. Předtím mix obojího v obou mutacích. Filter chip se nově přejmenovává i při přepnutí jazyka.

## v5.9.3 - 12. 6. 2026

**HOTFIX: LIVE indikátor mizel během zápasu.** ESPN posílá statusDesc "First Half"/"Second Half"/"Extra Time"/"Penalty Shootout" - live filtr znal jen "In Progress"/"Halftime"/"Live"/"Stoppage", takže zápas v 1./2. poločase vypadl z LIVE banneru, badge i živé projekce. Rozšířen regex + o poločase (clock=0) zápas zůstává live se štítkem "HT". Objeveno během Kanada-Bosna (First Half, 37′).

## v5.9.2 - 12. 6. 2026

Fix zavádějící "Poslední aktualizace výsledků" + live propagace cron výsledků.

- **"Poslední aktualizace výsledků"** (Výsledky, Tabulka, admin sync) nově ukazuje novější z: ruční admin refresh vs. **server cron sync** (`app_sync_statuses.last_updated_at`, klient ho čte každých 30 s). Předtím jen localStorage z ručního kliknutí - vypadalo to, že se nic neděje, i když cron běžel.
- **Auto-stažení nových výsledků do otevřené appky:** když poll detekuje dohraný zápas, který klient ještě nemá v `results`, sám zavolá `loadResults()` + přepočet žebříčků a překreslení (header, Tabulka, Pavouk, Žebříček). Guard `__resultsReloadBusy` proti souběhu. Předtím se nový výsledek objevil až po reloadu stránky.

## v5.9.1 - 12. 6. 2026

**Plně automatický play-off** - na rozlosování pavouka už není potřeba myslet:

- **cron-results v5:** když ESPN event nematchne žádný zápas podle jmen, spáruje se podle času výkopu (±2 h) s play-off řádkem, který má ještě placeholder názvy ("2. sk.A", "Vítěz Z73"...) → UPDATE `zapasy_meta` na reálné názvy. Jen při jednoznačném kandidátovi, max 8/běh, reálné názvy nikdy nepřepisuje. Telemetrie `meta_updated_ids` v sync detailu.
- **Frontend:** po loginu načte `zapasy_meta` (id ≥ 73) a přepíše placeholdery v pavouku/Tipy/Výsledky na lokální názvy (reverse alias mapping ESPN → CZ). Tím se automaticky aktivují i tip inputy, vlajky, kurzy a auto-save výsledků pro play-off.
- Fallback: když mapování selže (přejmenování na ESPN apod.), placeholdery zůstanou a vše funguje jako dřív (ruční režim).

## v5.9.0 - 12. 6. 2026

**Live wave + automatizace** (UX balík dle Adamova výběru):

- **Živá projekce žebříčku:** během live zápasu box "Živá projekce" v celkovém žebříčku - kdyby zápasy skončily aktuálním skóre: +body a posuny pozic (#3 → #1 ▲). Auto-refresh každých 30 s.
- **Tipy odhaleny po výkopu:** `get_visible_tips_secure` nově vrací tipy všech hráčů u zápasů po kickoffu (migrace `v5_9_0_reveal_tips_after_kickoff` + nová tabulka `zapasy_meta` se 104 zápasy). Před výkopem se nic nemění.
- **Auto-ukládání výsledků (cron-results v4):** cron každé 2 min sám uloží dohrané zápasy do `vysledky` (mapování přes `zapasy_meta` + aliasy, kickoff ±48 h guard). Insert-only - existující výsledek NIKDY nepřepíše (admin korekce mají přednost). Bez dalších ESPN callů.
- **Karta zápasu: vzájemné zápasy (H2H)** z ESPN (match-summary v2).
- **Ranní recap:** jednou denně v Tipy souhrn "Včera: +X b (Y× přesný) · aktuálně #N / Dnes: M zápasů, chybí ti tipy". Křížkem zavřít pro daný den.
- **Export do kalendáře (.ics):** tlačítko 📅 Kalendář vedle Export CSV - nadcházející zápasy s připomínkou 30 min předem. Čistě client-side.
- **Admin stale-data varování:** červený banner v Admin overview, když cron výsledků mlčí > 10 min během hracího dne.
- **Mobil: horní 3 info boxy přes celou šířku** - dokud není play-off (skrytá 4. karta), grid 3 sloupce místo 4 (prázdná čtvrtina pryč), trochu větší písmo.

## v5.8.0 - 12. 6. 2026

**Karta zápasu** - rozklikávací detail zápasu odevšad (tlačítko ⓘ u zápasu v Tipy, Výsledky, Tipy ostatních, Pavouk i v kartě týmu).

- **Obsah z lokálních dat (okamžitě):** vlajky + týmy, skóre/odpočet/LIVE stav, skupina/kolo, datum, stadion (+ foto), FIFA ranking obou týmů, kurzy, tipy všech hráčů s body (stejná pravidla viditelnosti jako Tipy ostatních - bez vlastního tipu nevidíš)
- **ESPN detail (lazy, až po rozkliknutí):** statistiky zápasu (držení, střely, rohy, fauly, karty, zákroky, přesnost přihrávek), góly a události (střelec, asistence, karty, střídání s minutáží), základní sestavy s formací, rozhodčí + návštěva
- **Nová edge funkce `match-summary`** (proxy ESPN scoreboard + summary, CORS-safe, jen čtení - nezapisuje do DB)
- **Výkon:** detail se stahuje až po otevření karty; dohraný zápas se cachuje v localStorage navždy, live zápas 60 s; mapování zápas → ESPN event id se cachuje trvale. Načtení appky beze změny.
- ESPN sekce degraduje při výpadku/změně API - karta vždy ukáže aspoň lokální data
- Tlačítko ⓘ je samostatný element s capture listenerem - žádný konflikt s input poli tipů (vyhnutí se F14 problému)

## v5.7.3 - 11. 6. 2026

Větší UX wave (F9-F15):

- **F9 Doplnit chybějící tipy CTA:** v Tipy taby tlačítko "📝 Doplnit chybějící tipy (X)" - skoč na první budoucí nezatipovaný zápas + pulse highlight + focus na input
- **F10 Admin shortcut bar:** sticky lišta nahoře v Admin tabu (VÝSLEDKY / TÝMY / FIFA / KURZY) - proxy klik na existující buttony v hlavičce, neduplikuje logiku
- **F11 Můj progress dashboard:** 4-card panel nahoře v Tipy (Tipy, Body, Vůči Ø s ±, Chybí) - hned vidíš stav
- **F13 Live admin overview:** v Admin tabu 4 karty (Hráčů, Celkem tipů, Odehráno, Bez tipu dnes) + seznam jmen kdo nezatipoval dnešní zápas
- **F15 Comeback toast po pozici:** localStorage snapshot tvé pozice - po update žebříčku, pokud se pozice změnila, toast "🚀 Posun nahoru o 2! Aktuálně #3"

Přeskočeno (riziko rozbít stávající):
- F12 (sdílení výsledku zápasu) - vyžaduje canvas rendering, podobné Q4. Přidává event listenery na `.mr` které mají input fields. Skip.
- F14 (detail řádku zápasu po kliknutí) - click bubbling by zachytával i klik do input tipu. Tipy ostatních tab to už pokrývá. Skip.

## v5.7.2 - 11. 6. 2026

Quick wins UX paket (QW1-5):

- **QW1 Sticky header row:** v Tipy ostatních + Admin tabulky. Při scroll dolů hlavička s jmény hráčů zůstává viditelná.
- **QW2 Live indikátor u zápasu:** v Tipy + Výsledky + Tipy ostatních se u běžícího zápasu zobrazí pulzující 🔴 LIVE chip s minutáží a aktuálním skóre. Data z `pollLiveScores` (každých 30s).
- **QW3 LIVE filter chip:** v Tipy taby. Skryje se když žádný zápas neběží, automaticky se objeví během live zápasu. Klik → ukáže jen probíhající zápasy.
- **QW4 Progress bar úspěšnosti** v žebříčku: tenký gradient bar (modrá → zelená) pod statistikou každého hráče. Šířka = jeho úspěšnost v % (capped na 100%).
- **QW5 Skupinový chip:** modrá značka "A", "B", "C"... před názvy týmů v Tipy, Výsledky a Tipy ostatních. Pro skupinovou fázi - usnadní orientaci mezi 72 zápasy.

## v5.7.1 - 11. 6. 2026

UX polish - scroll a paid info.

- **Floating scrollbar (Posun hráčů) i na desktopu** v Tipy ostatních - předtím jen mobile. Při hodně hráčích už nemusíš lovit horizontální scrollbar pod tabulkou.
- **Floating scrollbar v ADMIN tabu** (desktop + mobil) - stejný pattern jako u Tipy ostatních. Pro admina který má 9+ hráčů a tipy přes 104 zápasů byla horizontální navigace hrůza.
- **Žebříček PAID filter:** info box už neukazuje vstupné/účet/zprávu/deadline (po startu turnaje irelevantní). Zobrazí jen Pool a Rozdělení výher.

## v5.7.0 - 11. 6. 2026

VÝSLEDKY refresh fix pro start turnaje.

- **Edge function `results-refresh` v6:** fetcha **3 dny** ze scoreboard ESPN (včera/dnes/zítra UTC) - pokrytí timezone overlap + delayed ESPN updatů. Předtím fetchla jen "default" view (často jen "dnešní" zápasy v US timezone)
- **Frontend `fetchResults`:** lepší feedback po refreshi:
  - "Live: X zápas(ů) probíhá. Výsledky se uloží po jejich skončení." pokud běží zápasy
  - "Žádné odehrané zápasy. X nadcházející." pokud jen scheduled
  - "✓ X" pokud completed match nalezeny (původní)
- Frontend pořád filtruje jen `completed=true` zápasy - to je správně, body se přidělí až po dohrání

**Test:**
- ESPN core API ukazuje Mexiko-RSA jako "First half, 25'" (live)
- ESPN scoreboard endpoint má delay, pro live zápas vrátí SCHEDULED ještě po skončení (~10-15 min)
- Frontend teď ukáže "Live: 1 zápas" místo matoucího "tournament_not_started"
- Po dohrání zápasu a aktualizaci ESPN scoreboard → tlačítko VÝSLEDKY uloží 1:0 (nebo cokoliv)

## v5.6.9 - 10. 6. 2026

**SKUTEČNÝ KONEČNÝ ROOT CAUSE - registrace ukládala UNSALTED hash.**

- **Bug:** `registruj_hrace_secure` (z F3 security migrace, existoval od začátku) ukládala frontend's `sha256(plain)` **bez saltu** přímo do `pin_hash`. Naproti tomu `auth_hrac_secure_by_id` očekávala buď:
  - Path 2: hash == hash (frontend posílá hash, DB má hash - fungovalo náhodou když frontend posílal hash a ne plain)
  - Path 3: plain + DB sha256(plain+salt+jmeno) - **NEMATCHALO**, protože DB hash byl unsalted, ne salted
- **Důsledek:** existující SHA-256 hráči (Adam184 + většina) - když frontend posílal plain do RPC, auth selhával ("Neplatný PIN"). Login fungoval skrz Path 2 (frontend hash = DB hash), ALE všechny následné RPC s plain (`get_visible_tips_secure`, `ulozit_tipy_secure`, `get_tip_trends_secure`, `get_leaderboard_snapshot_secure`) selhaly.
- **Fix (migrace `v5_6_9_auth_support_unsalted_hash` + `v5_6_9_fix_registration_to_bcrypt`):**
  - Přidána **Path 4** do `auth_hrac_secure_by_id` i `auth_hrac_secure_by_name`: porovnání `sha256(plain)` UNSALTED s DB hashem. Při match → lazy migrate na bcrypt
  - `registruj_hrace_secure` nově ukládá rovnou **bcrypt** (ne unsalted sha256) - žádný další účet se už nerozbije
- **Otestováno:** test účet (PIN "184184") prošel auth, hash automaticky migroval na bcrypt
- **Migrace existujících sha256 hráčů na bcrypt proběhne automaticky při jejich příštím loginu**

## v5.6.8 - 10. 6. 2026

**KRITICKÝ FIX - SKUTEČNÝ root cause tipy ostatních + uložení tipů pro Adama (admin).**

- **Bug:** `auth_hrac_secure_by_id` (volaná všemi RPC po loginu - `get_visible_tips_secure`, `ulozit_tipy_secure`, `get_tip_trends_secure`, atd.) **neuměla aliasy**. Pro hráče který byl přejmenován (Adam = "Adam" → "Adam184" s aliasy [Adam, adam]) DB obsahuje hash s původním jménem (`sha256(plain + salt + "Adam")`). Funkce porovnávala jen s **primary jménem** (`sha256(plain + salt + "Adam184")`) → vždy fail → "Neplatný PIN" → catch handler → prázdné `allTips`.
- **Důsledek:** Adam184 (jediný admin) nikdy neviděl tipy ostatních ani nemohl uložit tipy přes RPC. Login fungoval, protože `auth_hrac_secure_by_name` (login funkce) aliasy už uměla.
- **Fix:** rozšířit `auth_hrac_secure_by_id` aby zkusila SHA-256 hash s primary jménem **i se všemi aliasy**. Pokud match na alias → lazy migrate na bcrypt.
- **DIAG toast z v5.6.7 odstraněn** - root cause potvrzen, debug už není třeba.

## v5.6.7 - 10. 6. 2026

Diagnostický toast po loginu (DIAG: tipy=X hracu=Y OK/FAIL err=...) - jednorázový debug.

## v5.6.6 - 10. 6. 2026

Session restore detekuje hash v poli `pin`.

- Bug: localStorage mohla obsahovat `s.pin = unsalted_sha256_hash` (z mezivýrobní verze kde session ukládalo hash jako "pin" omylem). Restore pak nastavila `myPin = hash` místo plain → všechny RPC volání selhala s "Neplatný PIN" → tipy ostatních prázdné, save tipů nešlo
- Fix: pokud `s.pin` má formát SHA-256 hex (64 char hex), session se považuje za legacy → smazat + force re-login (s pre-fillem jména)
- Po re-loginu se uloží `s.pin = plain` (správně) → vše funguje

## v5.6.5 - 10. 6. 2026

Revert auto-logout v loadAllTips - způsoboval infinite loop login → logout.

- `loadAllTips()` při chybě **už neauto-logoutuje** - jen tiše vyresetuje `allTips={}` (stejné chování jako v <v5.6.3)
- Auto-logout zůstává v `saveTipsWithPin()` (user-initiated akce, tam je smysluplný)
- Přidána diagnostika: `window.__loadAllTipsLastOk` a `window.__loadAllTipsLastErr` v window scope pro inspect přes browser console

## v5.6.4 - 10. 6. 2026

Auto-recovery při auth fail v RPC.

- `loadAllTips()` a `saveTipsWithPin()` při zjištění auth chyby ("Neplatný PIN") automaticky vyhodí toast "Relace vypršela" + po 1.5s force logout → uživatel se ocitne na login overlay
- Tím se prevence "polovičního loginu" - zastaralá session se sama opraví, uživatel se přihlasí znovu a vše funguje
- Týká se zejména starých klientů s legacy `myPin` (unsalted SHA-256) - místo "nic nefunguje a nevím proč" se sám zachytí + vyzve k novému přihlášení

## v5.6.3 - 10. 6. 2026

**SKUTEČNÝ root cause tipy ostatních fixed.**

- **Bug:** SQL funkce `get_visible_tips_secure` (non-admin větev) měla **ambiguous column reference**:
  ```sql
  where ... or t.zapas_id in (select zapas_id from own_matches)
  ```
  PostgreSQL si nebyl jistý, jestli `zapas_id` v subquery odkazuje na CTE column NEBO na PL/pgSQL OUT parameter (RETURNS TABLE column). Vyhazovalo `ERROR: 42702: column reference "zapas_id" is ambiguous` při KAŽDÉM volání pro non-admin.
- **Důsledek:** všichni non-admin hráči (8/10) vždy dostali výjimku z `loadAllTips()` → catch handler → `allTips={}` → tipy ostatních prázdné. Bug existoval od v4.9 (8. 4. 2026) - dva měsíce!
- **Fix:** alias CTE column `zapas_id as om_zid`, použít `select om_zid from own_matches` ve WHERE - žádná ambiguity.
- **Datum:** APP_VERSION_DATE_CS/EN bumped na 10.6.2026 (předtím chybělo aktualizovat při každém release - pojď to dělat příště).

## v5.6.2 - 10. 6. 2026

Auto-update + friendly re-login UX.

- **Auto-reload při SW update:** Service Worker pošle klientovi `postMessage({type:'sw-updated'})` po dokončení aktivace nové verze. Frontend zachytí, ukáže toast "Nová verze X.Y.Z - načítám..." a po 800ms automaticky reloadne stránku. **Žádný manuální reinstall PWA ani F5 už nebude potřeba** po budoucích deploys.
- **Initial install protection:** první SW install (uživatel nikdy neměl SW controller) neudělá reload - zbytečné na čerstvém openu.
- **Friendly re-login pro legacy session:** místo "smaž a začni od nuly" se pre-fillne jméno + zobrazí hláška "Bezpečnostní aktualizace - zadej prosím PIN znovu." + focus na PIN field. Týká se jen jednorázové migrace z v5.6.0 → v5.6.1+ (storage hash → plain).

## v5.6.1 - 10. 6. 2026

**CRITICAL BUGFIX** - tipy ostatních / všechny non-login RPC pro SHA-256 uživatele.

- **Root cause:** frontend ukládal `myPin = sha256(plain)` **bez saltu/jména**, ale DB pro SHA-256 hráče má `sha256(plain + 'ms2026salt' + jmeno)` **se saltem**. Login (`prihlasit_hrace_secure`) fungoval díky `p_pin_plain` fallback cestě, ALE všechny následné RPC volání (`get_visible_tips_secure`, `get_tip_trends_secure`, `get_leaderboard_snapshot_secure`, atd.) vyhodily auth fail → catch handlery tiše vynulovaly data.
- **Důsledek:** SHA-256 hráči (Adam184, Dave80, Milano, Vojtech, Šuker, Wojtyla, Paul Scholes, Kala, Michal Roubal - 8/10 hráčů) neviděli tipy ostatních, žebříček mohl být prázdný, tendence taky.
- **Fix:**
  - `doLogin` / `doReg`: `myPin = p` (plain) místo `myPin = pinHash`
  - Storage: ukládat `{pin: myPin}` místo `{pin_hash: myPin}` (plain místo hashe)
  - Session restore: pokud máš `s.pin` (plain) → použij; pokud máš jen legacy `s.pin_hash` → smaž session + force re-login
- **Bezpečnost:** plain PIN v localStorage není o nic horší než SHA-256 hash (4-6 cifer = 10000-1M možností, SHA-256 brute-force triviální). A plain PIN je nutný pro bcrypt verify po lazy migraci.
- **UX dopad:** všichni hráči musí po updatu znovu zadat jméno + PIN (legacy storage se smaže).

## v5.6.0 - 8. 5. 2026

PIN reset flow (F8) - admin reset + user self-change.

- **Backend (Supabase migrace `v5_5_2_pin_reset_change`):**
  - `admin_reset_pin_secure(admin_id, admin_pin, target_id)` - admin generuje hráči náhodný 6místný PIN (bcrypt), funkce vrací plain PIN k zobrazení adminovi
  - `change_pin_secure(hrac_id, old_pin, new_pin)` - hráč si změní vlastní PIN (verify old → set new bcrypt)
- **Admin tab:** tlačítko `🔑 Reset PIN` vedle každého hráče - confirm → vygeneruje nový PIN → clipboard copy + alert s instrukcí poslat hráči
- **Pravidla tab → Můj účet:** tlačítko `🔑 Změnit PIN` + custom modal (3 inputy: old/new/confirm) - po uložení update session
- CZ + EN lokalizace všech labels
- Bcrypt hashing (nikdy plain do DB), kompatibilní s legacy SHA-256 hráči (přes aliases také)

## v5.5.1 - 8. 5. 2026

Mobile header KPI cards stretching fix.

- Bug v `@media(max-width:520px)` - `grid-template-areas: 'brand right' 'stats'` měl jen jedno jméno na druhém řádku (grid má 2 sloupce) → stats se renderoval jen v prvním 1fr sloupci a nechával prázdné místo vpravo
- Fix: `'stats stats'` - karty teď roztahují přes celou šířku headeru a jsou rovnoměrně rozložené (`repeat(4,1fr)` z v2.7)

## v5.5.0 - 7. 5. 2026

Login cleanup.

- Z přihlašovací stránky odstraněn boxík **"💰 Soutěž o peníze (volitelně)"** - byl moc rušivý
- Paid league info zůstává viditelná po přihlášení (onboarding 4. slide) a v záložce **Pravidla / FAQ**
- JS funkce `refreshPaidLoginBox` ponechána (no-op když chybí element) - safe pro budoucí použití

## v5.4.9 - 7. 5. 2026

iOS PWA notch fix.

- `body` padding: `env(safe-area-inset-*)` ze všech 4 stran - hlavička už nelize pod iPhone notch / status bar (důsledek `viewport-fit=cover` z v5.4.8)
- Login overlay (`.lo-wrap`) také safe-area aware - title se nepřekrývá se status barem
- Status bar style zachován jako `black-translucent` (modern edge-to-edge look)

## v5.4.8 - 7. 5. 2026

iOS PWA zoom fix.

- Viewport: `maximum-scale=1, viewport-fit=cover` (předtím iOS po focusu na input zazoomovalo a po blur to nevrátilo - typický iOS PWA bug)
- `-webkit-text-size-adjust:100%` na html i body (iOS někdy v PWA standalone módu škáluje text při změně orientace)
- `@media (max-width:640px) input/select/textarea {font-size:16px!important}` - definitivní safety net (iOS Safari auto-zoom triggeruje na inputech s fontem <16px)

## v5.4.7 - 7. 5. 2026

Light theme readability fix.

- `.ibox` (info bannery) v light theme: tmavší modrá `#1e40af` místo `#93c5fd` (světlá modrá byla na bílém pozadí špatně čitelná)
- Lehce silnější border + i ikona má v light tmavší modrou

## v5.4.6 - 7. 5. 2026

UI fix - korunka pryč.

- 👑 emoji u 1. místa: úplně odstraněno (přečuhovalo z karty, rušilo layout)
- Top-1 zachovává zlatý gradient + zlatou medaili + LEADER badge - vizuálně dostatečné

## v5.4.5 - 7. 5. 2026

UI fix - korunka na top-1 kartě.

- 👑 emoji u 1. místa: posunuto z pravého kraje (kde se překrývalo se skóre) do levého horního rohu s rotací -12°
- Menší font (.95rem) - méně rušivé
- Také rename Adam → Adam184 (display) s aliasy [Adam, adam] pro login backward-compat
- 💰 paid league badge u všech platících i v hlavním žebříčku (předtím jen v paid filteru)
- Fix paid league filteru - cache->object mapping přidal `in_paid_league` lookup z `players[]`

## v5.4.2 - 7. 5. 2026

Live scoreboard (B3) + clickable header cards.

- **Live banner** nahoře (sticky): zobrazí 🔴 LIVE + max 3 zápasy s skore + minutáží, jakmile pg_cron / admin vrazí do `app_sync_statuses.results.parsed_events` live data
- Polling z DB každých 30s (jen když tab visible) - **0 ESPN volání z klientů**
- Nová edge funkce `cron-results` (verify_jwt:false, chráněna `CRON_SECRET` headerem) - parsuje ESPN scoreboard a ukládá events do `app_sync_statuses`
- DB: `vysledky.status` sloupec ('final' / 'live' / 'pending') + index
- Pro plnou automatiku adminstrátor nastaví `CRON_SECRET` env v Supabase + pg_cron job (manuální setup, návod v handoff)

## v5.4.1 - 7. 5. 2026

Header KPI cards interactive + responsive.

- Karty v hlavičce **proklikávací**: ⚽ Odehráno → Výsledky, 🏟 Tipy: skupiny → Moje tipy, 🏆 Tipy: play-off → Moje tipy s play-off filterem, 🏅 Pořadí → Žebříček
- Karta `Tipy: play-off` **schovaná** dokud play-off není vylosované (testuje se přes `isPlayoffOpened()` - alespoň 1 zápas v PZ má známý tým)
- Keyboard navigation (Tab + Enter/Space)

## v5.4.0 - 7. 5. 2026

UI polish wave (A1+A2+B4+C2 z visual wishlist).

- **A1 Dashboard cards**: barevně diferencované gradient pozadí (modrá / zelená / fialová / zlatá), hover lift + glow
- **A2 Top 3 medaile**: 1. místo zlatý gradient + 👑 ikona + pulse animace, 2. stříbrný, 3. bronzový
- **B4 Match countdown banner**: sticky banner v Tipy tabu pro nezatipované zápasy do 24h ("Mexiko - JAR · Výkop za 2h 15m") + Tip teď CTA tlačítko
- **C2 Active tab**: čára dole + transparent pozadí místo plně vyplněného modrého tlačítka

Skip A3 (tip inputs) - layout tight, B3 (live scoreboard) - čeká na schválení safe varianty.

## v5.3.3 - 7. 5. 2026

UI fix.

- Dark theme jako default (předtím auto-detect dle systému; light měl některé špatně viditelné prvky)
- EN název zkrácen: `TIPPING CHALLENGE WC 2026` → `WC TIPPING 2026` (vejde se do hlavičky)

## v5.3.2 - 7. 5. 2026

Custom doména.

- Primární URL: **https://tipovacka.chabrycity.cz/tipovacka.html**
- Vercel custom domain napojen přes CNAME `tipovacka` → `cname.vercel-dns.com` (Shoptet DNS panel)
- HTTPS cert přes Let's Encrypt (Vercel automaticky)
- Legacy URLs (`*.vercel.app`, `adamsky184.github.io`) zachované pro PWA installs

## v5.3.1 - 7. 5. 2026

Paid league polish.

- Admin tab: samostatný sloupec "💰 Soutěž o peníze" s nadpisem (předtím schované v Akce)
- Onboarding: nový 4. slide o paid lize (zobrazí se i při re-onboardingu)
- FAQ/Pravidla: paid league rozdělené do strukturovaných bullet pointů (vstupné, účet, zpráva, deadline, distribuce, jak to funguje, disclaimer)
- Login overlay paid box + onboarding + FAQ vždy odkazují na "Pravidla" tab
- Tlačítko "Označit" → "Mark paid" pro jasnost

## v5.3.0 - 7. 5. 2026

Volitelná soutěž o peníze (paid league).

- Sloupec `hrace.in_paid_league` + secure RPC `admin_toggle_paid_league_secure`
- Login overlay info box: vstupné 300 Kč, účet 1972281083/0800, deadline před prvním výkopem
- FAQ/Pravidla: paid league sekce s disclaimerem
- Admin tab: 💰 toggle u každého hráče + souhrn paid pool s payout breakdown
- Žebříček: filter chip `Vše / 💰 Paid` + 💰 badge u placených hráčů
- Distribuce výher dle počtu: 2-4 vítěz vše, 5-7 split 75/25, 8+ split 65/25/10
- PAID_LEAGUE config v top-of-script konstantách (rebrand ready)

## v5.2.2 - 7. 5. 2026

UI polish patch.

- Odds pill design (lepší vizuál kurzů pod zápasem)
- Mobile layout fix - tip inputs a tendence se nepřekrývají (74px / 104px)
- AI suggester button skrytý na mobile (málo místa)

## v5.2.1 - 7. 5. 2026

Toast + diagnostika patch.

- Toast notifikace u KURZY místo skrytého status pruhu
- Edge funkce odds-refresh v4: vždy uloží sync_status (i při chybě/0 events) s detailem
- Auto-reload UI po úspěšném KURZY refreshi (kurzy se hned zobrazí u zápasů)

## v5.2.0 - 7. 5. 2026

Velká feature wave (Q1-Q10 + L1-L2).

- Q1 Konfeta animace při uložení tipu
- Q2 Toast "Tvůj tip se shoduje s X% hráčů" po uložení
- Q3 Auto dark/light theme dle systému (`prefers-color-scheme`)
- Q4 Sdílení žebříčku jako PNG (Web Share API + download fallback)
- Q5 Onboarding tutorial 3 obrazovky (admin/hráč rozlišení)
- Q6 Quick stats toast po loginu (poslední rated tip)
- Q7 Haptic feedback při uložení (`navigator.vibrate(50)`)
- Q8 Empty state humor texty
- Q9 Loading skeleton u žebříčku
- Q10 Nové badges: BLACK SHEEP + COMEBACK
- L1 AI tip suggester 🤖 (heuristika dle FIFA ranking)
- L2 Detail page hráče (modal: best/worst tipy, head-to-head)
- B1 fetchTeamPackage přes edge funkci team-detail-refresh
- B2 alert() v admin → showToast notifikace
- B3 CSP meta tag (default-src self + supabase + ESPN + fonts)
- B4 APP_VERSION konstanta (single source of truth)
- B5 autocomplete + aria-label na buttonech
- B6 i18n admin tabulkové hlavičky
- B8 Account delete UI (GDPR)
- B10 Frontend refactor na secure RPC + RLS lockdown
- B11 odds-refresh edge fn + KURZY button + UI integrace pod tipy
- B13 pg_cron auto cleanup auth_attempts (každou hodinu)
- Vercel deploy (tipovacka2026.vercel.app + tipovacka184.vercel.app)
- vercel.json: root rewrite na /tipovacka.html, no-cache headers

## v5.1.0 - 7. 5. 2026

Cleanup release, žádná změna funkcionality.

- Cleanup složky: FuelLog soubory přesunuty pryč, staré verze do `archive/` (lokálně, gitignored)
- Stadium fotky → `assets/stadiums/`
- SQL migrace → `backend/sql/`
- Edge funkce → `backend/functions/`
- `spec.md` + `changelog.md` (nové)
- `.gitignore`
- Git init, první commit

## v5.0.2 - 20. 4. 2026

- Drobné UI a header polish
- Last UI iterace pred cleanupem

## v5.0.1 - 20. 4. 2026

- Bugfix sady po v5.0

## v5.0 - 20. 4. 2026

- Major redesign hlavičky (nový sticky header, integrovaný countdown pill)
- Tier filtry (skupinová / play-off + sort chips)
- Sticky scroll bar pro tabulku Tipy ostatních
- `admin_reset_tips_secure` RPC

## v4.9.x - 8. 4. - 20. 4. 2026

Iterace 4.9 (.1 až .6) - hodně malých fixů a UX úprav: rival hráči, badge logika, dual tip input, sniper/draw badges, similar player, today/tomorrow filtry, FAQ a install panel, theme switcher, mobile polish.

## v4.9 - 8. 4. 2026

- `get_visible_tips_secure` (RLS-safe), `get_tip_trends_secure`
- Tipy ostatních se odkrývají jen u zápasů, kde má hráč svůj tip
- `get_leaderboard_snapshot_secure` (server-side leaderboard)

## v4.8 - 8. 4. 2026

- `auth_hrac_secure_by_id`, `auth_hrac_secure_by_name` (lazy SHA-256 migrace z plain PINu)
- Bezpečnější admin RPC (PIN ověření před každou mutací)

## v4.7 - 8. 4. 2026

- `*_secure` RPC vlna: PIN se neposílá v plain do RPC bodies, posílá se hash
- `is_sha256_hex` validátor

## v4.3 - 7. 4. 2026

- Pravidla, FAQ
- Hype against community badge

## v4.2 - 7. 4. 2026

- Header polish
- Lang switcher (CS/EN)

## v4.0 - 6. 4. 2026

- Extra tipy (vítěz, král střelců) + lock_at + oficiální výsledky
- Diskuze threaded + emoji reakce
- `extra_tip_settings`, `discussion_posts`, `discussion_reactions` tabulky

## v3.4 - 6. 4. 2026

- Stadiony s fotkami + linky na mapy
- Historie MS s medailovým přehledem

## v3.0 - 6. 4. 2026

- Edge funkce `fifa-ranking-refresh` (FIFA inside.fifa.com FDCP API)
- `fifa_rankings_current`, `app_sync_statuses` tabulky
- Admin tlačítko FIFA RANKING

## v2.x - 6. 4. 2026

Iterace 2.8 - 2.9: Tipy ostatních, žebříček, tabulka skupin, play-off pavouk.

## v1.66 - 4. 4. 2026

První funkční verze - login, registrace, základní tipy, hardcoded zápasy.
