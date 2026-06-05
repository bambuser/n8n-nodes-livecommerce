# n8n-nodes-livecommerce

[![CI](https://github.com/bambuser/n8n-nodes-livecommerce/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/bambuser/n8n-nodes-livecommerce/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@bambuser/n8n-nodes-livecommerce.svg)](https://www.npmjs.com/package/@bambuser/n8n-nodes-livecommerce)
[![npm downloads](https://img.shields.io/npm/dm/@bambuser/n8n-nodes-livecommerce.svg)](https://www.npmjs.com/package/@bambuser/n8n-nodes-livecommerce)
[![Node 24+](https://img.shields.io/node/v/@bambuser/n8n-nodes-livecommerce.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Community [n8n](https://n8n.io) nodes for the [Bambuser](https://bambuser.com) video-commerce platform. Connect **Bambuser Live**, **Bambuser Shoppable Videos**, **Bambuser Video Consultation**, the product catalog, shopper-data records, and webhook events into n8n's 400+ integrations without writing custom HTTP code.

## About

Bambuser powers live, on-demand, and one-to-one video commerce for retailers and brands. This package wraps the public Bambuser APIs as native n8n nodes so non-engineers can wire video-commerce events into CRMs, data warehouses, messaging platforms, and analytics tools by dragging nodes onto a canvas. The package is maintained by Bambuser and developed in the open.

## Available nodes

All nodes share a single `Bambuser API` credential. Each maps to a Bambuser product area and exposes resource/operation pairs in the standard n8n style.

**Bambuser Webhook Trigger** — Start a workflow when Bambuser fires an event. The node registers and tears down the subscription against the Bambuser API on workflow activation/deactivation, and re-registers automatically if the webhook URL changes.
- `show.*`, `broadcast.*`, `product.*`, `product-highlight.*`, `user.*` topics
- Requires the `WRITE_WEBHOOKS` API-key scope

**Bambuser Live** — Read and write live show data mid-workflow.
- List, create, update, publish, and schedule shows
- Pin and unpin chat messages
- Manage product highlights and pull viewer/sales metrics

**Bambuser Shoppable Videos** — Create and manage VOD assets.
- Clip a broadcast into a VOD
- Manage media assets, captions, and video playlists
- Query the video library

**Bambuser Product Catalog** — Search and manage the product catalog.
- Search and count products
- Create, update, delete
- Suitable for AI enrichment and stock-sync workflows

**Bambuser Video Consultation** — Automate one-to-one video calls and connect links.
- Create connect links
- Fetch call transcripts
- Manage agents, appointments, and availability

**Bambuser Shopper Data** — Read and erase shopper-data records.
- List and get records
- Drive GDPR erasure pipelines from a webhook

### Credential

The `Bambuser API` credential takes an API key, a region (`EU` or `US`), and an optional base-URL override. The key is sent as `Authorization: Token <key>`. Scopes are granted per-key in the Bambuser dashboard; relevant scopes include `VOD_MANAGE`, `VOD_READ`, `PRODUCT_CATALOG_READ`, `PRODUCT_CATALOG_MANAGE`, `WRITE_WEBHOOKS`, and `READ_SHOPPER_DATA`. Grant only the scopes the workflow needs.

## Prerequisites

- [n8n](https://n8n.io) 1.57.0 or later
- Node.js 24 or later (only required for local development of the nodes themselves)

## Installation

### n8n Cloud and self-hosted (Community Nodes UI)

1. Open n8n and go to **Settings → Community Nodes**.
2. Click **Install** and enter `@bambuser/n8n-nodes-livecommerce`.
3. Confirm the install. The Bambuser nodes appear in the node panel after a short refresh.

See the n8n [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for the full UI walkthrough and the security caveats around third-party nodes.

### Self-hosted via npm

For self-hosted n8n instances that install community nodes from the file system:

```bash
cd ~/.n8n/custom
npm init -y       # only if package.json does not already exist
npm install @bambuser/n8n-nodes-livecommerce
```

Restart n8n. The nodes load from `~/.n8n/custom/node_modules`.

## Credentials

A Bambuser account is required. You can create one for free at [bambuser.com](https://bambuser.com).

1. Sign in to your Bambuser dashboard ([EU](https://lcx-eu.bambuser.com/) or [US](https://lcx.bambuser.com/), matching your org's data residency) and open **Settings → API Keys**.
2. Create a new key and grant the scopes your workflow needs (see the list under [Available nodes](#available-nodes)).
3. In n8n, create a new credential of type **Bambuser API**:
   - **API Key** — the key from the dashboard.
   - **Region** — `EU` or `US`, matching the org's data residency.
   - **Base URL Override** — leave empty in production. Used for pointing at a non-default API host (staging, a tunnel, a local proxy).

The credential is reused across every node in this package.

## Compatibility

Built and tested against n8n 1.57 and later. Earlier versions are not supported.

## Quick start

A minimal workflow that reacts to a Bambuser show ending:

1. Add a **Bambuser Webhook Trigger** node. Select the `show` topic.
2. Activate the workflow. The node registers a webhook subscription against the Bambuser API automatically.
3. Add downstream nodes (Slack, HTTP Request, database, etc.) consuming the event payload.

End the show in the Bambuser dashboard. n8n receives the webhook and runs the workflow.

## What you can build

A few workflows that merchants commonly assemble from these nodes plus n8n's built-in integrations:

- **Go-live notification blast** — `show.started` → SMS via Twilio + email via Klaviyo + Instagram Story post.
- **Automatic show recap** — `show.ended` → pull stats → AI summary → post to Slack and save to Notion.
- **Live → VOD → CMS pipeline** — `broadcast.ended` → create VOD → AI writes description → push to Contentful or a Shopify product page.
- **Data warehouse sync** — `show.ended` → append views, carts, and revenue to BigQuery or Google Sheets.
- **Low-stock alerts** — daily catalog scan → Gemini drafts a restock recommendation → append to a shared Google Doc.
- **GDPR shopper data erasure** — erasure webhook fires → delete shopper record → log confirmation for the audit trail.

See [`examples/workflows/`](./examples/workflows/) for ready-to-import JSON workflows demonstrating each of these patterns.

## Examples

Ready-to-import workflow JSON files live under [`examples/workflows/`](./examples/workflows/). Import a file from the n8n UI via **Workflows → Import from File**, then attach your Bambuser API credential.

## Local development

```bash
git clone https://github.com/bambuser/n8n-nodes-livecommerce.git
cd n8n-nodes-livecommerce
nvm use        # picks up .nvmrc → Node 24
npm install
npm run build
```

To link the local build into a local n8n install:

```bash
cd ~/.n8n/custom
npm link /absolute/path/to/n8n-nodes-livecommerce
```

Restart n8n and the nodes load from the local build directory.

### Docker development environment

The repo ships a Docker Compose setup that runs n8n with Postgres and bind-mounts the compiled nodes, so a rebuild + restart picks up changes without rebuilding the image.

```bash
cp .env.example .env
openssl rand -hex 32   # paste into N8N_ENCRYPTION_KEY in .env
docker compose up --build
```

n8n is available at `http://localhost:5678`.

After editing anything under `credentials/`, `lib/`, or `nodes/`:

```bash
npm run build
docker compose restart n8n
```

### Webhook testing with a Cloudflare tunnel

Bambuser needs a public HTTPS URL to deliver webhook events. To run n8n behind a free `*.trycloudflare.com` tunnel:

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up --build
```

The tunnel URL changes on every restart. To push the new URL to Bambuser, deactivate and reactivate the workflow in the n8n UI — the Bambuser Webhook Trigger node re-registers the subscription with the new URL automatically.

## Publishing

Releases are tag-driven and run from GitHub Actions with npm provenance.

1. A maintainer runs `npm run release` from the repo root. [release-it](https://github.com/release-it/release-it) prompts for a version bump, updates `package.json`, commits, tags, and pushes the tag.
2. The tag push triggers `.github/workflows/publish.yml`, which builds the package and publishes it to npm under the `@bambuser` scope with an [npm provenance statement](https://docs.npmjs.com/generating-provenance-statements).

Both Trusted Publishers (OIDC) and a long-lived `NPM_TOKEN` secret are supported. See the comments in `.github/workflows/publish.yml` for setup.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n node-development reference](https://docs.n8n.io/integrations/creating-nodes/)
- [Bambuser developer documentation](https://bambuser.com/docs)
- [Sign up for a Bambuser account](https://bambuser.com)

## License

[MIT](./LICENSE)
