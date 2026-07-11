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

The live site is connected to the Ace Pools Supabase project. Open **Cloud**, enter Alex's email, use the secure login link and select **Upload this device**. Other devices can then use **Restore latest data**.

Cloud mode synchronises leads and reviews across Alex's devices and receives public QR Pool Check enquiries. The published key is intentionally browser-safe; row-level security protects private sales data.

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
