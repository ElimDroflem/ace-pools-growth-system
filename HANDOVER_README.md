# Ace Pools sales operating system

Live home: `https://elimdroflem.github.io/ace-pools-growth-system/`

## Alex's daily process

1. Open **Today** and complete overdue follow-ups.
2. Open **Lead Map** and add the strongest new leads.
3. Use **Field Mode** when working a local hotspot.
4. Open the lead's sales brief and aim to book the complimentary Pool Review.
5. Complete **Pool Review** on site.
6. Create the proposal, save it as PDF and mark it sent.
7. Keep a dated next action until the opportunity is won or lost.

## Warm leads

Use **Historic Customers** to import Ace Pools' previous projects. The required CSV template is included in `templates/historic-customer-import.csv`.

## Cloud mode

Local mode works immediately. Cloud mode requires a free Supabase project:

1. Run `supabase-schema.sql` in the Supabase SQL editor.
2. Put the project URL and public anon key into `data/public-config.json` before publishing.
3. Open **Cloud** in the platform, enter the same URL/key and Alex's email.
4. Use the secure email link to sign in, then upload this device.

Cloud mode synchronises leads and reviews across Alex's devices and receives public QR Pool Check enquiries. The anon key is designed for browser use; row-level security in the supplied schema protects private sales data.

## Core tools

- `today.html` — daily priorities and overdue actions
- `lead-map.html` — ranked leads and hotspots
- `reactivate.html` — previous-customer importer
- `canvass.html` — mobile door-knocking workflow
- `dashboard.html` — intelligence, scripts and pipeline
- `review.html` — on-site Pool Review
- `proposal.html` — customer proposal
- `inquiries.html` — new QR responses
- `sync.html` — secure multi-device connection
