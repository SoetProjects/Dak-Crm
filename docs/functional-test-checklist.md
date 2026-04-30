# DakERP — Functionele testchecklist

Bijgewerkt: april 2026  
Doel: Handmatig testen van de volledige ERP-flow van lead tot betaalde factuur.

---

## Volledige flow: Lead → Klant → Offerte → Werkbon → Factuur → Betaling → Dashboard

---

### Stap 1 – Inloggen

| | Detail |
|---|---|
| **Pagina** | `/login` |
| **Actie** | Vul je e-mail en wachtwoord in en klik op "Inloggen" |
| **Verwacht** | Je wordt doorgestuurd naar `/dashboard` |
| **Controle** | Dashboard laadt zonder foutmelding; e-mailadres zichtbaar in header |

---

### Stap 2 – Lead aanmaken

| | Detail |
|---|---|
| **Pagina** | `/leads` |
| **Actie** | Vul in: naam, telefoon, e-mail, adres, type aanvraag, bron, omschrijving. Klik "Lead opslaan" |
| **Verwacht** | Lead verschijnt in de lijst met status "Nieuw" |
| **Controle** | Lead is klikbaar en toont alle ingevoerde gegevens |

---

### Stap 3 – Opvolgdatum instellen

| | Detail |
|---|---|
| **Pagina** | `/leads/[id]` |
| **Actie** | Kies een datum bij "Opvolgdatum" en klik "Opslaan" |
| **Verwacht** | Opvolgdatum verschijnt als oranje kaart in de zijbalk; datum in de lijst is oranje/rood (afhankelijk of datum al verstreken is) |
| **Controle** | Datum klopt in zijbalk; kleur past bij urgentie |

---

### Stap 4 – Status wijzigen via snelle knoppen

| | Detail |
|---|---|
| **Pagina** | `/leads/[id]` |
| **Actie** | Klik op "→ Benaderd" (of een andere statusknop) |
| **Verwacht** | Status badge in de header verandert direct |
| **Controle** | Juiste kleur wordt getoond; statusknop voor nieuwe status verdwijnt uit de rij |

---

### Stap 5 – Lead omzetten naar klant

| | Detail |
|---|---|
| **Pagina** | `/leads/[id]` |
| **Actie** | Kies klanttype in het dropdown ("Particulier", "Zakelijk", "VvE", "Aannemer") en klik "Omzetten naar klant" |
| **Verwacht** | Je wordt doorgestuurd naar de klantpagina; lead status wordt "Gewonnen" |
| **Controle** | Klant heeft het gekozen klanttype als badge; klantpagina toont naam, telefoon, e-mail |

---

### Stap 6 – Klant openen en controleren

| | Detail |
|---|---|
| **Pagina** | `/customers/[id]` |
| **Actie** | Open de klant; controleer gegevens |
| **Verwacht** | Naam, klanttype badge, adresgegevens, contactinfo zichtbaar |
| **Controle** | Klanttype kan worden gewijzigd via het bewerkingsformulier en wordt opgeslagen |

---

### Stap 7 – Offerte aanmaken

| | Detail |
|---|---|
| **Pagina** | `/quotes` |
| **Actie** | Selecteer de klant in het formulier bovenaan; vul titel en eventueel vervaldatum in; klik "Offerte aanmaken" |
| **Verwacht** | Offerte wordt aangemaakt met status "Concept" en uniek offertenummer |
| **Controle** | Offerte verschijnt in de lijst; klik erop |

---

### Stap 8 – Offerteregelitems toevoegen

| | Detail |
|---|---|
| **Pagina** | `/quotes/[id]` |
| **Actie** | Vul omschrijving, aantal, eenheid, stukprijs in en klik "+" |
| **Verwacht** | Regelitem verschijnt in de tabel; subtotaal, BTW en totaal worden herberekend |
| **Controle** | Herhaal voor meerdere regels; verwijder een regel met "✕" |

---

### Stap 9 – Offerte markeren als verzonden en geaccepteerd

| | Detail |
|---|---|
| **Pagina** | `/quotes/[id]` |
| **Actie** | Klik "Markeer als verzonden"; klik daarna "Markeer als geaccepteerd" |
| **Verwacht** | Status verandert naar "Verzonden" en daarna "Geaccepteerd" |
| **Controle** | Knoppen voor niet-toepasselijke statussen verdwijnen |

---

### Stap 10 – Offerte printen / PDF

| | Detail |
|---|---|
| **Pagina** | `/quotes/[id]` |
| **Actie** | Klik "Print / PDF" — er opent een nieuw tabblad |
| **Verwacht** | Printpagina toont: bedrijfsnaam, klantnaam, offertenummer, datum, regelitems, totalen, eventuele notities |
| **Controle** | Navigatie en knoppen zijn verborgen tijdens printen (controleer met Ctrl+P of klik "Afdrukken / PDF") |

---

### Stap 11 – Werkbon aanmaken vanuit offerte

| | Detail |
|---|---|
| **Pagina** | `/quotes/[id]` |
| **Actie** | Klik "Werkbon aanmaken" (zichtbaar als status = Geaccepteerd) |
| **Verwacht** | Werkbon wordt aangemaakt en je wordt doorgestuurd naar de werkbonpagina |
| **Controle** | Werkbon is gekoppeld aan de offerte; jobtype is niet "Overig" als aanvraagtype bekend is |

---

### Stap 12 – Werkbon openen en controleren

| | Detail |
|---|---|
| **Pagina** | `/jobs/[id]` |
| **Actie** | Controleer alle gegevens |
| **Verwacht** | Klant, werkbonnummer, type, status, eventuele offertekoppeling zijn zichtbaar in de zijbalk |
| **Controle** | Statusknop rij zichtbaar; datum/tijd beschikbaar voor bewerking |

---

### Stap 13 – Werkbonstatus bijwerken

| | Detail |
|---|---|
| **Pagina** | `/jobs/[id]` |
| **Actie** | Klik op "→ In uitvoering"; daarna op "→ Afgerond" |
| **Verwacht** | Status verandert bij elke klik; voltooiingsdatum wordt ingesteld bij "Afgerond" |
| **Controle** | Statusbadge in header verandert naar de juiste kleur |

---

### Stap 14 – Factuur aanmaken vanuit werkbon

| | Detail |
|---|---|
| **Pagina** | `/jobs/[id]` |
| **Actie** | Klik "Factuur aanmaken" in de zijbalk (alleen zichtbaar als er nog geen factuur is) |
| **Verwacht** | Je wordt doorgestuurd naar `/invoices` met klant vooringevuld; werkbon is ook geselecteerd |
| **Controle** | Klik "Factuur aanmaken" in het formulier; factuurregels worden gekopieerd van de offerte |

---

### Stap 15 – Factuur controleren en versturen

| | Detail |
|---|---|
| **Pagina** | `/invoices/[id]` |
| **Actie** | Controleer regelitems, totalen, klantnaam; klik "Verzenden" |
| **Verwacht** | Status verandert naar "Verzonden" |
| **Controle** | "Betaald markeren" en "Te laat markeren" knoppen zijn nu zichtbaar |

---

### Stap 16 – Factuur markeren als betaald

| | Detail |
|---|---|
| **Pagina** | `/invoices/[id]` |
| **Actie** | Klik "Betaald markeren" |
| **Verwacht** | Status verandert naar "Betaald"; betaaldatum verschijnt in zijbalk |
| **Controle** | Annuleerknop is niet meer zichtbaar; factuur is groen |

---

### Stap 17 – Terugkerende factuur: workflow voor te-laatbetaling

| | Detail |
|---|---|
| **Pagina** | `/invoices/[id]` |
| **Actie** | Markeer een ANDERE factuur als "Te laat" (klik "Te laat markeren" bij een Verzonden factuur) |
| **Verwacht** | Status verandert naar "Te laat" |
| **Controle** | Rode badge; "Betaald markeren" is nog steeds zichtbaar |

---

### Stap 18 – Dashboard controleren

| | Detail |
|---|---|
| **Pagina** | `/dashboard` |
| **Actie** | Bekijk alle KPI-kaarten |
| **Verwacht** | Getallen kloppen: open leads, open offertes, actieve werkbonnen, openstaand factuurbedrag, te late facturen |
| **Controle** | "Te laat facturen" kaart is rood als er te-laat facturen zijn; "Wacht (materiaal/weer)" is oranje als van toepassing |

---

### Stap 19 – Factuurlijst filteren

| | Detail |
|---|---|
| **Pagina** | `/invoices` |
| **Actie** | Klik op de filterknoppen: "Open", "Te laat", "Betaald", "Alle" |
| **Verwacht** | Lijst past zich aan op de geselecteerde filter |
| **Controle** | Actieve filter heeft donkere achtergrond; lege toestand toont hulptekst |

---

### Stap 20 – Dubbele factuur preventie

| | Detail |
|---|---|
| **Pagina** | `/jobs/[id]` |
| **Actie** | Open een werkbon waarvoor al een factuur bestaat |
| **Verwacht** | De "Factuur aanmaken" knop is vervangen door een groene kaart met een link naar de bestaande factuur |
| **Controle** | Klikken op de link opent de juiste factuur |

---

### Stap 21 – Mobiele navigatie

| | Detail |
|---|---|
| **Device** | Telefoon of browser in 390px breedte (Dev Tools) |
| **Actie** | Open de app; klik op het hamburger-icoon (☰) |
| **Verwacht** | Navigatiemenu schuift open; klikken op een link sluit het menu |
| **Controle** | Geen horizontale overflow op schermen onder 400px breed |

---

### Stap 22 – Lege statussen testen

| Pagina | Verwachte hulptekst bij lege lijst |
|---|---|
| `/leads` | "Nog geen leads — Maak je eerste lead aan via het formulier hierboven." |
| `/customers` | "Nog geen klanten — Maak je eerste klant aan via het formulier hierboven, of converteer een lead." |
| `/quotes` | "Nog geen offertes — Maak een offerte vanuit een klantpagina, of gebruik het formulier hierboven." |
| `/jobs` | "Geen actieve werkbonnen — Maak een werkbon vanuit een geaccepteerde offerte." |
| `/invoices` | "Nog geen facturen — Maak een factuur vanuit een werkbon via het formulier hierboven." |

---

## Bekende beperkingen (voor volgende sprint)

- Geen echte PDF-export (alleen browser print)
- Geen e-mail of WhatsApp verzending (wel berichtgenerator via AI Opvolging)
- Geen betaalprovider (Mollie etc.)
- Geen maandelijkse omzetgrafiek op dashboard
- Geen planning dagweergave op mobiel
- Geen notificaties bij verlopende offertes of te-laat facturen

---

## Snelle rooktest (5 minuten)

1. Login → dashboard laadt ✓
2. Maak lead aan → verschijnt in lijst ✓
3. Converteer lead → klant aangemaakt ✓
4. Maak offerte + regelitems → totalen kloppen ✓
5. Accepteer offerte → maak werkbon ✓
6. Maak factuur van werkbon → regelitems gekopieerd ✓
7. Markeer factuur betaald → status groen ✓
8. Dashboard toont juiste KPIs ✓
