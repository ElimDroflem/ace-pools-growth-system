# Ace Pools sales operating system

Live home: `https://elimdroflem.github.io/ace-pools-growth-system/`

## Alex's daily process

1. Open **Today** and complete overdue follow-ups.
2. Open **Pool Property Register** and leave the default **Act now** filter on.
3. Open the evidence for the top property and use its stated contact route and opening line.
4. Select **Work this property**, then call, write or visit as instructed.
5. Aim to book the complimentary Pool Review and always set a dated next action.
6. Use **Field Mode** to work the surrounding cluster while already in the area.
7. Complete **Pool Review** on site, create the proposal and keep following up until won or lost.

## What the map contains

- **Confirmed pool property:** a public source explicitly shows or describes a pool.
- **Act now (A):** confirmed pool, within the territory, an available contact route and a strong current trigger.
- **Build route (B):** confirmed local pool, but the contact route or urgency needs more work.
- **Verify (C):** a new automated signal. It is not treated as a lead until the exact property, pool and route are confirmed.

Known properties remain in the register after a sale listing disappears. The daily scan adds new signals and refreshes distance, scoring and the action queue. Planning feeds are supplementary because national coverage is incomplete.

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
