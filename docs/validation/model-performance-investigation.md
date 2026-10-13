# Model performance investigation
- Checkpoint val_flood_iou: 0.24681 (from checkpoint metadata).
- Previously reported held-out macro IoU ~13.95% (from docs). Baseline figures from existing evaluation artifacts; reproduction requires running inference on held-out manifests with checkpoint — not performed to avoid side effects.
- Diagnosis (from docs+code): extreme class imbalance, threshold generalization across events, distribution shift (event-held-out split), high FP rate on zero-flood scenes.
- No held-out test tuning performed.
- Recommendation: Research prototype only. If pursuing pilot, must validate on independent scenes and add human review.
