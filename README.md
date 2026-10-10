
# FloodSight AI — Mapping Flood Damage from Space

React frontend for a satellite-powered flood damage analysis workflow.

## Stack

- React
- React Router
- MapLibre GL JS
- JavaScript / JSX
- Plain CSS
- Node.js build/server script with esbuild for bundling

No Vite, Next.js, Parcel, Tailwind, or UI component framework is used.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production build

```bash
npm run build
npm run preview
```

The production bundle is written to `dist/`. The preview server runs at `http://localhost:4173`.

## Map and API connection

The interactive map uses public OpenStreetMap raster tiles and opens centered on Kerala for the initial New Analysis screen. It supports zooming, panning, and drawing the area-of-interest bounding box. Tile/network failures show a visible map warning instead of leaving a silent blank panel. Map tiles require an internet connection.

The workspace API indicator checks the analysis-list endpoint and reflects the actual response (`CHECKING API`, `API CONNECTED`, or `API NOT CONNECTED`). Backend-dependent analysis functions remain unavailable until the FastAPI service responds.

The API client uses same-origin `/api/...` by default. To configure a separate backend, define `window.FLOODSIGHT_API_BASE_URL` before `/assets/app.js` loads, or configure a reverse proxy so `/api` is routed to FastAPI.

Expected endpoints:

- `POST /api/analyses`
- `GET /api/analyses`
- `GET /api/analyses/{id}`
- `GET /api/analyses/{id}/status`
- `GET /api/analyses/{id}/facts`
- `GET /api/analyses/{id}/map`
- `GET /api/analyses/{id}/report`

## Data integrity

The initial workspace intentionally contains no flood-analysis results. Availability checks, processing state, result facts, map layers, and reports must come from the backend. No flood polygons or impact metrics are fabricated in the frontend.


## Map and API troubleshooting

The map uses public OpenStreetMap raster tiles and needs internet access. If it is still blank, open browser DevTools (F12) → Console and Network, reload, and check for blocked tile requests or JavaScript errors. The map resizes when its panel layout changes.

The `API NOT CONNECTED` indicator is expected until a compatible FastAPI backend is running. The frontend does not include that backend. If the API runs on a different port or host, configure `window.FLOODSIGHT_API_BASE_URL` in `index.html` before the app bundle loads, for example `http://127.0.0.1:8000`. The backend must provide `GET /api/analyses` and the other documented `/api/analyses` endpoints, and must allow the frontend origin through CORS. Do not change the indicator to connected unless the backend actually responds.

