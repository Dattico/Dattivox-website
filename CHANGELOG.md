# Changelog

## [Unreleased]

### Added
- Post-build prerendering step (`scripts/prerender.js`, run via `npm run build`) that renders the SPA in headless Chromium and bakes the fully-rendered `#root` markup into `dist/index.html`. This is a client-only React app with no SSR, so crawlers and AI agents that fetch raw HTML without executing JS previously only ever saw an empty `<div id="root">` plus a small hidden fallback blurb; now they get the real, current page content. Adds `puppeteer` and `serve-handler` as dev dependencies.

### Changed
- Rebuilt the homepage (`src/pages/MunicipalityDemo.jsx` and `src/pages/MunicipalityDemo.css`; `src/pages/DattivoxLanding.css` left untouched since its shared header/footer/contact/demo-modal base styles still apply) around the "Every customer gets an answer" brand direction, matched to a specific reference layout: sticky header with Product/Industries/Customers/Resources/About nav and an icon-only language switcher; hero with headline, checkmark row, and a live-calls panel overlapping a real photo with an overlaid testimonial quote; a 7-step "call to outcome" journey; a human-attention section with a real photo; an "always there" live-calls list; know-and-act, visibility/insights, and industries sections; a case-study banner; and a closing CTA banner. Restyled every section to the corporate palette (deep purple `#4C2E76`, lavender `#A286B9`, light blue `#9EB9D8` — the same colors already used in the Dattivox logo and `App.jsx`'s Ant Design theme), replacing an earlier muted-teal accent pass. Preserved all existing functionality: the OctoplanDemo voice modal, the Amplify `sendContactEmail` contact form, the EN/FR/NL language switcher, and the municipality flow/analytics visuals.
- Added a new `brand.*` translation namespace to `src/locales/en.json`, `src/locales/fr.json`, and `src/locales/nl.json` with fully translated copy for every new section; existing `municipality.*` keys were kept intact.
- Added two real photos (`src/assets/photos/receptionist-welcome.jpg`, `receptionist-testimonial.jpg`), cropped from user-supplied reference images to remove an incorrect AI-generated logo and baked-in marketing text, then re-encoded as optimized JPEGs (~40KB each, down from ~400KB PNGs) for mobile performance.
- The case-study banner's testimonial is attributed to a first-name-only pseudonym ("Maria") and the Municipality of Uccle — an identifiable full name from the reference material was removed for GDPR reasons before this ever reached committed code.

- Added a "Customer Stories" editorial section (two large, low-copy stories — Municipality of Uccle and Smiles by Maria — each following situation → problem → how Dattivox quietly handles it → human outcome → factual/placeholder proof), replacing the old small case-study banner. Corrected an earlier GDPR-driven anonymization that had incorrectly merged the placeholder name "Maria" into the Uccle attribution — the Uccle reception team is now credited without a personal name, and "Smiles by Maria" is its own distinct story with an explicit placeholder for verified results (no fabricated quotes or stats).
- Added an "Origin story" section (the real story of Dattivox starting from a missed call with a plumber) and a "Built by a small team in Brussels" section crediting the four real Dattico team members (Sergio, Nathan, Elie, Hugues) with their real roles and quotes, sourced from dattico.com/team. The "About" nav link now scrolls here instead of going nowhere.
- Rebalanced the header CTAs: "Try the voice demo" is now the prominent solid button (with a phone icon), and "Book a demo" is a lighter secondary link — reflecting that booking a demo is the follow-up action after experiencing the voice demo, not the primary ask.
- Tightened the "Know and act" section's copy to name the underlying pain point (customers on hold while staff search for answers) before the payoff line, per a sales/discovery brief on core customer problems.

- Replaced the Uccle customer story's photo with a real user-supplied image (`src/assets/photos/uccle-reception.jpg`); shown uncropped (`object-fit: contain` at its native aspect ratio) per feedback that cover-cropping cut off too much of the scene.
- Rebalanced header CTAs: "Try the voice demo" is now the prominent solid button (with a phone icon); "Book a demo" is a lighter secondary link, reflecting that booking is the natural follow-up to trying the demo, not the primary ask.
- Added a line to the "Know and act" section naming real integrations (Crossuite, Odoo, more on the way) — the discovery brief's "know your customer" value wasn't previously backed by any concrete system names.

### Changed (minimalism pass)
- Cut the site's copy substantially across every section — shorter headlines, fewer supporting lines, removed redundant subtitles/footnotes that repeated the same point twice (e.g. Always There, Visibility, Industries).
- Customer Stories: removed the "problem" paragraph and the multi-step flow-chip row from both stories, leaving eyebrow → headline → one outcome line → one proof line per story. Also removed the section's own subtitle since the closing tagline already said the same thing.
- Removed the redundant "Live in Uccle — product evidence" section (a second, heavier retelling of the Uccle story with a flow-chart mock, conversation card, and log card) since the leaner Customer Story already covers that proof point.
- Added a compact "Built to fit your business, not the other way around" differentiators row (3 short items: simple self-service configuration, integrations, competitive telephony/pricing) — consolidates the integrations mention that was previously its own sentence under "Know and act".
- Rewrote the hero's Live Calls panel to actually cycle through a rotating roster of callers (was: the same 4 fixed names just relabeling their status forever) — each caller now moves from Answered to Resolved/Transferred, then scrolls off as a new caller appears.
- Removed the header's "Try the voice demo" button as a duplicate of the hero's primary "Call Dattivox" action; "Book a demo" is the sole header CTA again. Note: this was the only trigger for the embedded OctoplanDemo voice-demo modal, so that modal is currently unreachable from the UI — flag if it should be wired up elsewhere.

- Added an integrations strip directly under the hero (above the fold) naming Odoo and Crossuite — rendered as text wordmarks in the site's own typeface, not real logo assets (none were available); swap in real logo files when provided.

### Fixed
- **The site's brand typeface (Montserrat) was never actually loading.** Every `font-family: 'Montserrat', ...` declaration across the codebase (headings, hero, buttons) was silently falling back to the browser's default system font, because no stylesheet ever loaded the Montserrat font file — only Google's Material Icons font was linked in `index.html`. Added the missing Google Fonts `<link>` for Montserrat (weights 400–800). Confirmed via the Font Loading API that Montserrat now actually loads and renders.
- Removed the caption text overlaid on the Uccle customer story's photo (kept as `alt` text for accessibility/SEO, no longer rendered over the image).
- Replaced the empty-looking gradient placeholder for the Smiles by Maria photo (still no real photo available) with a centered icon, so it reads as "photo coming soon" rather than a blank/broken box.

- Smiles by Maria's story is now text-only (no photo placeholder) until a real photo is supplied — the empty gradient box kept reading as broken/incomplete no matter how it was styled, so removing it entirely was the right call rather than continuing to patch its appearance.
- Strengthened the integrations strip: bolder copy ("Integrates directly with the systems you already run") and an accent-tinted background, so it reads as a real differentiator claim rather than a quiet footnote.

### Known issues
- `npm run lint` fails with a pre-existing, unrelated `ERR_REQUIRE_ESM` error loading `.eslintrc.js` (repo-wide ESM/CommonJS config mismatch, predates this change) — not addressed per scope.
- Main JS bundle is ~1.6MB (pre-existing, not introduced by this change) — a code-splitting pass would help load performance separately from this work.
