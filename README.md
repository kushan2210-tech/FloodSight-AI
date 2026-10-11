
# FloodSight AI — Mapping Flood Damage from Space

React frontend for a satellite-powered flood damage analysis workflow, backed by
a FastAPI service that runs a custom-trained flood segmentation model over
Sentinel-1 radar imagery.

## Stack

### Frontend

- React
- React Router
- MapLibre GL JS
- JavaScript / JSX
- Plain CSS
- Node.js build/server script with esbuild for bundling

### Backend

- FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic
- PostgreSQL for analysis records and the job queue
- Rasterio, Shapely, GeoPandas, NumPy, SciPy for geospatial processing
- PyTorch for the custom flood segmentation model
- A dedicated worker process consuming PostgreSQL-backed jobs

## Repository layout

```
src/                  React frontend
build.mjs             esbuild bundler and dev/preview server
backend/              FastAPI service, worker and tests
docker-compose.yml    postgres, api and worker services
multimodal-ai/        model repository checkout (git-ignored)
```

## Requirements

- Node.js 20 or newer, and npm
- Python 3.12
- PostgreSQL 14 or newer
- Trained model weights (`best.pt`) — see `backend/README.md`

## Run locally

Backend first:

```bash
docker compose up -d postgres

python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cp backend/.env.example backend/.env     # set MODEL_PATH and MODEL_REPO_PATH
cd backend && alembic upgrade head && cd ..

uvicorn app.main:app --app-dir backend --reload     # http://localhost:8000
python -m app.workers.analysis_worker               # in a second terminal
```

Frontend:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The dev server proxies `/api` and `/health` to
`http://127.0.0.1:8000`, so no frontend configuration is needed for local work.

Full setup, model installation and configuration details are in
[`backend/README.md`](backend/README.md).

## Production build

```bash
npm run build
npm run preview
```

The production bundle is written to `dist/`. The preview server runs at `http://localhost:4173`.

## Map and API connection

The interactive map uses public OpenStreetMap raster tiles and opens centered on Kerala for the initial New Analysis screen. It supports zooming, panning, and drawing the area-of-interest bounding box. Tile/network failures show a visible map warning instead of leaving a silent blank panel. Map tiles require an internet connection.

The workspace API indicator checks the analysis-list endpoint and reflects the actual response (`CHECKING API`, `API CONNECTED`, or `API NOT CONNECTED`).

The API client uses same-origin `/api/...` by default. To configure a separate backend, define `window.FLOODSIGHT_API_BASE_URL` before `/assets/app.js` loads, or configure a reverse proxy so `/api` is routed to FastAPI.

Endpoints consumed by the frontend:

- `POST /api/analyses`
- `GET /api/analyses`
- `GET /api/analyses/{id}`
- `GET /api/analyses/{id}/status`
- `GET /api/analyses/{id}/facts`
- `GET /api/analyses/{id}/map`
- `GET /api/analyses/{id}/report`

`POST /api/analyses` returns `202 Accepted` once the job is recorded; the frontend then polls `status` until a terminal state and only then reads `facts`, `map` and `report`. The active analysis identifier is kept in `sessionStorage`, so reloading the page or opening `/results?id=<uuid>` from the analysis history continues to show the same analysis.

## Data integrity

The frontend contains no flood-analysis results of its own. Availability checks, processing state, result facts, map layers, and reports all come from the backend. No flood polygons or impact metrics are fabricated in the browser.

Flood extents displayed on the map are model predictions derived from Sentinel-1 radar imagery. They are not confirmed ground truth, and the interface states this wherever results are presented. Infrastructure layers show OpenStreetMap features that intersect the predicted extent; intersection indicates exposure, not confirmed damage.


## Map and API troubleshooting

The map uses public OpenStreetMap raster tiles and needs internet access. If it is still blank, open browser DevTools (F12) → Console and Network, reload, and check for blocked tile requests or JavaScript errors. The map resizes when its panel layout changes.

The `API NOT CONNECTED` indicator means the backend did not respond. Check that the API is running on `http://localhost:8000` and that `curl http://localhost:8000/health/live` succeeds. The worker is a separate process; if analyses remain `queued`, the worker is not running.

To point the frontend at a backend on another host, set `window.FLOODSIGHT_API_BASE_URL` in `index.html` before the app bundle loads, for example `http://127.0.0.1:8000`, and allow the frontend origin through the backend's `CORS_ALLOW_ORIGINS`. Do not change the indicator to connected unless the backend actually responds.

