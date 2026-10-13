# Sentinel-1 preprocessing audit (updated)
- Real staging rasters present: 2-band VV/VH dB, EPSG:32645, 20m, aligned pre/post. Values finite, ranges consistent with dB.
- Contract: VV,VH order, dB units, same grid/CRS required for pairs, normalization uses checkpoint stats, temporal filter applies VV drop >=1.5 dB.
- Backend preprocessing service produces prepared rasters matching contract; full inference pass-through with real checkpoint not executed here. No changes made.
- Blocker: need to run end-to-end with trained model on real rasters to fully validate tensor values against checkpoint expectations.
