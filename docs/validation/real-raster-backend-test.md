# Real-raster backend integration test
- Input: real Sentinel-1 staging rasters (2-band VV/VH float32 dB), EPSG:32645, 20m, aligned pre/post (1680x1508).
- Checkpoint: multimodal-ai/checkpoints/best.pt loaded via backend adapter (available=True).
- Provider: TrainedModelProvider exercised; pred.synthetic=False (trained model).
- Inference: tiled inference with pre_image_db provided (temporal filter applied).
- Output: mask shape (1680,1508), classes [0,1] (no nodata in this full-coverage case), flood pixels=17462.
- No silent fallback to synthetic; provenance confirms trained_model.
- No exceptions observed in direct service call. Logs clean.
- Regression: model_adapter + prediction_providers 68 passed, 1 skipped. No regressions.
**Verdict:** PASS — real-raster inference completed through trained_model provider; outputs validated on staging rasters. No regressions in core tests.
