# Rollback & smoke tests
## Smoke tests
- GET /health/live, /health/ready, /health/model (trained model should report available if checkpoint loaded)
- Create small analysis with prepared rasters (synthetic provider fine for smoke; trained provider requires valid rasters+checkpoint)
- Verify artifacts generated, facts.json valid.

## Rollback
- Keep previous image/artifact versions. Restore DB backup if migrations changed schema. Revert MODEL_PATH to last known good checkpoint if weights corrupted.
