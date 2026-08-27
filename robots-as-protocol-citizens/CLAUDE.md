# CLAUDE.md — Robots as Protocol Citizens (workshop landing page)

## What this is
A single-page landing site for the **Robots as Protocol Citizens** hands-on workshop at the **2026 Protocol Symposium** (*New Nature*, online, **Sep 21–25 2026**), run by the **Distributed Robotics Research Group**. Organizers Anuraj R & Rafael Fernández.

Self-contained: `index.html` + `assets/` + `announcement.md` (reusable blurbs) + `_og-card.html` (social-card source). No build step, no dependencies, no framework. Open `index.html` and it works.

**Intended URL:** <https://yakrobot.com/robots-as-protocol-citizens/> — the four absolute URLs in `<head>` (`og:url`, `og:image`, `twitter:image`, `canonical`) are already written against it. **If the path or host changes, update all four**, or link previews break: scrapers do not resolve relative `og:image` paths.

Originally built in `rafaeldavid/protocolized-publications` under `distributed-robotics-workshop/`, where its full history lives.

## The thing that shapes the whole page
Participants **buy and keep their own robot** (~$150–250). That single decision is why this page has a real bill of materials, a five-step pre-workshop checklist, and a registration CTA that asks for a hardware commitment — where the Kitcraft page it was forked from was just a notify list.

The rejected alternative was organizers funding 10–25 shared robots (~€1500–5000). If that budget is ever approved, `#robot` and the registration framing both need rewriting.

## Registration
Every CTA — nav, mobile menu, hero, and the `#interest` card — opens the **Google Form** responder URL in a new tab:

```
https://docs.google.com/forms/d/e/1FAIpQLScfT_Ia2h7-1Vs0fdPNtOMBv912DG3EGXhCUSgk2kspDLyuzw/viewform
```

**Never use the `/forms/d/<id>/edit` URL.** It redirects to the editor preview: visitors without edit rights hit a permission wall, and visitors with them could modify the form. The gutter link keeps its `#interest` anchor because that nav is a scroll-spy over on-page sections.

`#interest` also carries the three **Symposium-wide** links — Luma registration, the Protocol Institute programme page, the Protocolized announcement. Workshop registration and Symposium registration are separate, and the page says so explicitly. Don't collapse them.

An earlier version posted to a Cloudflare Worker (`_Infrastructure/protocolized-inbox`) which relayed to Discord and persisted to KV. That form was removed when the Google Form replaced it — the worker still exists and still serves other pages, but **this page no longer touches it**, so its origin allowlist and deploy state are irrelevant here. History: `git log -- distributed-robotics-workshop`.

## Brand
Protocol Institute Institute vein, tuned to the hero artwork. Three roles, kept strictly separate:

| Role | Token | Used for |
|---|---|---|
| cobalt | `--pi-action-primary` `#0064ff` | links, eyebrows, numerals, focus, informational notes |
| indigo | `--pi-indigo` `#092cba` | labels and metadata: `.spec`, `.daylabel`, `.org .role`, avatars |
| rust | `--pi-accent-strong` `#c04b22` | every conversion CTA, `.steps` circles |

Indigo is sampled from art_1's palette in the brand kit's `metadata.json` — the kit's documented way to harmonize a layout with its artwork. Rule of thumb: **if it converts it's rust, if it's a label it's indigo, everything else is cobalt.**

`--pi-accent-strong` `#c04b22` is a **derived step, not a kit token**. Bare rust `#d85a30` is only 3.87:1 under white so it cannot fill a 16px button; `#c04b22` gives 4.92:1 text *and* 3.72:1 against the navy ground. Same move the kit already made for `accent-deep`. Worth pushing back into the brand kit.

Dark surfaces use `#02113c` (deep cobalt from the hero art) rather than Kitcraft's dark green — the main visual differentiator. On-dark accent `#9dc4ff`.

Fonts: Instrument Serif (headings), Lora (body), Outfit (UI). Paper `#f9f8f5`.

## Imagery
- `hero-stack.jpg` — art_1, stacked planes, reads as a protocol stack
- `art-cube.jpg` — art_6, flattest piece, sits behind text
- `fnd-*.jpg` — art_2/2b/3b/4 at 440px, foundations thumbnails
- `og-card.png` — 1200×630 social card, rendered from `_og-card.html` (regeneration command is in a comment in that file)
- `robot-3q.jpg`, `robot-top.jpg` — **Freenove renders, CC BY-NC-SA 3.0**, extracted from their tutorial PDF with the app-UI overlay masked out. **The attribution and licence link in the figcaption must stay** — the licence is non-commercial and share-alike.

House art comes from `protocolinstitute-brandkit/assets/images/`. Never real-person photos, screenshots or charts.

## Verify before shipping
```bash
python3 -m http.server 8771     # then screenshot at 1440 and 390
```
The original repo also ran two brand-kit checks (`preflight.mjs` for static lint,
`contrast-check.mjs` for the WCAG token contract). Those scripts live in
`protocolinstitute-brandkit` and were **not** vendored here. If you change colours or
structure, either pull them in or check by hand.

**Four things the automated checks do not cover.** All were caught by eye or by hand, and all have bitten once:

1. **Contrast.** The kit's contract covers neither this page's dark-cobalt ground nor its indigo/rust roles. All pairings were verified by hand; the tightest are the CTA (4.92:1 text, 3.72:1 boundary on navy). The CTA's *hover* fill is only 2.73:1 on navy, so on dark surfaces hover adds a white ring to carry the boundary — don't remove it.
2. **Preflight's `a.btn{color}` warning is a known false positive.** The fix is `color` on the `.btn` base class, which wins on specificity over the global `a{color}`. Verified in-browser: every button computes white text. Do **not** "fix" it by adding an `a.btn` rule — that out-specifies the modifiers and breaks them.
3. **Light islands inside `.dark` bands.** `.dark h2/h3/h4` paints headings white; a `.formcard` sitting in a dark band inherits that and renders white-on-white. There's a defensive reset in `.formcard` now. Preflight cannot see this — only a screenshot can.
4. **`.chip` is a flex row**, so a `<b>` mid-sentence gets `gap` space on both sides. Lead with the bold instead. And `text-wrap:pretty` rags badly in the narrow `#stack` cards, which are set back to `text-wrap:wrap`.

## Hardware facts — verified, do not "correct" from memory
- **Docs code is `fnk0043`**, not `fnk0041`. fnk0043 is the *4WD Smart Car Kit for Raspberry Pi* and covers the mecanum variant; **fnk0041 is Freenove's Arduino kit**, a different product.
- Tutorial PDFs (~9 MB) live in the kit repo at `.../raw/master/Tutorial%28ordinary_wheels%29.pdf` and `...%28mecanum_wheels%29.pdf`. Parens must stay percent-encoded.
- **A charger is required.** From Freenove's `About_Battery.pdf`: *"The control board connected to the USB cable will not charge the batteries. So you also need a charger,"* and *"almost any charger suitable for 18650 batteries can be used."* The page therefore names no specific charger.
- Cells must be **button-top, unprotected, 10A+ discharge**. Freenove publish a flat-top list too, but the page deliberately keeps the messaging to button-top only.
- **Do not claim Amazon bans 18650 sales.** An earlier version did; it conflated two separate lines of Freenove's text into a causal claim they don't make, and it's false for amazon.de — which is where the cells+charger link on this very page points. What holds up independently: genuine 18650s top out around 3600 mAh, so a listing claiming far more is not a real cell.
- The two callouts are **informational, not warnings**. They were red once; that overstated them. Nothing on this page is a safety hazard.

## Build videos
`#videos` holds Freenove's 7-part playlist (`PLOkhax8xuWu3mZHYE502-aws1rnxhhdvO`), reordered into build order rather than playlist order. The player is **click-to-load**: no request reaches YouTube until a visitor opens one, the host is `youtube-nocookie.com`, and **closing a `<details>` removes the iframe** — a hidden `<details>` otherwise keeps playing audio. One plays at a time. Verified: 0 iframes at load, exactly 1 while open, 0 after close.

## Deploy
Static: no build step. Serving `robots-as-protocol-citizens/index.html` at the URL above is
the whole deployment. Everything is self-contained apart from Google Fonts and, once a
visitor presses play, the YouTube embeds.

## Open threads
- **Session mapping** — the brief listed seven slash-separated phrases for "2 sessions each day", so the 4-session split (intro+stack / code set-up // build+fix / identity+MCP+marketplace) is an interpretation. Splitting session 4 in two is a small edit if 5 were meant.
- **YakRover vs YakRobot** — the source proposals disagree. This page uses **YakRover** throughout, matching `yakrover-protocols`, `#yak-rover` and the YakRoboticsGarage org. The destination repo is `yakrobot.com`. Worth settling before announcing.
- **Hardware mismatch** — the SIG's `yakrover-protocols` runs on a ~$150 ESP32-S3 rover; this workshop's BOM is the Freenove/RPi car. The page omits the ESP32 detail so it doesn't contradict itself.
- **Schedule** — the page states Sep 21–25 and four sessions from the original brief, not from the published Symposium programme. Cross-check against <https://protocol-institute.org/events/protocol-symposium-2026/>.
- No participant cap is stated; the proposal never set one.
