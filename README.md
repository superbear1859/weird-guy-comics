# The Weird Guy — Animated Comic Series

Hand-drawn animated SVG comics with Web Audio cartoon sound effects, by superbear1859.

Hosted on GitHub Pages with a zero-build static volume browser, reading progress tracking, clean per-volume URLs, and offline browser printing for Fold & Staple booklets and physical thumb-flipbooks.

## Project Structure

```text
weird-guy-comics/
├── index.html             # Volume browser & Continue Reading shelf
├── volumes.json           # Manifest listing all volumes (single source of truth)
├── .nojekyll              # Serves files directly on GitHub Pages without Jekyll
├── AGENTS.md              # Agent guide, comic authoring workflow & print spec
├── assets/
│   ├── reader.css         # Shared warm paper / comic theme
│   ├── nav.js             # Shared top/bottom volume nav, fullscreen & localStorage progress
│   └── print.js           # Zero-build browser print helpers (booklet, reading PDF & thumb-flipbook)
└── volumes/
    ├── _template/         # Starter template for new volumes
    ├── 01/index.html      # Volume #1: The Weird Guy
    ├── 02/index.html      # Volume #2: We Are in a Book!
    ├── 03/index.html      # Volume #3: It's a Bird, No, It's a Plane, No, It's the Weird Guy!
    ├── 04/index.html      # Volume #4: Don't Try New Things
    ├── 05/index.html      # Volume #5: Poop is Yummy!!!
    ├── 06/index.html      # Volume #6: I Don't Know What to Name the Title...
    ├── 07/index.html      # Volume #7: Folding Chairs Are Weird Too!
    ├── 08/index.html      # Volume #8: I Once Saw a Poop and Found a Guy Who Said...
    ├── 09/index.html      # Volume #9: Poop!!!
    ├── 10/index.html      # Volume #10: Let's Time Travel!!!
    └── 11/index.html      # Volume #11: Is He Dead in the Future??
```

## Adding a New Volume (e.g., Volume #5)

1. **Create the volume folder** by copying the starter template:
   ```bash
   cp -r volumes/_template volumes/05
   ```
2. **Edit `volumes/05/index.html`**:
   - Update the title, badge number (`#5`), subtitle, and `data-volume-id="05"` on the `nav.js` script tag.
   - Replace the `<script>` comic engine with your new volume's scenes/SFX (or paste your new volume's script inside the shell).
3. **Register the volume in `volumes.json`** by appending an entry to `"volumes"`:
   ```json
   {
     "id": "05",
     "number": 5,
     "title": "Your Volume Title",
     "edition": "Edition Subtitle",
     "description": "Short summary shown on the library shelf.",
     "panels": 16,
     "duration": "1:00",
     "path": "volumes/05/",
     "badgeColor": "#F472B6",
     "coverAccent": "#7C3AED",
     "coverTag": "Vol. 5"
   }
   ```
4. **Commit & push to `main`** — GitHub Pages updates automatically, and the library shelf + Previous/Next volume navigation on all existing volumes will pick up Volume #5 automatically.

## Local Preview

Because `index.html` and `assets/nav.js` load `volumes.json` via `fetch`, preview locally with any static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
