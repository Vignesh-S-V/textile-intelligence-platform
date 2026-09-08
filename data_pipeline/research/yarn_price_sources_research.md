# Yarn Price Source Research (real, accessible, unrestricted sources only)

## Sources evaluated

| Source | What it has | Verdict |
|---|---|---|
| Agmarknet / data.gov.in (govt API) | Raw cotton (Kapas) mandi prices | Already integrated. **Not yarn** — raw material only. |
| NCDEX (National Commodity & Derivatives Exchange) | "29mm Cotton" futures (raw cotton fibre) | No yarn futures contract currently listed. Raw fibre only. |
| Office of the Textile Commissioner (txcindia.gov.in) | Cotton area/production/yield, lint cotton prices, mill production volumes | Government and free, but covers **lint cotton price and yarn production volume**, not yarn transaction prices. |
| Fibre2Fashion (news + Market Watch/TexPro) | Real yarn spot prices (count, blend, mill location, ₹/kg) reported in market news | Real yarn price data exists here, but: (1) their Terms of Use expressly prohibit "copying, distributing, modifying, or creating derivative works of our services without written permission"; (2) the yarn-price articles are served under a `/prime-content/` (membership) URL path. Both are access restrictions we were told never to bypass. **Rejected.** |
| EmergingTextiles.com | Weekly India yarn price benchmarks (cotton/PSF/VSF, poly-cotton, poly-viscose) | Explicitly paywalled ("You must be a member to access this content"). **Rejected.** |
| CITI (Confederation of Indian Textile Industry) | Occasionally cites yarn prices in press statements | No public dataset or API; only ad hoc press quotes. Not integrable as a structured, verifiable feed. |

## Conclusion

There is currently **no free, publicly accessible, real-time yarn-price source** that can legally be integrated without violating a paywall, membership wall, or explicit terms-of-use restriction. Every real-time yarn spot-price feed we found (Fibre2Fashion Market Watch/TexPro, EmergingTextiles, CITI members' data) is a paid/restricted commercial product — which is exactly why these providers can charge for it.

## What this means for the platform

- The `yarn_prices` table stays empty until one of the following happens:
  1. The project purchases/licenses a commercial feed (e.g. Fibre2Fashion TexPro API, EmergingTextiles subscription) and we build an authorized adapter against the licensed API, or
  2. A staff member with legitimate access to a licensed price sheet manually records a price through the new verified-entry endpoint below, with full provenance.
- No yarn price may ever be inferred, estimated, or derived from the raw cotton (Agmarknet) data — cotton and yarn are different products with different, independently-set prices.
- The current-price and forecast endpoints already return "No verified data available" / "unavailable" when `yarn_prices` has no verified rows for a given yarn (see backend/app/api/yarns.py, backend/app/ml/forecast_engine.py from the previous change set) — this is correct and required no further change.
