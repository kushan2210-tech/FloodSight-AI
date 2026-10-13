# Backend model validation (updated)
- Checkpoint loads successfully via backend adapter (model_service.py). Available=True, val_flood_iou=0.24681.
- model_config/norm/patch_size valid. CPU inference works.
- test_model_adapter.py: 35 passed, 1 skipped
- test_prediction_providers.py: 33 passed
- Other synthetic/unit suites: geospatial 19 passed/15 skipped; pipeline_synthetic 28 skipped (context-dependent); results_reports 22 skipped. No failures.
- Trained-model provider can load checkpoint; full end-to-end with real staging rasters not executed here (needs careful DB state; safe unit paths verified).
