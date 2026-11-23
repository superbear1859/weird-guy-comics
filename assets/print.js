/* ============================================================================
 * The Weird Guy Comics — Zero-Build Browser Printing Helpers
 * Supports:
 *   1. Saddle-Stitch Fold & Staple Booklet (US Letter Landscape, imposed)
 *   2. Sequential Reading PDF (5.5in x 8.5in Half-Letter for FedEx / Mixam)
 *   3. Physical Thumb-Flipbook (US Letter Portrait, 8-up cards, 32 or 48 cards)
 * ============================================================================ */
(function () {
  'use strict';

  const COMIC_FONT = "'Humor Sans', 'Comic Neue', 'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', cursive, sans-serif";
  const UI_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  let svgUidCounter = 0;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function showcaseTime(scene) {
    if (!scene) return 0;
    return typeof scene.printT === 'number' ? scene.printT : scene.duration * 0.88;
  }

  // Avoid duplicate SVG <defs> IDs when embedding many panels in one print document
  function scopeSvgIds(svgStr) {
    if (!svgStr) return '';
    const suffix = '_p' + (++svgUidCounter);
    const ids = new Set();
    svgStr.replace(/\bid="([^"]+)"/g, (_, id) => {
      ids.add(id);
      return _;
    });
    if (ids.size === 0) return svgStr;
    let out = svgStr;
    ids.forEach((id) => {
      const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out
        .replace(new RegExp(`\\bid="${escapedId}"`, 'g'), `id="${id}${suffix}"`)
        .replace(new RegExp(`url\\(#${escapedId}\\)`, 'g'), `url(#${id}${suffix})`)
        .replace(new RegExp(`(xlink:)?href="#${escapedId}"`, 'g'), `$1href="#${id}${suffix}"`);
    });
    return out;
  }

  function renderPanelSvg(vol, sceneIdx, t) {
    return scopeSvgIds(vol.renderScene(sceneIdx, t));
  }

  function formatVolTitle(vol) {
    const t = String(vol.title || '').trim();
    if (!t || t.toLowerCase() === 'the weird guy') return 'The Weird Guy';
    if (t.toLowerCase().startsWith('the weird guy')) return t;
    return `The Weird Guy: ${t}`;
  }

  // ==========================================================================
  // BOOKLET GENERATOR (Fold & Staple Imposed OR Sequential Reading PDF)
  // ==========================================================================
  function buildBookletDocument(vol, imposed) {
    const isImposed = imposed !== false;
    const scenes = Array.isArray(vol.scenes) ? vol.scenes : [];
    const sceneCount = scenes.length;
    const totalPages = Math.max(4, Math.ceil(Math.max(1, sceneCount) / 4) * 4);
    const extra = totalPages - sceneCount; // 0 for 16-scene comics -> exact 4-sheet booklet!
    const hasInsideCredits = extra >= 2;
    const hasBackCover = extra >= 1;
    const author = vol.author || 'superbear1859';
    const volNum = vol.number != null ? vol.number : Number(vol.id) || 1;
    const volId = pad2(vol.id != null ? vol.id : volNum);
    const edition = vol.edition || 'Comic Edition';
    const displayTitle = formatVolTitle(vol);

    function renderHalfPage(p) {
      const sideClass = p % 2 === 1 ? 'recto' : 'verso';
      let inner = '';

      if (p === 1) {
        inner = sceneCount > 0
          ? `<div class="panel-box">${renderPanelSvg(vol, 0, showcaseTime(scenes[0]))}</div>`
          : '';
      } else if (hasInsideCredits && p === 2) {
        inner = `
          <div class="special-card credits-card">
            <div class="credits-top">
              <span class="edition-pill">#${esc(volNum)} &bull; ${esc(edition)}</span>
            </div>
            <div class="credits-center">
              <h1 class="book-title">${esc(displayTitle)}</h1>
              <div class="blue-bar"></div>
              <p class="credit-author">Written &amp; Illustrated by <strong>${esc(author)}</strong></p>
              <p class="credit-sub">Hand-Drawn Animated Comic Series</p>
            </div>
            <div class="credits-foot">
              <p>Printed from The Weird Guy Comics &bull; Vector Print Edition</p>
              <p>Every panel scales crisply at any size.</p>
            </div>
          </div>
        `;
      } else if (hasBackCover && p === totalPages) {
        inner = `
          <div class="special-card back-cover">
            <div class="back-top">
              <span class="series-pill">THE WEIRD GUY #${esc(volNum)}</span>
              <h2 class="back-title">${esc(displayTitle)}</h2>
            </div>
            <div class="back-blurb">
              <p>Thanks for reading!</p>
              <p class="back-sub">Watch the animated edition with cartoon sound effects anytime online — and collect every volume in the series!</p>
            </div>
            <div class="back-foot">
              <div class="back-foot-row">
                <span>${esc(edition)}</span>
                <span>By ${esc(author)}</span>
              </div>
              <div class="back-foot-row back-foot-meta">
                <span>Price: 1 Giant Cheese</span>
                <span class="sku-badge">WEIRD-GUY-${esc(volId)}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        const sIdx = hasInsideCredits ? p - 2 : p - 1;
        if (sIdx >= 1 && sIdx < sceneCount) {
          inner = `<div class="panel-box">${renderPanelSvg(vol, sIdx, showcaseTime(scenes[sIdx]))}</div>`;
        }
      }

      const folio = (p >= 2 && p <= totalPages - 1 && !(hasInsideCredits && p === 2))
        ? `<div class="folio">${p}</div>`
        : '';

      return `<div class="half-page ${sideClass}" data-page="${p}">${inner}${folio}</div>`;
    }

    let bodyMarkup = '';
    if (isImposed) {
      const sheetPairs = totalPages / 4;
      const sheets = [];
      for (let s = 0; s < sheetPairs; s++) {
        const frontLeft = totalPages - 2 * s;
        const frontRight = 2 * s + 1;
        const backLeft = 2 * s + 2;
        const backRight = totalPages - 2 * s - 1;
        sheets.push([frontLeft, frontRight], [backLeft, backRight]);
      }

      bodyMarkup = sheets.map(([leftP, rightP], idx) => `
        <section class="sheet" data-sheet="${idx + 1}">
          ${renderHalfPage(leftP)}
          ${renderHalfPage(rightP)}
          <div class="fold-tick fold-top" aria-hidden="true"></div>
          <div class="fold-tick fold-bottom" aria-hidden="true"></div>
          <div class="staple-dot staple-top" aria-hidden="true"></div>
          <div class="staple-dot staple-bottom" aria-hidden="true"></div>
        </section>
      `).join('\n');
    } else {
      const pages = [];
      for (let p = 1; p <= totalPages; p++) {
        pages.push(`<section class="seq-page">${renderHalfPage(p)}</section>`);
      }
      bodyMarkup = pages.join('\n');
    }

    const physicalSheets = totalPages / 4;
    const modeTitle = isImposed
      ? `Fold & Staple Booklet (${physicalSheets} ${physicalSheets === 1 ? 'sheet' : 'sheets'} double-sided, no cutting!)`
      : `Reading PDF (${totalPages} Half-Letter pages)`;

    const bannerHint = isImposed
      ? '<strong>No cutting needed!</strong> Print on US Letter &bull; <strong>Landscape</strong> &bull; Scale <strong>100%</strong> &bull; <strong>Double-Sided (Flip on Short Edge)</strong> &bull; Stack, fold in half &amp; staple along center dots.'
      : 'Print Settings: Half-Letter <strong>5.5&quot; &times; 8.5&quot;</strong> sequential PDF &bull; Save as PDF for <strong>FedEx Office</strong> or <strong>Mixam</strong> saddle-stitch printing.';

    const pageRule = isImposed
      ? '@page { size: 11in 8.5in; margin: 0; }'
      : '@page { size: 5.5in 8.5in; margin: 0; }';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(displayTitle)} — ${esc(modeTitle)}</title>
  <style>
    ${pageRule}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #E2DDD2;
      color: #1E1B24;
      font-family: ${UI_FONT};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-banner {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #1E1B24;
      color: #FFFFFF;
      padding: 12px 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.22);
    }
    .print-banner-text {
      font-size: 13px;
      line-height: 1.4;
    }
    .print-banner-title {
      font-weight: 800;
      font-size: 14px;
      color: #FACC15;
      margin-bottom: 2px;
    }
    .print-btn {
      background: #2563EB;
      color: #FFFFFF;
      border: 2px solid #FFFFFF;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
    }
    .print-btn:hover { background: #1D4ED8; }

    .preview-stage {
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }

    .sheet {
      position: relative;
      width: 11in;
      height: 8.5in;
      display: flex;
      flex-direction: row;
      background: #FFFEFA;
      box-shadow: 0 8px 26px rgba(30,27,36,0.18);
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .sheet:last-child { page-break-after: auto; break-after: auto; }

    .seq-page {
      width: 5.5in;
      height: 8.5in;
      background: #FFFEFA;
      box-shadow: 0 8px 26px rgba(30,27,36,0.18);
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .seq-page:last-child { page-break-after: auto; break-after: auto; }

    .half-page {
      position: relative;
      width: 5.5in;
      height: 8.5in;
      background: #FFFEFA;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .half-page.recto { padding: 0.34in 0.30in 0.34in 0.44in; }
    .half-page.verso { padding: 0.34in 0.44in 0.34in 0.30in; }

    .panel-box {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .panel-box svg {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      display: block;
    }

    .special-card {
      width: 100%;
      aspect-ratio: 600 / 840;
      max-height: 100%;
      border: 3px solid #1E1B24;
      border-radius: 6px;
      padding: 0.24in;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Page 2: Inside Front Credits */
    .credits-card { text-align: center; }
    .credits-top { display: flex; justify-content: center; }
    .edition-pill {
      display: inline-block;
      background: #FACC15;
      color: #1E1B24;
      border: 2px solid #1E1B24;
      border-radius: 999px;
      padding: 4px 14px;
      font-size: 10.5pt;
      font-weight: 800;
    }
    .credits-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 0 8px;
    }
    .book-title {
      font-family: ${COMIC_FONT};
      font-size: 22pt;
      line-height: 1.18;
      font-weight: 900;
      color: #1E1B24;
    }
    .blue-bar {
      width: 1.4in;
      height: 5px;
      border-radius: 999px;
      background: #2563EB;
    }
    .credit-author {
      font-size: 12pt;
      color: #1E1B24;
    }
    .credit-sub {
      font-size: 10pt;
      color: #57534E;
    }
    .credits-foot {
      font-size: 8.5pt;
      color: #64748B;
      line-height: 1.45;
      border-top: 1.5px dashed #CBD5E1;
      padding-top: 10px;
    }

    /* Back Cover */
    .back-cover {
      background: #FFFBEB;
      text-align: center;
    }
    .back-top {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding-top: 10px;
    }
    .series-pill {
      display: inline-block;
      background: #1E1B24;
      color: #FACC15;
      border-radius: 999px;
      padding: 4px 14px;
      font-size: 9.5pt;
      font-weight: 800;
      letter-spacing: 0.06em;
    }
    .back-title {
      font-family: ${COMIC_FONT};
      font-size: 18pt;
      line-height: 1.2;
      font-weight: 900;
    }
    .back-blurb {
      font-family: ${COMIC_FONT};
      font-size: 13pt;
      line-height: 1.45;
      color: #1E1B24;
      padding: 0 10px;
    }
    .back-sub {
      font-family: ${UI_FONT};
      font-size: 9.5pt;
      color: #57534E;
      margin-top: 8px;
    }
    .back-foot {
      border-top: 2px solid #1E1B24;
      padding-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 9pt;
      font-weight: 700;
    }
    .back-foot-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .back-foot-meta { color: #57534E; }
    .sku-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 8.5pt;
      background: #FFFFFF;
      color: #1E1B24;
      border: 1.5px solid #1E1B24;
      border-radius: 4px;
      padding: 2px 7px;
    }

    .folio {
      position: absolute;
      bottom: 0.14in;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 9.5pt;
      font-weight: 700;
      color: #64748B;
      font-variant-numeric: tabular-nums;
    }

    /* Fold & Staple Marks (Imposed Sheets Only) */
    .fold-tick {
      position: absolute;
      left: 5.5in;
      width: 0;
      height: 0.16in;
      border-left: 1pt dashed #94A3B8;
      transform: translateX(-0.5pt);
      pointer-events: none;
    }
    .fold-top { top: 0.04in; }
    .fold-bottom { bottom: 0.04in; }

    .staple-dot {
      position: absolute;
      left: 5.5in;
      width: 4pt;
      height: 4pt;
      border-radius: 50%;
      border: 0.9pt solid #94A3B8;
      background: #FFFFFF;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    .staple-top { top: 2.3in; }
    .staple-bottom { bottom: 2.3in; transform: translate(-50%, 50%); }

    @media print {
      html, body { background: #FFFFFF; }
      .print-banner { display: none; }
      .preview-stage { padding: 0; gap: 0; }
      .sheet, .seq-page { box-shadow: none; margin: 0; }
    }
  </style>
</head>
<body>
  <header class="print-banner">
    <div class="print-banner-text">
      <div class="print-banner-title">${esc(displayTitle)} &mdash; ${esc(modeTitle)}</div>
      <div>${bannerHint}</div>
    </div>
    <button class="print-btn" type="button" onclick="window.print()">&#128424; Print / Save PDF</button>
  </header>
  <main class="preview-stage">
    ${bodyMarkup}
  </main>
</body>
</html>`;
  }

  // ==========================================================================
  // PHYSICAL THUMB-FLIPBOOK GENERATOR (US Letter Portrait, 8-up Cards)
  // ==========================================================================
  function buildFlipbookDocument(vol, opts) {
    const options = opts || {};
    const mode = options.mode === 'episode' ? 'episode' : 'scene';
    const scenes = Array.isArray(vol.scenes) ? vol.scenes : [];
    const totalCards = options.frameCount || (mode === 'episode' ? 48 : 32);
    const animFrames = Math.max(1, totalCards - 1);
    const author = vol.author || 'superbear1859';
    const volNum = vol.number != null ? vol.number : Number(vol.id) || 1;
    const displayTitle = formatVolTitle(vol);

    const safeSceneIdx = Math.max(0, Math.min(scenes.length - 1, Number(options.sceneIdx) || 0));
    const targetScene = scenes[safeSceneIdx] || { panelNum: null, title: 'Cover', duration: 3 };

    const flipTitle = mode === 'episode'
      ? displayTitle
      : (targetScene.panelNum === null ? `${displayTitle} — Cover` : `Panel ${targetScene.panelNum}: ${targetScene.title}`);

    // Compute scene timeline starts/ends cleanly in case a caller didn't pre-populate them
    let totalDur = 0;
    const spans = scenes.map((s) => {
      const start = totalDur;
      const dur = Number(s.duration) || 3;
      totalDur += dur;
      return { scene: s, start, end: totalDur, dur };
    });

    function mapGlobalTime(globalT) {
      const clamped = Math.max(0, Math.min(totalDur, globalT));
      for (let i = 0; i < spans.length; i++) {
        if (clamped < spans[i].end || i === spans.length - 1) {
          return { sIdx: i, localT: Math.max(0, clamped - spans[i].start) };
        }
      }
      return { sIdx: 0, localT: 0 };
    }

    const cards = [];

    // Card 00: Cover Card (always first on Sheet 1)
    const coverSceneIdx = mode === 'scene' ? safeSceneIdx : 0;
    const coverScene = scenes[coverSceneIdx] || targetScene;
    const coverSvg = scenes.length > 0 ? renderPanelSvg(vol, coverSceneIdx, showcaseTime(coverScene)) : '';

    cards.push(`
      <article class="flip-card cover-card" data-card="00">
        <div class="bind-zone cover-bind">
          <div class="staple-hole" aria-hidden="true"></div>
          <div class="bind-meta">
            <div class="cover-badge">COVER</div>
            <div class="bind-sub">Top Card</div>
            <div class="bind-tag">Vol. #${esc(volNum)}</div>
          </div>
          <div class="staple-hole" aria-hidden="true"></div>
        </div>
        <div class="art-zone cover-art-zone">
          <div class="cover-info">
            <div class="flip-kicker">THUMB-FLIPBOOK</div>
            <div class="flip-cover-title">${esc(flipTitle)}</div>
            <div class="flip-cover-author">By ${esc(author)}</div>
            <div class="flip-cover-hint">Flip right edge &rarr;</div>
          </div>
          <div class="cover-art-box">${coverSvg}</div>
        </div>
      </article>
    `);

    // Cards 01..animFrames
    for (let i = 0; i < animFrames; i++) {
      const cardNum = i + 1;
      const ratio = animFrames > 1 ? i / (animFrames - 1) : 0.5;
      let sIdx = safeSceneIdx;
      let localT = 0;

      if (mode === 'scene') {
        sIdx = safeSceneIdx;
        localT = (Number(targetScene.duration) || 3) * (0.04 + 0.92 * ratio);
      } else {
        const gT = Math.max(0, (totalDur - 0.05) * ratio);
        const mapped = mapGlobalTime(gT);
        sIdx = mapped.sIdx;
        localT = mapped.localT;
      }

      const sc = scenes[sIdx] || targetScene;
      const tag = sc.panelNum === null ? 'Cover' : `P.${sc.panelNum}`;
      const frameSvg = scenes.length > 0 ? renderPanelSvg(vol, sIdx, localT) : '';

      cards.push(`
        <article class="flip-card" data-card="${pad2(cardNum)}">
          <div class="bind-zone">
            <div class="staple-hole" aria-hidden="true"></div>
            <div class="bind-meta">
              <div class="frame-num">${pad2(cardNum)}</div>
              <div class="bind-sub">of ${animFrames}</div>
              <div class="bind-tag">${esc(tag)}</div>
            </div>
            <div class="staple-hole" aria-hidden="true"></div>
          </div>
          <div class="art-zone">
            <div class="art-box">${frameSvg}</div>
          </div>
        </article>
      `);
    }

    const cardsPerSheet = 8;
    const totalSheets = Math.ceil(cards.length / cardsPerSheet);
    const sheetsHtml = [];
    for (let sh = 0; sh < totalSheets; sh++) {
      const slice = cards.slice(sh * cardsPerSheet, (sh + 1) * cardsPerSheet);
      sheetsHtml.push(`
        <section class="flip-sheet" data-sheet="${sh + 1}">
          <div class="sheet-header">
            <span><strong>${esc(displayTitle)}</strong> &bull; Thumb-Flipbook</span>
            <span>Sheet ${sh + 1} of ${totalSheets} &bull; Cut dotted lines, stack COVER then 01&ndash;${pad2(animFrames)}, clip/staple left edge, flip right edge!</span>
          </div>
          <div class="card-grid">
            ${slice.join('\n')}
          </div>
        </section>
      `);
    }

    const modeLabel = mode === 'episode'
      ? `Full Episode Flipbook (${totalCards} cards / ${totalSheets} sheets)`
      : `Scene Flipbook (${totalCards} cards / ${totalSheets} sheets)`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(flipTitle)} — ${esc(modeLabel)}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #E2DDD2;
      color: #1E1B24;
      font-family: ${UI_FONT};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-banner {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #1E1B24;
      color: #FFFFFF;
      padding: 12px 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.22);
    }
    .print-banner-text {
      font-size: 13px;
      line-height: 1.4;
    }
    .print-banner-title {
      font-weight: 800;
      font-size: 14px;
      color: #FACC15;
      margin-bottom: 2px;
    }
    .print-btn {
      background: #2563EB;
      color: #FFFFFF;
      border: 2px solid #FFFFFF;
      border-radius: 8px;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
    }
    .print-btn:hover { background: #1D4ED8; }

    .preview-stage {
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }

    .flip-sheet {
      width: 8.5in;
      height: 11in;
      padding: 0.30in 0.32in;
      background: #FFFFFF;
      box-shadow: 0 8px 26px rgba(30,27,36,0.18);
      display: flex;
      flex-direction: column;
      gap: 0.10in;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .flip-sheet:last-child { page-break-after: auto; break-after: auto; }

    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 7.5pt;
      color: #64748B;
      padding: 0 0.04in;
      white-space: nowrap;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(2, 3.86in);
      grid-template-rows: repeat(4, 2.46in);
      gap: 0.12in 0.14in;
      justify-content: center;
    }

    .flip-card {
      width: 3.86in;
      height: 2.46in;
      border: 1pt dashed #64748B;
      display: flex;
      flex-direction: row;
      overflow: hidden;
      background: #FFFFFF;
    }

    .bind-zone {
      width: 0.96in;
      flex-shrink: 0;
      background: #F1F5F9;
      border-right: 1pt dotted #94A3B8;
      padding: 0.14in 0.08in;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
    }

    .bind-zone.cover-bind {
      background: #FEF08A;
    }

    .staple-hole {
      width: 0.12in;
      height: 0.12in;
      border-radius: 50%;
      border: 1pt solid #64748B;
      background: #FFFFFF;
    }

    .bind-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .frame-num {
      font-size: 16pt;
      font-weight: 900;
      line-height: 1.05;
      color: #1E1B24;
      font-variant-numeric: tabular-nums;
    }

    .cover-badge {
      font-size: 11pt;
      font-weight: 900;
      letter-spacing: 0.05em;
      color: #1E1B24;
    }

    .bind-sub {
      font-size: 7.5pt;
      font-weight: 700;
      color: #475569;
    }

    .bind-tag {
      margin-top: 3px;
      font-size: 7.5pt;
      font-weight: 800;
      color: #1D4ED8;
      background: #DBEAFE;
      border: 0.75pt solid #93C5FD;
      border-radius: 999px;
      padding: 1px 7px;
    }

    .art-zone {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0.07in 0.12in 0.07in 0.16in;
      background: #FFFFFF;
      min-width: 0;
    }

    .art-box {
      height: 2.30in;
      aspect-ratio: 600 / 840;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .art-box svg,
    .cover-art-box svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* Cover Card Art Side */
    .art-zone.cover-art-zone {
      background: #FFFBEB;
      justify-content: space-between;
      gap: 0.08in;
      padding: 0.10in 0.10in 0.10in 0.12in;
    }

    .cover-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }

    .flip-kicker {
      font-size: 7pt;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #2563EB;
    }

    .flip-cover-title {
      font-family: ${COMIC_FONT};
      font-size: 9.5pt;
      line-height: 1.15;
      font-weight: 900;
      color: #1E1B24;
      overflow-wrap: break-word;
    }

    .flip-cover-author {
      font-size: 7.5pt;
      font-weight: 700;
      color: #57534E;
    }

    .flip-cover-hint {
      margin-top: 4px;
      font-size: 7.5pt;
      font-weight: 800;
      color: #1D4ED8;
    }

    .cover-art-box {
      height: 2.18in;
      aspect-ratio: 600 / 840;
      flex-shrink: 0;
    }

    @media print {
      html, body { background: #FFFFFF; }
      .print-banner { display: none; }
      .preview-stage { padding: 0; gap: 0; }
      .flip-sheet { box-shadow: none; margin: 0; }
    }
  </style>
</head>
<body>
  <header class="print-banner">
    <div class="print-banner-text">
      <div class="print-banner-title">${esc(flipTitle)} &mdash; ${esc(modeLabel)}</div>
      <div>Print Settings: US Letter &bull; <strong>Portrait</strong> &bull; <strong>Single-Sided</strong> &bull; Scale <strong>100%</strong> &bull; Tip: 65&ndash;110 lb cardstock flips best!</div>
    </div>
    <button class="print-btn" type="button" onclick="window.print()">&#128424; Print / Save PDF</button>
  </header>
  <main class="preview-stage">
    ${sheetsHtml.join('\n')}
  </main>
</body>
</html>`;
  }

  // ==========================================================================
  // PRINT WINDOW OPENER & PUBLIC API
  // ==========================================================================
  function openPrintWindow(html) {
    const win = window.open('', '_blank');
    if (!win) {
      window.alert('Pop-ups were blocked. Please allow pop-ups for this site to open the printable comic PDF.');
      return null;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    return win;
  }

  function openBooklet(imposed) {
    const vol = window.WeirdGuyVolume;
    if (!vol) return null;
    return openPrintWindow(buildBookletDocument(vol, imposed));
  }

  function openFlipbook(opts) {
    const vol = window.WeirdGuyVolume;
    if (!vol) return null;
    return openPrintWindow(buildFlipbookDocument(vol, opts));
  }

  // ==========================================================================
  // AUTO-MOUNTED "PRINT IT!" CARD
  // ==========================================================================
  function mountPrintCard() {
    const vol = window.WeirdGuyVolume;
    if (!vol || !Array.isArray(vol.scenes) || vol.scenes.length === 0) return;
    if (document.getElementById('wgPrintCard')) return;

    const card = document.createElement('div');
    card.id = 'wgPrintCard';
    card.className = 'card';

    const optionsHtml = vol.scenes.map((s, idx) => {
      const label = s.panelNum === null ? 'Cover' : `Panel ${s.panelNum}: ${s.title}`;
      return `<option value="${idx}">${esc(label)}</option>`;
    }).join('');

    card.innerHTML = `
      <div class="grid-head">
        <span><strong>Print It!</strong> Fold &amp; Staple Comic (No Cutting!) or Thumb-Flipbook</span>
        <span>Works offline &bull; Vector PDF via browser Print</span>
      </div>
      <div class="btn-bar">
        <div class="btn-group">
          <button id="wgPrintBooklet" type="button" class="btn-primary" title="Double-sided US Letter (4 sheets), fold in half &amp; staple — no cutting required!">&#128424; Fold &amp; Staple Booklet (No Cutting)</button>
          <button id="wgPrintReading" type="button" class="btn-sec" title="Sequential 5.5x8.5 pages for FedEx Office or Mixam">Reading PDF (FedEx/Mixam)</button>
        </div>
        <div class="btn-group">
          <select id="wgFlipScene" aria-label="Select scene for flipbook">${optionsHtml}</select>
          <button id="wgPrintSceneFlip" type="button" class="btn-sec">&#128214; Scene Flipbook (32 cards)</button>
          <button id="wgPrintFullFlip" type="button" class="btn-sec">Full Flipbook (48 cards)</button>
        </div>
      </div>
    `;

    const bottomNav = document.getElementById('bottomVolNav');
    if (bottomNav && bottomNav.parentElement) {
      bottomNav.parentElement.insertBefore(card, bottomNav);
    } else {
      const wrap = document.querySelector('.wrap');
      if (wrap) wrap.appendChild(card);
      else document.body.appendChild(card);
    }

    const btnBooklet = document.getElementById('wgPrintBooklet');
    const btnReading = document.getElementById('wgPrintReading');
    const sceneSelect = document.getElementById('wgFlipScene');
    const btnSceneFlip = document.getElementById('wgPrintSceneFlip');
    const btnFullFlip = document.getElementById('wgPrintFullFlip');

    if (btnBooklet) btnBooklet.addEventListener('click', () => openBooklet(true));
    if (btnReading) btnReading.addEventListener('click', () => openBooklet(false));
    if (btnSceneFlip) {
      btnSceneFlip.addEventListener('click', () => {
        const sceneIdx = Number(sceneSelect ? sceneSelect.value : 0) || 0;
        openFlipbook({ mode: 'scene', sceneIdx, frameCount: 32 });
      });
    }
    if (btnFullFlip) {
      btnFullFlip.addEventListener('click', () => {
        openFlipbook({ mode: 'episode', frameCount: 48 });
      });
    }
  }

  window.WeirdGuyPrint = {
    buildBookletDocument,
    buildFlipbookDocument,
    openBooklet,
    openFlipbook
  };

  if (document.readyState !== 'loading') {
    mountPrintCard();
  } else {
    document.addEventListener('DOMContentLoaded', mountPrintCard);
  }
})();
