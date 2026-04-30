# DakERP — Resterende roadmap

Bijgewerkt: april 2026

---

## Wat werkt (stabiel en getest)

### Kernflow
- Lead aanmaken → klant converteren (met klanttype)
- Offerte aanmaken → regelitems toevoegen → totalen herberekend
- Offerte verzenden → accepteren → werkbon aanmaken (jobtype automatisch van lead)
- Werkbon statusbeheer (gepland → in uitvoering → afgerond)
- Factuur aanmaken vanuit werkbon (regelitems gekopieerd van offerte)
- Factuur statusflow: Concept → Verzonden → Te laat / Betaald

### Dashboard
- 8 KPI-kaarten (sequentieel voor Supabase-pooler)
- "Te laat facturen" rood gemarkeerd
- "Wacht op materiaal/weer" oranje gemarkeerd
- Links naar gefilterde pagina's

### Leads
- Opvolgdatum (followUpAt) instellen en tonen
- Rood/oranje indicator in lijst voor vervallen opvolgdata
- Snelle statusknoppenrij op detailpagina
- Filtertabs: Actief / Nieuw / Benaderd / Afspraak / Te laat / Alle

### Klanten
- Volledig bewerkbaar (naam, type, adres, KVK, BTW, notities)
- Klanttype badge (Particulier, Zakelijk, VvE, Aannemer)
- Zijbalk: leads, offertes, werkbonnen, facturen met statusbadges
- Snelle actieknoppen: + Offerte, + Werkbon, + Factuur
- Openstaand factuurbedrag in header

### Offertes
- Filtertabs: Alle / Open / Geaccepteerd / Afgewezen
- Werkbon-duplicaatbeveiliging (toont bestaande werkbon in plaats van knop)
- Verloopdatum rood gemarkeerd als verlopen
- Print / PDF knop → professioneel printlayout

### Werkbonnen
- Alle statusbeheer (gepland, in uitvoering, wacht, afgerond, geannuleerd)
- Factuur-duplicaatbeveiliging (toont bestaande factuur in plaats van aanmaakknop)
- Notities, urenstaat, materialen
- Koppeling naar offerte en klant in zijbalk

### Facturen
- Filtertabs: Alle / Open / Te laat / Betaald
- Volledig statusflow met paidAt
- Print / PDF knop → professioneel printlayout met BTW-specificatie en betaalinstructie

### Planning
- Weekoverzicht met 7-kolommen kalender
- Scrollbaar op mobiel (overflow-x-auto)
- Vandaag gemarkeerd met blauwe achtergrond
- Werkbonnen en afspraken gecombineerd per dag

### Mobiel
- Hamburger-navigatie (auto-sluiten bij routewijziging)
- Grote taptargets op knoppen
- Tabellen scrollbaar op mobiel

---

## Bekende gaps (veilig voor volgende sprint)

### 1. Factuurprint: geen IBAN-veld
Het printlayout toont de betaalinstructie maar heeft geen IBAN. Toe te voegen als `bankAccount` veld op Company-model (1 schema-wijziging, 1 UI-wijziging op /instellingen).

### 2. Planning mobiel
De 7-kolommen weekkalender is scrollbaar, maar niet ideaal op mobiel. Verbetering: een extra mobiele daglijstweergave (`md:hidden`) die items van alle dagen in de week als gestapelde kaarten toont.

### 3. Offerte akkoordverklaring
Een eenvoudige "handtekeningvak"-sectie op het printlayout (naam, datum, handtekeninglijn) is handig voor fysieke ondertekening. Geen externe library nodig.

### 4. Klant zoekfunctie
De klantenlijst is momenteel niet doorzoekbaar. Bij meer dan 50 klanten wordt dit een knelpunt. Oplossing: eenvoudig tekstveld met `?search=` parameter en server-side `contains`-filter op naam/e-mail.

### 5. Maandelijkse omzet op dashboard
`groupBy` query voor betaalde facturen per maand. Veilig toe te voegen als 1 extra sequentiële query. Resultaat als eenvoudige tekst (bijv. "Omzet deze maand: €3.450").

### 6. Dubbele klant bij lead-conversie
Als een lead wordt geconverteerd terwijl er al een klant bestaat met hetzelfde e-mailadres, wordt er een nieuwe klant aangemaakt. Verbetering: controleer op e-mail voor aanmaken, toon waarschuwing of koppel aan bestaande klant.

### 7. Klantenlijst filtertabs
Momenteel geen filter op klanttype (Particulier, Zakelijk, VvE, Aannemer). Toe te voegen als filtertabs (zelfde patroon als offertes/facturen).

### 8. Werkbonnummering configureerbaar
Nummering is momenteel `JOB-JJJJ-XXXX`. Prefix aanpasbaar maken via /instellingen (laag risico).

---

## Risicovol / later

- **Betaalprovider (Mollie)**: payment intent aanmaken vanuit factuur. Vereist webhook, aparte flow.
- **E-mail verzenden**: SMTP-integratie voor facturen/offertes. Vereist queue of externe dienst.
- **PDF-server**: echte PDF-generatie (bijv. Puppeteer) voor e-mailbijlagen. Vereist extra infrastructuur.
- **AI-functies uitbreiden**: offertegenerator, follow-upberichten (al geïmplementeerd maar niet actief gepromoot).
- **Meerdere gebruikers per bedrijf**: rollen en rechten (schema al voorbereid via UserRole).
- **Voorraadbeheer**: materialen met stockbeheer en locatiebeheer.
- **Tijdregistratie rapport**: exporteerbare urenrapportage per werkbon of medewerker.

---

## Handmatige testchecklist voor morgen

1. `/leads` → filters werken (Actief/Nieuw/Benaderd/Afspraak/Te laat/Alle)
2. `/leads/[id]` → opvolgdatum instellen → datum zichtbaar in lijst
3. `/leads/[id]` → snelle statusknoppenrij werkt
4. `/leads/[id]` → "Omzetten naar klant" → klant heeft klanttype
5. `/customers/[id]` → leads-sectie zichtbaar in zijbalk
6. `/customers/[id]` → statusbadges bij offertes/werkbonnen/facturen
7. `/customers/[id]` → "+ Factuur" knop aanwezig en werkt
8. `/quotes` → filtertabs werken (Alle/Open/Geaccepteerd/Afgewezen)
9. `/quotes/[id]` → geaccepteerde offerte met werkbon toont werkbonkaart (geen knop)
10. `/quotes/[id]` → verlopen geldig-tot datum rood gemarkeerd
11. `/invoices/[id]` → "Print / PDF" knop aanwezig
12. `/invoices/[id]/print` → professioneel printlayout met BTW en betaalinstructie

---

## Aanbevolen volgorde volgende sprint

1. Klant zoekfunctie (`?search=` op /customers)
2. Klantenlijst filtertabs (klanttype)
3. Planning mobiele daglijstweergave
4. Offerte akkoordverklaring op printlayout
5. Maandelijkse omzet op dashboard
6. Bankrekening (IBAN) veld op bedrijf
7. Dubbele klant detectie bij lead-conversie

---

## Vercel/Supabase acties die handmatig zijn uitgevoerd

- `prisma db push` via DIRECT_URL uitgevoerd voor `followUpAt` op Lead
- Geen verdere handmatige databasewijzigingen nodig voor huidige sprint
