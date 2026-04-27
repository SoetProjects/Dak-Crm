# DakCRM MVP structuur

## App routes

- `app/(app)/dashboard` - dashboard en KPI-overzicht
- `app/(app)/leads` - leadbeheer
- `app/(app)/customers` - klantbeheer
- `app/(app)/jobs` - werkorders
- `app/(app)/quotes` - offertes
- `app/(app)/planning` - planning kalender
- `app/(app)/instellingen` - bedrijfsinstellingen en gebruikers
- `app/mobile/jobs` - mobiele veldwerkerweergave

## Domeinlagen

- `features/*` - modulelogica per domein (dashboard, leads, klanten, jobs, offertes, planning, mobiel)
- `components/layout` - shellcomponenten (sidebar, topbar)
- `components/ui` - herbruikbare UI-bouwstenen
- `lib/db` - database client en datatoegang
- `lib/auth` - authenticatie configuratie en helpers
- `lib/tenancy` - tenant-context en tenant-isolatie helpers
- `prisma` - datamodel, migraties en seed-bestanden
