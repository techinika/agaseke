# Phase 1 evidence — component gallery

Captured 2026-11-11 from `npm run dev` on `http://localhost:3100/dev/components`
with no Firebase configuration (the graceful-boot change). This proves the new
tokens and primitives render without touching production or credentials.

Files:

- `component-gallery-360.png` — full page at 360×640 (isMobile, touch, DPR 2).
- `component-gallery-390.png` — full page at 390×844.

Automated checks (Playwright 1.64.1 + axe-core, WCAG 2 A/AA):

| Check | 360×640 | 390×844 |
| --- | --- | --- |
| HTTP status | 200 | 200 |
| Horizontal overflow | none | none |
| Interactive targets < 44 px | 0 | 0 |
| axe violations | 0 | 0 |
| Page errors | none | none |

The only console message is the pre-existing report-only CSP warning
(`upgrade-insecure-requests` is ignored in a report-only policy). The Next dev
portal exists but is empty, so it is the dev indicator, not an error overlay.

`ENCRYPTION_KEY=local-build-check npm run build` also compiled and generated
71/71 static pages; the only build errors are the existing caught Firebase-admin
lookups because no credentials are configured.

Screenshots are of the gallery, not production screens. Real creator/fan flows
remain blocked on seed data (see `../before/README.md`).
