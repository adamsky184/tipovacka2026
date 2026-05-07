# Tipovacka 3.0 - nasazeni FIFA importu

Tohle je bezpecny postup. Nic nestareho se nemaže.

## 1. SQL v Supabase

V Supabase projektu otevri:

- `SQL Editor`
- `New query`

Pak otevri soubor:

- `backend/supabase/tipovacka3_0.sql`

Zkopiruj cely obsah a dej `Run`.

To vytvori:

- `fifa_rankings_current`
- `app_sync_statuses`

Tyto tabulky jsou nove a nemely by rozbit stavajici appku.

## 2. Edge Function

V Supabase projektu otevri:

- `Edge Functions`
- `fifa-ranking-refresh`
- `Code`

Pak otevri soubor:

- `backend/supabase/functions/fifa-ranking-refresh/index.ts`

Udelej toto:

1. smaz stary obsah funkce v editoru
2. vloz novy obsah ze souboru `index.ts`
3. klikni `Deploy`

Nazev funkce musi zustat:

- `fifa-ranking-refresh`

Poznamka:

- neni potreba vytvaret novou funkci
- staci prepsat kod v te stavajici a znovu ji nasadit

## 3. Frontend soubor

Pouzij novy soubor:

- `tipovacka3_0.html`

Ten uz pocita s tim, ze:

- FIFA ranking se cte z DB
- admin button `FIFA RANKING` vola edge funkci

## 4. Jak overit ze to funguje

1. prihlas se jako admin
2. klikni `FIFA RANKING`
3. otevri sekci `Tymy` -> `Zebricek FIFA`
4. zkontroluj:
   - body
   - zmena
   - trend
   - konfederace
5. v headeru zkontroluj cas posledni aktualizace

## 5. Kdyz se nacte jen cast dat

Nova verze funkce uz nepouziva parsovani tabulky z HTML.

Misto toho:

- vezme z FIFA stranky jen metadata s aktualnim schedule id
- a samotny ranking taha z oficialniho FIFA API

To je vyrazne spolehlivejsi nez puvodni verze.

## 6. Co se nemeni

Tyto casti zustavaji jak byly:

- `VYSLEDKY` refreshe z ESPN
- `TYMY` refreshe z ESPN
- login / registrace / tipy / admin tipy
