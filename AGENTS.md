# AGENTS.md — The Weird Guy Comics

Instructions and conventions for AI coding agents working in `superbear1859/weird-guy-comics`.

## 1. Strict Privacy & Git Identity Rules

- **Author attribution**: Always credit **`superbear1859`** everywhere — HTML `<title>`, subtitles, SVG cover signatures, end credits, code comments, `volumes.json`, `README.md`, and printables.
- **No real names or raw photos**: Never commit the author's real name, personal email address, local absolute home paths, or raw handwritten paper sheet photos (which may contain real names or personal handwriting metadata) into this repository.
- **Git identity**: Always commit with the public GitHub handle and GitHub no-reply email:
  - `user.name = "superbear1859"`
  - `user.email = "<id>+<login>@users.noreply.github.com"` (for this repo: `275353669+superbear1859@users.noreply.github.com`)
  - Verify `git config user.name` and `git config user.email` before committing.

## 2. Repository Structure

```text
weird-guy-comics/
├── index.html                 # Static volume browser, shelf cards & Continue Reading banner
├── volumes.json               # Single source of truth manifest for all volumes
├── .nojekyll                  # Disables Jekyll on GitHub Pages
├── AGENTS.md                  # Agent guide, comic authoring workflow & QA rules
├── README.md                  # Repo overview & adding-volumes guide
├── assets/
│   ├── reader.css             # Shared warm paper / comic theme & fullscreen styles
│   ├── nav.js                 # Shared top/bottom series nav, fullscreen toggle & localStorage progress
│   └── print.js               # Zero-build browser print helpers (booklet, reading PDF & thumb-flipbook)
└── volumes/
    ├── _template/index.html   # Starter template for new volumes
    ├── 01/index.html          # Vol. #1: The Weird Guy (Original Notebook Edition)
    ├── 02/index.html          # Vol. #2: We Are in a Book! (Big, Blank Edition)
    ├── 03/index.html          # Vol. #3: It's a Bird, No, It's a Plane, No, It's the Weird Guy! (Notebook Edition)
    └── 04/index.html          # Vol. #4: Don't Try New Things (Big, Blank Edition!)
```

## 3. Fast-Track Workflow: Adding Vol. #5+ from Hand-Drawn Photos

When the user provides photos of a new hand-drawn comic volume, move straight to implementation without asking redundant setup questions:

1. **Read & transcribe carefully**:
   - Crop and zoom into faint speech bubbles or corner captions before guessing.
   - If the panels are legible, proceed directly to building the volume and list 1–2 tiny handwriting double-checks at the end of your reply rather than blocking upfront.
   - Gently fix clear spelling typos (e.g., `Finaly` → `Finally`, `firey` → `fiery`), while preserving signature comic SFX and capitalization (`zoing!!!`, `Arggh!!!`, `CLONK!!!`, `POOOOP!!!!`, `Bleh!!!`, `Blek!!!`).
2. **Scaffold from `volumes/_template/index.html`**:
   - Create `volumes/<NN>/index.html` using the shared shell (`../../assets/reader.css?v=2`, `../../assets/nav.js?v=2` with `data-volume-id="<NN>"`, and `../../assets/print.js?v=2`).
   - Do **not** include external Tailwind or font CDNs.
3. **Match the source paper & visual style**:
   - **Notebook Edition** (like Vol. 1 & 3): ruled blue notebook lines, red margin line, and binder punch holes.
   - **Big, Blank Edition** (like Vol. 2 & 4): crisp white/warm paper with a subtle halftone dot pattern.
   - Standard stage geometry & palette:
     - SVG `viewBox="0 0 600 840"`
     - Paper `#FFFEFA`, Ink `#1E1B24`
     - Font stack: `'Humor Sans', 'Comic Neue', 'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive, sans-serif`
4. **Preserve recurring characters & series continuity**:
   - Keep visual consistency for **The Weird Guy** (oval head, iconic V-shaped **angry eyebrows** extending above his forehead — *not* hair, so don't add a second set of eyebrows on top of them, bean torso, expressive vertical eyes & open oval mouth), the off-screen **Narrator** (blue/red top captions), the smirking **Prankster** (dropping buckets/pranks), and recurring gags (giant erasers, lava, ultra cold water, folding chairs, Giant/Tiny/Normal Human rays, cartoon explosions, etc.).
5. **Deterministic animation engine**:
   - Implement a pure, deterministic `renderScene(sceneIdx, localT)` function so scrubbing, chapter jumping, and print/flipbook frame sampling all render reproducibly.
   - Target ~55–65 seconds total runtime across the Cover + story panels.
   - Render a **completed Cover showcase frame** on initial load (before the user clicks Play), unless `#scene=N` is present in the URL hash.
   - Wire `window.WeirdGuyProgress.save('<NN>', ...)` on interaction/completion and expose `window.WeirdGuyVolume` for `assets/print.js`.
6. **Synthesized Web Audio cartoon SFX**:
   - Use pure Web Audio API synthesis (no external audio files):
     - `weird_talk`: ~520–680 Hz square-wave chatter bursts
     - `narrator_talk`: ~190–240 Hz sawtooth bursts
     - `prankster` / `giggle`: bright triangle-wave giggles
     - Plus scene-matched cartoon sweeps/noise (`zoing`, `thud`, `mega_boom`, `lava_sizzle`, `water_splash`, `intro_jingle`, `outro_jingle`, etc.).
7. **Register in `volumes.json`**:
   - Append the new volume's metadata (`id`, `number`, `title`, `edition`, `description`, `panels`, `duration`, `path`, `badgeColor`, `coverAccent`, `coverTag`) to `volumes.json` and update `README.md`.

## 4. Technical Guardrails & QA Checklist

- **Zero external CDNs**: Everything (CSS, JS, SVG, audio, printing) must work 100% offline and on static GitHub Pages.
- **SVG sizing selector**: Always target `#stage svg` in CSS — never `.comic-stage-shell svg`, which would blow up the small play-icon SVG inside `#overlayPlayBtn`.
- **Cache busting**: GitHub Pages serves static files with `max-age=600`. `volumes.json` is fetched with `{ cache: 'no-cache' }`, and whenever you modify `assets/reader.css`, `assets/nav.js`, or `assets/print.js`, bump the `?v=N` query parameter across `index.html`, all `volumes/*/index.html`, and `volumes/_template/index.html`.
- **Local verification before pushing**:
  - Serve the repo locally (`python3 -m http.server`) and run Playwright checks:
    - Confirm `/` renders all volume cards with 0 console/page errors.
    - Confirm each volume page renders its cover showcase SVG, mounts `#seriesNav`, `#btnFullscreen`, and `#wgPrintCard`, and has 0 JS errors.
    - Capture and visually inspect screenshots to catch overlapping speech bubbles, clipped text, or layout regressions.

## 5. Printable Comics & Physical Thumb-Flipbooks

- **Skip MP4/GIF exports**: Keep the repo zero-build and vector-first; use browser Print → Save as PDF via `assets/print.js`.
- **Volume hook contract**: Every volume must define:
  ```js
  window.WeirdGuyVolume = {
    id: '04',
    number: 4,
    title: "Don't Try New Things",
    edition: 'Big, Blank Edition!',
    author: 'superbear1859',
    scenes: SCENES,
    renderScene: renderScene
  };
  ```
  and load `<script src="../../assets/print.js?v=2"></script>` before `</body>`.
- **Booklet PDFs (`buildBookletDocument(vol, imposed)`)**:
  - **No bonus sketch pages**: For standard 16-scene volumes (Cover + Panels 1–15), the booklet is an exact **16-page** book (Page 1 = Cover, Pages 2–16 = Panels 1–15 ending with "The End" on the back). If a volume's scene count is not a multiple of 4, only the minimal 1–2 credits/back-cover pages needed to reach a multiple of 4 are added — never filler sketch pages.
  - **Fold & Staple Booklet (`imposed = true`)**: US Letter Landscape (`11in × 8.5in`), saddle-stitch imposed spreads (**16 pages = 8 sides / 4 double-sided sheets** for 16-scene volumes) — print double-sided (Flip on Short Edge), fold in half, and staple along the center marks with **zero cutting required**.
  - **Reading PDF (`imposed = false`)**: Sequential Half-Letter (`5.5in × 8.5in`) vector PDF ready for FedEx Office or Mixam.
- **Physical Thumb-Flipbooks (`buildFlipbookDocument(vol, opts)`)**:
  - US Letter Portrait (`8.5in × 11in`), 8-up grid of `3.86in × 2.46in` cut-out cards.
  - **Card 00 (Cover Card)** sits first on Sheet 1 with a yellow-tinted left bind zone and warm cream cover preview.
  - **Scene Flipbook**: 32 cards (4 sheets; Cover + 31 frames sampled across the selected scene).
  - **Full Flipbook**: 48 cards (6 sheets; Cover + 47 frames sampled evenly across the entire episode).
  - Artwork is right-aligned at the thumb-flip edge (`.art-zone`), leaving a `0.96in` left `.bind-zone` for staples or binder clips so no art is covered.
