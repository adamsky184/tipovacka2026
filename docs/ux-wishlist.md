# UX wishlist - po v5.1.0

Brainstorm vylepšení nad rámec funkčního minima. Seřazeno podle ROI / složitosti.

## Quick wins (1-2h každý)

- **Animovaná konfeta** při uloženém přesném tipu (canvas-confetti CDN)
- **"Tvůj tip je shodný s X% hráčů"** mini-modal po uloženém tipu (motivace)
- **Auto dark/light theme** podle systému (`prefers-color-scheme`) - aktuálně je manual switch
- **Sdílení žebříčku jako obrázek** (canvas-to-png export, tlačítko "Sdílet pořadí")
- **Achievements badges** - víc gamifikace (sniper streak, comeback kid, draw master, ...)
- **Onboarding tutorial** pro nové hráče (3 obrazovky overlay, dismissable)
- **Quick stats po loginu**: "Tvůj poslední tip byl 1:1 (správně, +3b)"

## Středně složité (3-6h)

- **Push notifications** - 30 min před zápasem, kde hráč nemá tip (Web Push + Service Worker)
- **Email notifications** alternativa pro ne-PWA uživatele (Supabase Auth email + edge function)
- **Live skóre during match** (ESPN scoreboard každých 60s když je zápas in-progress)
- **Bracket / pavouk dnes neukazuje moje tipy** - přidat overlay s mým tipem na knockout
- **Diskuze: notifikace na nové reply** k vlastnímu příspěvku (Supabase realtime + browser notification)
- **Filter v žebříčku**: "jen kámoši", "jen rivalové", "jen ti, kdo mají uložené všechny tipy"
- **Před uzávěrkou tipy ukázat výzvu**: "Máš 3 zápasy bez tipu, končí za 2h. Tipni teď →"

## Větší fíčury (6-12h)

- **Mini-ligy / podsoutěže** - admin vytvoří podskupinu (např. "Rodina"), hráči si zvolí, ukáže se vlastní žebříček mezi nimi
- **Předpovědní AI** (volitelné) - tlačítko "navrhnout tip podle FIFA ranking + recent form"
- **Statistiky každého hráče** detail page: best/worst tipy, trendy, srovnání s ostatními
- **Automatické generování shareable card** po každém zápase ("Adam tipoval 2:1, výsledek 2:1 = 10 bodů!")
- **Real-time leaderboard updates** přes Supabase realtime (po každém uložení tipu / výsledku)

## Návrhy závislé na turnaji

- **Před každým zápasem hint**: "Naposledy se Mexiko x USA hrálo 2024, výsledek 2:0"
- **Tip distribution per match**: "70% hráčů tipuje výhru Argentiny" (zobrazené až po deadlineu)
- **"Black sheep" badge**: tipoval jsi přesně, ale nikdo jiný to nedal
- **Streak counter**: "5 přesných v řadě" (skutečně velký flex)

## Drobné polish

- Empty stavy mít humor: "Dnes se nehraje. Doporučujeme jít ven."
- Loading skeleton místo spinneru u žebříčku
- Haptic feedback při mobilu (`navigator.vibrate(50)` při uložení tipu)
- Sound effect při uloženém přesném tipu (volitelné, default off)
- Easter eggs: tipovat 0:0 dlouho v řadě → "ChessMaster" badge

## Známá technicka omezení / doporučení

- Push notifications na iOS: vyžaduje add to home screen (PWA install)
- Realtime přes Supabase: free tier limit 2 concurrent connections - OK pro 5-10 hráčů
- ESPN live scores: ratelimit cca 1 req/s, takže max 1× za minutu polling

## Po-turnajové fíčury (po 19. 7. 2026)

- Rekap statistiky: "Tvůj turnajový profil"
- Best of: nejtěsnější / nejbizarnější tip
- Hall of fame: ulož finální žebříček do `archived_tournaments`
- Reset pro další turnaj (Euro 2028 šablona)
