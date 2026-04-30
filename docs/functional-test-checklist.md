# DakERP — Functional Test Checklist

**Goal:** Verify the full lead → customer → quote → job → invoice flow works end-to-end before any UI work.  
**Environment:** Vercel production (or local `npm run dev` with DATABASE_URL set).  
**Pre-condition:** Logged in as a valid user. Dashboard is accessible.

---

## Flow 1 — Create a Lead

**Page:** `/leads`

| Step | Action | Expected result | Gap / missing feature |
|------|--------|----------------|-----------------------|
| 1.1 | Fill in the "Nieuwe lead" form: name = "Test Lood BV", phone = "0612345678", email = "test@lood.nl", city = "Amsterdam", request type = "Lekkage" | Form submits, page reloads | — |
| 1.2 | Check the lead list | "Test Lood BV" appears with status badge "Nieuw" | — |
| 1.3 | Click the lead row to open detail | `/leads/[id]` loads, shows all filled fields | — |
| 1.4 | Try adding a description on creation | Description field is NOT available on the create form | ⚠️ **Missing:** `description` field in the create-lead form. Can only be added after creation via the edit form. |
| 1.5 | Change status to "Benaderd" via the edit form, click Opslaan | Status badge updates to "Benaderd" | — |

**Dashboard impact:** "Open leads" counter increases by 1.

---

## Flow 2 — Convert Lead to Customer

**Page:** `/leads/[id]`

| Step | Action | Expected result | Gap / missing feature |
|------|--------|----------------|-----------------------|
| 2.1 | Open the lead created in Flow 1 | Detail page shows "Omzetten naar klant" button (only visible when no customer is linked yet) | — |
| 2.2 | Click "Omzetten naar klant" | Browser redirects to `/customers/[new-id]` | — |
| 2.3 | Verify customer data | Customer name, phone, email, and service address are copied from the lead | ⚠️ **Gap:** `customerType` is not copied — customer is saved with the schema default (PRIVATE). No way to set it during conversion. |
| 2.4 | Go back to `/leads` | Lead status is now "Gewonnen" (WON) | — |
| 2.5 | Try clicking "Omzetten naar klant" again on the same lead | Button is hidden (lead already has a `customerId`) | — |

**Dashboard impact:** "Open leads" counter decreases by 1 (WON leads are excluded).

---

## Flow 3 — Create a Quote from a Customer

**Page:** `/quotes` or via "Nieuwe offerte" button on `/customers/[id]`

| Step | Action | Expected result | Gap / missing feature |
|------|--------|----------------|-----------------------|
| 3.1 | Go to `/quotes`, select the customer from the dropdown, click "Nieuwe offerte" | Quote is created with number `OFF-YYYY-0001`, status "Concept", redirects to `/quotes/[id]` | — |
| 3.2 | On the quote detail page, set a title (e.g. "Lekkage reparatie Prinsengracht") and a valid-until date, click Opslaan | Title and date are saved | — |
| 3.3 | Add a line item: description = "Arbeid monteur", quantity = 4, unit = "uur", price = 65, VAT = 21% | Line appears in the table; subtotal, VAT, and total are recalculated automatically | — |
| 3.4 | Add a second line item: description = "Materialen", quantity = 1, unit = "post", price = 120 | Totals update again | — |
| 3.5 | Delete one line | Line disappears, totals recalculate | — |
| 3.6 | Change quote status to "Verzonden" using the status button | Status badge updates to "Verzonden" | ⚠️ **Missing:** No email/PDF sending — status change is manual only. Actual sending to customer is not implemented. |
| 3.7 | Try the "AI Offerte" generator at `/quotes/genereren` | Form loads with customer dropdown; requires `OPENAI_API_KEY` in environment | ⚠️ **Requires:** `OPENAI_API_KEY` set in Vercel env vars. |

**Dashboard impact:** "Open offertes" counter increases by 1 (status SENT counts).

---

## Flow 4 — Accept Quote and Create Job

**Page:** `/quotes/[id]`

| Step | Action | Expected result | Gap / missing feature |
|------|--------|----------------|-----------------------|
| 4.1 | Open the quote from Flow 3 | Status is "Verzonden" | — |
| 4.2 | Click the "Maak werkbon" button | Quote status changes to "Geaccepteerd"; browser redirects to `/jobs/[new-id]` with job number `JOB-YYYY-0001` | ⚠️ **Note:** The "Maak werkbon" button triggers the status change AND job creation in a single action. Clicking it on a DRAFT quote skips the SENT step. |
| 4.3 | Verify job detail page | Job is linked to the correct customer and quote; status is "Gepland"; `jobType` is "Overig" (hardcoded default) | ⚠️ **Gap:** `jobType` is always set to `OTHER` when creating from a quote. No way to choose it during conversion. |
| 4.4 | Set a scheduled date: fill `Gepland van` and `Gepland tot`, click Opslaan | Dates are saved | — |
| 4.5 | Set job address if different from customer address | Address fields save correctly | — |
| 4.6 | Change job status to "In uitvoering" | Status badge updates | — |

**Dashboard impact:** "Open offertes" drops by 1 (ACCEPTED is excluded); "Actieve werkbonnen" increases by 1.  
**Dashboard impact (if today's date is set):** "Jobs vandaag" increases by 1 if `scheduledStart` is today.

---

## Flow 5 — Complete Job and Create Invoice

### 5a — Complete the job

**Page:** `/jobs/[id]`

| Step | Action | Expected result | Gap / missing feature |
|------|--------|----------------|-----------------------|
| 5.1 | Open the job from Flow 4 | Status is "In uitvoering" | — |
| 5.2 | Add a job note via the notes form | Note appears in the notes list with timestamp | ⚠️ **Note:** Requires a `User` record in the database linked to `session.email`. The app auto-creates one on first note if missing — verify this works. |
| 5.3 | Click "Afgerond" status button | Status changes to "Afgerond"; `completedAt` timestamp is set | — |
| 5.4 | Verify job no longer appears in "Actieve werkbonnen" | — | — |

**Dashboard impact:** "Actieve werkbonnen" decreases by 1.

### 5b — Create the invoice

**Page:** `/invoices`

| Step | Action | Expected result | Gap / missing feature |
|------|--------|----------------|-----------------------|
| 5.5 | Go to `/invoices`, select the customer and the job from the dropdowns, click "Nieuwe factuur" | Invoice is created with number `FAC-YYYY-0001`; quote lines are automatically copied as invoice lines | — |
| 5.6 | Open the invoice detail at `/invoices/[id]` | Invoice lines, subtotal, VAT, and total are pre-filled from the quote | — |
| 5.7 | Change invoice status to "Verzonden" | Status updates | ⚠️ **Missing:** No actual email/PDF sending. Status is changed manually. |
| 5.8 | Check the open invoice amount on the dashboard | "Openstaand factuurbedrag" increases by the invoice total | — |
| 5.9 | Change invoice status to "Betaald" | Status updates | — |
| 5.10 | Check dashboard again | "Openstaand factuurbedrag" and "Facturen open" decrease | — |

⚠️ **Missing feature — "Create invoice from job" shortcut:** There is no button on `/jobs/[id]` to create an invoice directly. The user must navigate to `/invoices` and manually re-select the customer and job.

---

## Flow 6 — Dashboard Numbers

**Page:** `/dashboard`

After completing all flows above, verify each KPI tile shows the expected value:

| KPI tile | What it counts | Expected after full flow |
|----------|---------------|--------------------------|
| Jobs vandaag | Jobs with `scheduledStart` = today, not COMPLETED/CANCELLED | 0 (job was completed) |
| Afspraken vandaag | Planning items with `startAt` = today | 0 unless a planning item was added |
| Open leads | Leads NOT in WON / LOST | 0 (converted lead is WON) |
| Open offertes | Quotes in DRAFT or SENT | 0 (quote was accepted) |
| Actieve werkbonnen | Jobs in PLANNED / IN_PROGRESS / WAITING_* | 0 (job was completed) |
| Wacht (materiaal/weer) | Jobs in WAITING_FOR_MATERIAL / WAITING_FOR_WEATHER | 0 |
| Openstaand factuurbedrag | Sum of SENT + OVERDUE invoices | 0 (invoice was paid) |
| Facturen open | Count of SENT + OVERDUE invoices | 0 |

⚠️ **Note:** Dashboard numbers are **server-rendered on each page load** — no real-time updates. Reload the page after each action to see updated counts.

---

## Known Missing Features (Summary)

| # | Feature | Affected flow | Priority |
|---|---------|--------------|----------|
| M1 | `description` field missing from lead create form | Flow 1 | Low |
| M2 | `customerType` not set during lead → customer conversion | Flow 2 | Medium |
| M3 | `jobType` always defaults to OTHER when creating from quote | Flow 4 | Medium |
| M4 | No "Create invoice from job" button on `/jobs/[id]` | Flow 5 | High |
| M5 | No PDF generation or email sending for quotes/invoices | Flows 3, 5 | High |
| M6 | Planning item creation not integrated into job flow | Flow 4 | Medium |
| M7 | No quote PDF preview or print view | Flow 3 | Medium |
| M8 | No customer activity summary or last-contact date on customer page | General | Low |

---

## Quick Smoke Test (5 minutes)

If you only have time for a quick check, run these 5 actions:

1. **`/leads`** — create a lead → should appear in list
2. **`/leads/[id]`** — click "Omzetten naar klant" → should land on `/customers/[id]`
3. **`/quotes`** — create a quote for that customer → should get number `OFF-YYYY-XXXX`
4. **`/quotes/[id]`** — click "Maak werkbon" → should land on `/jobs/[id]`
5. **`/dashboard`** — reload → "Actieve werkbonnen" should be ≥ 1

If all 5 pass, the core ERP spine is functional.
