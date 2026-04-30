# DakERP — End-to-End Test Script

**Versie:** april 2026  
**Doel:** Volledige handmatige verificatie van de ERP-flow van lead tot betaalde factuur.  
**Tijdsduur:** ± 20–30 minuten  
**Benodigdheden:** Inloggegevens, browser (Chrome of Firefox aanbevolen), optioneel mobiel apparaat of DevTools op 390px breedte.

---

## Hoe dit script te gebruiken

- Loop de stappen **op volgorde** af.
- Vink elke stap af als hij slaagt (✅).
- Noteer bij een fout de exacte foutmelding of het onverwachte gedrag.
- Een stap is een **bug** als het verwachte resultaat niet optreedt of als er een foutmelding verschijnt.

---

## Stap 1 — Inloggen

| Veld | Waarde |
|---|---|
| **URL** | `/login` |
| **Actie** | Vul je e-mailadres en wachtwoord in. Klik op "Inloggen". |
| **Verwacht** | Je wordt doorgestuurd naar `/dashboard`. De pagina laadt zonder foutmeldingen. Je e-mailadres staat linksboven in de header. |
| **Bug als** | Foutmelding verschijnt, pagina laadt niet, of je blijft op `/login` hangen. |

---

## Stap 2 — Lead aanmaken

| Veld | Waarde |
|---|---|
| **URL** | `/leads` |
| **Actie** | Vul het formulier bovenaan in: **Naam** = "Test Lead E2E", **Telefoon** = "0612345678", **E-mail** = "testlead@example.com", **Adres** = "Teststraat 1", **Postcode** = "1234AB", **Stad** = "Amsterdam", **Aanvraagtype** = "Lekkage", **Bron** = "Test", **Omschrijving** = "Waterlekkage bij dakrand". Klik "Lead opslaan". |
| **Verwacht** | Pagina herlaadt. "Test Lead E2E" verschijnt bovenaan de leadlijst met status "Nieuw" (blauw) en type "Lekkage". |
| **Bug als** | Lead verschijnt niet in de lijst, er is een foutmelding, of de statusbadge ontbreekt. |

---

## Stap 3 — Opvolgdatum instellen

| Veld | Waarde |
|---|---|
| **URL** | `/leads/[id]` — klik op "Test Lead E2E" in de lijst |
| **Actie** | Scroll naar het formulier "Gegevens". Klik op het datumveld "Opvolgdatum". Selecteer **morgen** als datum. Klik "Opslaan". |
| **Verwacht** | Pagina herlaadt. In de rechterkolom verschijnt een **amber kaart** met de opvolgdatum (dag, datum, maandnaam). |
| **Bug als** | Datum wordt niet opgeslagen, kaart verschijnt niet, of er is een serverfout. |

**Terugcheck in lijst:**
- Ga terug naar `/leads`.
- De lead "Test Lead E2E" toont de opvolgdatum in **oranje** tekst onder de naam.
- **Bug als** de datum niet zichtbaar is in de lijst.

---

## Stap 4 — Snelle statuswijziging

| Veld | Waarde |
|---|---|
| **URL** | `/leads/[id]` |
| **Actie** | Kijk naar de rij knoppen "Snelle statuswijziging" direct onder de paginatitel. Klik op "→ Benaderd". |
| **Verwacht** | De statusbadge in de header verandert direct naar "Benaderd" (geel). De knop "→ Benaderd" verdwijnt uit de rij. |
| **Bug als** | Pagina laadt niet opnieuw, status verandert niet, of alle knoppen verdwijnen. |

---

## Stap 5 — Lead omzetten naar klant

| Veld | Waarde |
|---|---|
| **URL** | `/leads/[id]` |
| **Actie** | Rechtsboven: kies in het dropdown **"Zakelijk"**. Klik op "Omzetten naar klant". |
| **Verwacht** | Je wordt doorgestuurd naar `/customers/[nieuw-id]`. De klantnaam is "Test Lead E2E". De statusbadge toont "Zakelijk". De lead status staat nu op "Gewonnen". |
| **Bug als** | Je blijft op de leadpagina, er is een foutmelding, of de klant is aangemaakt met het verkeerde klanttype. |

---

## Stap 6 — Klant openen en controleren

| Veld | Waarde |
|---|---|
| **URL** | `/customers/[id]` — je bent hier al na stap 5 |
| **Actie** | Controleer de gegevens op de pagina. |
| **Verwacht resultaat** | — Naam: "Test Lead E2E"  — Klanttype badge: "Zakelijk"  — Telefoon: "0612345678"  — E-mail: "testlead@example.com"  — Serviceadres: "Teststraat 1, 1234AB Amsterdam" |
| **Bug als** | Een van bovenstaande gegevens ontbreekt of is verkeerd overgenomen van de lead. |

**Optioneel:** Wijzig het klanttype naar "Particulier" via het formulier en klik "Opslaan". Controleer dat de badge verandert. Zet het terug naar "Zakelijk".

---

## Stap 7 — Offerte aanmaken

| Veld | Waarde |
|---|---|
| **URL** | `/quotes` |
| **Actie** | In het formulier bovenaan: selecteer bij **Klant** "Test Lead E2E". Vul **Titel** in: "Lekkage herstel dakrand". Laat vervaldatum leeg of kies een datum over 14 dagen. Klik "Offerte aanmaken". |
| **Verwacht** | Je wordt doorgestuurd naar `/quotes/[id]`. De offerte toont offertenummer (bijv. OFF-2026-0001), status "Concept", klantnaam "Test Lead E2E". |
| **Bug als** | Foutmelding, geen doorstuur, of offertenummer ontbreekt. |

---

## Stap 8 — Offerteregel toevoegen

| Veld | Waarde |
|---|---|
| **URL** | `/quotes/[id]` |
| **Actie** | Scroll naar het regelformulier onderin de sectie "Offerteregels". Vul in: **Omschrijving** = "Daklekkage reparatie", **Aantal** = 1, **Eenheid** = "post", **Stukprijs** = 450. Klik "+". |
| **Verwacht** | Regel verschijnt in de tabel. Subtotaal = €450,00, BTW 21% = €94,50, Totaal = €544,50. |
| **Bug als** | Regel verschijnt niet, bedragen kloppen niet, of er is een serverfout. |

**Voeg een tweede regel toe:**
- Omschrijving: "Bitumen afdichtingsstrip", Aantal: 3, Eenheid: "m1", Stukprijs: 35
- Totaal tweede regel: €105,00 → Totaal pagina: €667,05 (incl. BTW)
- **Bug als** het totaal niet automatisch herberekend wordt.

---

## Stap 9 — Offerte printen / PDF bekijken

| Veld | Waarde |
|---|---|
| **URL** | `/quotes/[id]` |
| **Actie** | Klik op de knop "Print / PDF". Er opent een nieuw tabblad. |
| **Verwacht** | Printpagina toont: bedrijfsnaam, klantnaam, offertenummer, datum, beide regelitems met prijzen, subtotaal, BTW, totaal. De zijbalk en navigatie zijn NIET zichtbaar. |
| **Bug als** | Tabblad opent niet, de layout toont de sidebar, of regelitems/bedragen ontbreken. |

**Test Ctrl+P** (of klik "Afdrukken / PDF" op de printpagina) — de toolbar met knoppen moet verdwijnen, alleen de documentinhoud is zichtbaar.
- **Bug als** de knoppen of navigatie zichtbaar zijn tijdens printen.

Sluit het printtabblad en ga terug naar `/quotes/[id]`.

---

## Stap 10 — Offerte markeren als verzonden

| Veld | Waarde |
|---|---|
| **URL** | `/quotes/[id]` |
| **Actie** | Klik rechtsboven op "Markeer als verzonden". |
| **Verwacht** | Statusbadge verandert naar "Verzonden" (blauw). De knop "Markeer als verzonden" verdwijnt. De knop "Markeer als geaccepteerd" en "Markeer als afgewezen" zijn nu zichtbaar. |
| **Bug als** | Status verandert niet, knoppen verdwijnen allemaal, of er is een foutmelding. |

---

## Stap 11 — Offerte markeren als geaccepteerd

| Veld | Waarde |
|---|---|
| **URL** | `/quotes/[id]` |
| **Actie** | Klik op "Markeer als geaccepteerd". |
| **Verwacht** | Statusbadge verandert naar "Geaccepteerd" (groen). De knop "Werkbon aanmaken" verschijnt. |
| **Bug als** | Status verandert niet, knop "Werkbon aanmaken" verschijnt niet, of er is een foutmelding. |

---

## Stap 12 — Werkbon aanmaken vanuit offerte

| Veld | Waarde |
|---|---|
| **URL** | `/quotes/[id]` |
| **Actie** | Klik op "Werkbon aanmaken". |
| **Verwacht** | Je wordt doorgestuurd naar `/jobs/[nieuw-id]`. De werkbon toont: klantnaam "Test Lead E2E", jobtype is **niet** "Overig" (verwacht "Lekkage" omdat aanvraagtype "Lekkage" was), status "Gepland". In de zijbalk staat een link naar de offerte. |
| **Bug als** | Foutmelding, geen doorstuur, jobtype is "Overig" terwijl aanvraagtype "Lekkage" was, of offertekoppeling ontbreekt. |

---

## Stap 13 — Werkbon openen en controleren

| Veld | Waarde |
|---|---|
| **URL** | `/jobs/[id]` — je bent hier al na stap 12 |
| **Actie** | Controleer de pagina. |
| **Verwacht** | — Werkbonnummer zichtbaar (bijv. JOB-2026-0001)  — Klantnaam in zijbalk: "Test Lead E2E"  — Offertekoppeling in zijbalk  — Status: "Gepland" (blauw)  — Statusknoppenrij zichtbaar rechtsboven  — Onderaan zijbalk: knop "Factuur aanmaken" |
| **Bug als** | Een van bovenstaande elementen ontbreekt. |

---

## Stap 14 — Werkbonstatus bijwerken

| Veld | Waarde |
|---|---|
| **URL** | `/jobs/[id]` |
| **Actie 1** | Klik op "→ In uitvoering" in de statusknoppenrij. |
| **Verwacht** | Statusbadge verandert naar "In uitvoering" (geel). |
| **Actie 2** | Klik op "→ Afgerond". |
| **Verwacht** | Statusbadge verandert naar "Afgerond" (groen). In de informatieregel onderin zijbalk verschijnt "Afgerond: [datum van vandaag]". |
| **Bug als** | Status verandert niet, afronddatum verschijnt niet, of er is een foutmelding bij een van de klikken. |

---

## Stap 15 — Factuur aanmaken vanuit werkbon

| Veld | Waarde |
|---|---|
| **URL** | `/jobs/[id]` |
| **Actie** | Klik op "Factuur aanmaken" onderaan de zijbalk. |
| **Verwacht** | Je wordt doorgestuurd naar `/invoices`. De klant "Test Lead E2E" is **vooringevuld** in het klantveld. De werkbon is **vooringevuld** in het werkbonveld. |
| **Actie 2** | Klik op "Factuur aanmaken" in het formulier (geen vervaldatum nodig voor de test). |
| **Verwacht** | Je wordt doorgestuurd naar `/invoices/[nieuw-id]`. Factuurnummer is aangemaakt (bijv. FAC-2026-0001). De factuurregels zijn **automatisch gekopieerd** van de offerte (beide regels zichtbaar). Totaal klopt. |
| **Bug als** | Klant niet vooringevuld, werkbon niet vooringevuld, factuurregels ontbreken, of totaal is €0,00. |

---

## Stap 16 — Factuur openen en controleren

| Veld | Waarde |
|---|---|
| **URL** | `/invoices/[id]` — je bent hier al na stap 15 |
| **Actie** | Controleer de pagina. |
| **Verwacht** | — Factuurnummer zichtbaar  — Status: "Concept" (grijs)  — Klantnaam: "Test Lead E2E"  — Beide regelitems met correcte bedragen  — Subtotaal, BTW, Totaal correct  — Koppeling naar werkbon in zijbalk  — Knop "Verzenden" zichtbaar  — Knop "Annuleren" zichtbaar |
| **Bug als** | Regelitems ontbreken, totaal klopt niet, of statusknop ontbreekt. |

**Ga terug naar `/jobs/[id]`:**
- De zijbalk toont nu een **groene kaart** met het factuurnummer in plaats van de "Factuur aanmaken" knop.
- **Bug als** de knop "Factuur aanmaken" nog steeds zichtbaar is (dubbele factuur mogelijk).

---

## Stap 17 — Factuur markeren als verzonden

| Veld | Waarde |
|---|---|
| **URL** | `/invoices/[id]` |
| **Actie** | Klik op "Verzenden". |
| **Verwacht** | Statusbadge verandert naar "Verzonden" (blauw). Knoppen "Betaald markeren" en "Te laat markeren" zijn nu zichtbaar. Knop "Verzenden" is verdwenen. |
| **Bug als** | Status verandert niet, betaal-knop verschijnt niet, of er is een foutmelding. |

---

## Stap 18 — Factuur markeren als betaald

| Veld | Waarde |
|---|---|
| **URL** | `/invoices/[id]` |
| **Actie** | Klik op "Betaald markeren". |
| **Verwacht** | Statusbadge verandert naar "Betaald" (groen). In de zijbalk verschijnt "Betaald op: [datum van vandaag]". Alle actieknoppen zijn verdwenen, behalve eventueel een annuleerknop. |
| **Bug als** | Status verandert niet, betaaldatum ontbreekt, of knoppen zijn nog steeds zichtbaar. |

---

## Stap 19 — Dashboard controleren

| Veld | Waarde |
|---|---|
| **URL** | `/dashboard` |
| **Actie** | Bekijk alle KPI-kaarten. |
| **Verwacht resultaat** |  |

| Kaart | Verwacht |
|---|---|
| Jobs vandaag | 0 of 1 (afhankelijk van planningsdatum werkbon) |
| Open leads | 1 minder dan voor de test (onze lead is "Gewonnen") |
| Open offertes | 0 extra (onze offerte is "Geaccepteerd", niet open) |
| Actieve werkbonnen | 0 extra (werkbon is "Afgerond") |
| Openstaand bedrag | Ongewijzigd (factuur is betaald) |
| Te laat facturen | 0 (of zelfde als voor de test) — kaart is NIET rood |

| **Bug als** | Een kaart toont een evident verkeerd getal, of de "Te laat facturen" kaart is onterecht rood. |

---

## Stap 20 — Factuurlijst filters testen

| Veld | Waarde |
|---|---|
| **URL** | `/invoices` |
| **Actie** | Klik achtereenvolgens op de filterknoppen bovenaan: "Open", "Te laat", "Betaald", "Alle". |
| **Verwacht** | — **Open**: toont alleen facturen met status Concept of Verzonden  — **Te laat**: toont alleen facturen met status Te laat (leeg als er geen zijn)  — **Betaald**: toont onze zojuist betaalde factuur "FAC-2026-xxxx"  — **Alle**: toont alle facturen |
| **Bug als** | Actieve filter heeft geen effect op de lijst, of verkeerde facturen worden getoond. |

---

## Stap 21 — Mobiele navigatie testen

| Veld | Waarde |
|---|---|
| **Methode** | Open browser DevTools (F12) → Dimensions instellen op **390 × 844** (iPhone 14 formaat), of gebruik een echt mobiel apparaat |
| **URL** | `/dashboard` |
| **Actie 1** | Controleer de pagina op 390px breedte. |
| **Verwacht** | Geen horizontale scrollbalk. KPI-kaarten staan op 2 kolommen. Geen tekst die buiten de rand valt. |
| **Actie 2** | Klik op het ☰ hamburger-icoon rechtsboven. |
| **Verwacht** | Navigatiemenu schuift open en toont alle menuopties (Leads, Klanten, Offertes, Werkbonnen, Planning, Facturen). |
| **Actie 3** | Klik op "Leads" in het menu. |
| **Verwacht** | Je wordt doorgestuurd naar `/leads`. Het menu sluit automatisch. |
| **Actie 4** | Controleer `/leads` op 390px. |
| **Verwacht** | Leadlijst is leesbaar. Formulier neemt volledige breedte in. Geen overflow. |
| **Bug als** | Hamburger-icoon ontbreekt, menu sluit niet na klik, of pagina scrollt horizontaal op 390px. |

---

## Bonusstap — Overdue factuur workflow testen

| Veld | Waarde |
|---|---|
| **URL** | Maak een tweede factuur aan via `/invoices` (kies een bestaande klant) |
| **Actie** | Markeer als Verzonden → klik "Te laat markeren" |
| **Verwacht** | Status wordt "Te laat" (rood). Knop "Betaald markeren" blijft zichtbaar. |
| **Dashboard check** | "Te laat facturen" kaart op `/dashboard` toont 1 en heeft **rode achtergrond**. |
| **Bug als** | Status verandert niet, kaart wordt niet rood, of betaalknop verdwijnt. |

---

## Samenvatting testresultaten

Kopieer en vul dit in na de test:

```
Datum getest:
Getest door:
Omgeving: [ ] Localhost  [ ] Vercel productie

Stap 1  – Inloggen:               [ ] OK  [ ] Bug: ___________
Stap 2  – Lead aanmaken:          [ ] OK  [ ] Bug: ___________
Stap 3  – Opvolgdatum:            [ ] OK  [ ] Bug: ___________
Stap 4  – Snelle statusknop:      [ ] OK  [ ] Bug: ___________
Stap 5  – Omzetten naar klant:    [ ] OK  [ ] Bug: ___________
Stap 6  – Klant controleren:      [ ] OK  [ ] Bug: ___________
Stap 7  – Offerte aanmaken:       [ ] OK  [ ] Bug: ___________
Stap 8  – Regelitems toevoegen:   [ ] OK  [ ] Bug: ___________
Stap 9  – Print/PDF:              [ ] OK  [ ] Bug: ___________
Stap 10 – Offerte verzonden:      [ ] OK  [ ] Bug: ___________
Stap 11 – Offerte geaccepteerd:   [ ] OK  [ ] Bug: ___________
Stap 12 – Werkbon aanmaken:       [ ] OK  [ ] Bug: ___________
Stap 13 – Werkbon controleren:    [ ] OK  [ ] Bug: ___________
Stap 14 – Werkbonstatus:          [ ] OK  [ ] Bug: ___________
Stap 15 – Factuur aanmaken:       [ ] OK  [ ] Bug: ___________
Stap 16 – Factuur controleren:    [ ] OK  [ ] Bug: ___________
Stap 17 – Factuur verzonden:      [ ] OK  [ ] Bug: ___________
Stap 18 – Factuur betaald:        [ ] OK  [ ] Bug: ___________
Stap 19 – Dashboard:              [ ] OK  [ ] Bug: ___________
Stap 20 – Factuurfilters:         [ ] OK  [ ] Bug: ___________
Stap 21 – Mobiel:                 [ ] OK  [ ] Bug: ___________
Bonus   – Overdue factuur:        [ ] OK  [ ] Bug: ___________

Totaal OK: ___ / 22
Gevonden bugs:
1.
2.
3.
```
