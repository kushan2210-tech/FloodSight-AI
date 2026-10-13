# Production deployment (preparation)
## Environment
- Backend: FastAPI, runs with uvicorn or gunicorn (see backend/README). Worker: PostgreSQL-backed.
- DB: PostgreSQL 14+ required for production.
## Env vars (key)
- DATABASE_URL, CORS settings, AUTH_* (secure in prod), MODEL_PATH, MODEL_REPO_PATH, PREDICTION_PROVIDER (trained_model for prod with weights), ARTIFACT_ROOT
## Model setup
- Place best.pt at configured MODEL_PATH (e.g. multimodal-ai/checkpoints/best.pt). Verify loads via health/model.
- MODEL_REQUIRE_CHECKPOINT=true recommended.
## Build/run
- Backend: pip install -r requirements.txt; alembic upgrade head; run uvicorn app.main:app --host 0.0.0.0 --port 8000
- Worker: python workers/analysis_worker.py (separate process)
- Docker: build backend image (backend/Dockerfile exists). Ensure weights not baked unless intended; mount or copy via volume.
## Security notes
- Disable debug in prod. Set secure cookies (HTTPS). Restrict CORS. Never commit secrets. Health endpoints exist.
