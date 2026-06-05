# Example Workflows

Reference workflows for the `@bambuser/n8n-nodes-livecommerce` community node.

## Importing

Drag-and-drop the `.json` file onto the n8n canvas, or run:

```
n8n import:workflow --input=<file>.json
```

Credentials are not embedded — n8n will prompt you to attach them on first run.

---

## ai-show-description-writer.json

Picks a show missing a description, fetches its products, and asks Gemini to write one before updating the show.
Uses: `Bambuser Live`.

## ai-shoppable-videos-description-generator.json

Fetches recent shoppable videos and uses Gemini (via LangChain chain) to generate title/description metadata, then writes it back to each one.
Uses: `Bambuser Shoppable Videos`.

## bambuser-show-to-shoppable-videos.json

Webhook-triggered: when a live show ends, fetches its broadcasts and creates a shoppable video from them.
Uses: `Bambuser Webhook Trigger`, `Bambuser Live`, `Bambuser Shoppable Videos`.

## live-chat-qa-auto-pinner.json

Polls every 2 minutes for live shows, pulls recent chat messages, classifies them with Gemini, and pins the top question.
Uses: `Bambuser Live`.

## live-broadcast-transcript-to-docs.json

Webhook-triggered: when a broadcast ends, concatenates its transcript, summarises with Gemini, and writes the result to a new Google Doc.
Uses: `Bambuser Webhook Trigger`, `Bambuser Live`.

## calls-analytics-report.json

Weekly schedule: pulls accepted and missed call stats, analyses them with Gemini, and appends the report to a Google Doc.
Uses: `Bambuser One-to-One`.

## calls-connect-link-bulk-generator.json

Manual trigger: reads appointment IDs from a Google Doc, creates a connect link for each, and appends the links back to the doc.
Uses: `Bambuser One-to-One`.

## post-show-performance-digest.json

Webhook-triggered on show-ended: fetches show details and stats, generates a digest with Gemini, and posts it to Slack via HTTP.
Uses: `Bambuser Webhook Trigger`, `Bambuser Live`.

## product-catalog-ai-description-enrichment.json

Scheduled: finds products with empty descriptions, generates new ones with Gemini, and writes them back to the catalog.
Uses: `Bambuser Product Catalog`.

## product-catalog-health-report.json

Weekly schedule: pulls products and a count from the catalog, summarises catalog health with Gemini, and appends to a Google Doc.
Uses: `Bambuser Product Catalog`.

## product-catalog-low-stock-alert.json

Scheduled: filters products under a stock threshold and, if any are found, writes a Gemini-authored restock report to Google Docs.
Uses: `Bambuser Product Catalog`.

## shopper-data-gdpr-erasure.json

Webhook-triggered erasure request: deletes shopper data via the API and appends a success/failure audit entry to a Google Doc.
Uses: `Bambuser Webhook Trigger`, `Bambuser Shopper Data`.

## shoppable-videos-description-autofill.json

Scheduled: finds shoppable videos missing descriptions, generates one per video with the Google Gemini node, and updates the video.
Uses: `Bambuser Shoppable Videos`.

## weekly-show-performance-report.json

Every Monday at 9am: pulls the prior week's shows and stats, asks Gemini to write a report, and creates a Google Doc with it.
Uses: `Bambuser Live`.
