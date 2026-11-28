# Kalorije

Spletna aplikacija (PWA) za beleženje hrane, štetje kalorij in spremljanje teže.
Brez strežnika in prijave; vsi podatki so shranjeni lokalno na telefonu (IndexedDB).

## Struktura
- `index.html`, `manifest.webmanifest`, `sw.js` – ogrodje PWA (namestitev, delovanje brez povezave)
- `css/app.css` – videz (svetli in temni način, varni robovi iPhona)
- `js/logic/` – čista logika izračunov (s testi)
- `js/ui/` – zasloni
- `js/db.js` – shranjevanje, izvoz in uvoz
- `tests/` – testi: odpri `tests/index.html` v brskalniku ali zaženi `node tests/run-node.mjs`

## Objava na GitHub Pages (brezplačno)
1. Ustvari račun na github.com in nov **javni** repozitorij, npr. `kalorije`.
2. V repozitoriju klikni **Add file → Upload files** in povleci vse datoteke in mape iz te mape
   (`index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `icons/`, `tests/`). Klikni **Commit changes**.
3. **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, mapa `/ (root)` → **Save**.
4. Čez 1–2 minuti je aplikacija na naslovu `https://<uporabnisko-ime>.github.io/kalorije/`.

## Namestitev na iPhone
1. Naslov odpri v **Safariju** (ne v Chromu ali drugem brskalniku).
2. Tapni gumb **Deli** (kvadrat s puščico) → **Dodaj na začetni zaslon** → **Dodaj**.
3. Aplikacijo odpiraj z ikone na začetnem zaslonu: odpre se celozaslonsko, deluje brez povezave
   in ima svoje podatke (ločene od Safarija).

## Posodobitve
Ko na GitHub naložiš nove datoteke, aplikacija novo različico prenese v ozadju in jo pokaže ob **naslednjem** zagonu
(zapri jo iz preklopnika aplikacij in ponovno odpri). Podatki ostanejo.
Ob večjih posodobitvah se v `sw.js` poveča `CACHE` (npr. `kalorije-v2`).

## Varnostna kopija
Nastavitve → *Izvozi podatke (JSON)* → Shrani v Datoteke / iCloud Drive. Priporočeno enkrat na teden.
