/* ============================================================================
 * The Weird Guy Comics — Shared Series Navigation & Reading Progress
 * ============================================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'weird-guy-comics:progress:v1';

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { lastVolumeId: null, volumes: {} };
      const parsed = JSON.parse(raw);
      return {
        lastVolumeId: parsed.lastVolumeId || null,
        volumes: parsed.volumes && typeof parsed.volumes === 'object' ? parsed.volumes : {}
      };
    } catch (_) {
      return { lastVolumeId: null, volumes: {} };
    }
  }

  function saveProgress(volumeId, sceneIdx, totalScenes, completed) {
    if (!volumeId) return;
    try {
      const data = loadProgress();
      const prev = data.volumes[volumeId] || {};
      const maxSceneIdx = Math.max(prev.maxSceneIdx || 0, sceneIdx);
      const isDone = Boolean(prev.completed || completed || (totalScenes > 0 && sceneIdx >= totalScenes - 1));
      data.lastVolumeId = volumeId;
      data.volumes[volumeId] = {
        sceneIdx: sceneIdx,
        maxSceneIdx: maxSceneIdx,
        totalScenes: totalScenes,
        completed: isDone,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {
      // Ignore storage quota / privacy mode errors
    }
  }

  function getInitialSceneFromHash(totalScenes) {
    const m = String(window.location.hash || '').match(/scene=(\d+)/);
    if (!m) return null;
    const idx = parseInt(m[1], 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= totalScenes) return null;
    return idx;
  }

  window.WeirdGuyProgress = {
    load: loadProgress,
    save: saveProgress,
    getInitialSceneFromHash: getInitialSceneFromHash
  };

  // Render shared series nav bar if this is a volume page
  const scriptEl = document.currentScript;
  const currentVolId = scriptEl ? scriptEl.getAttribute('data-volume-id') : null;
  if (!currentVolId) return;

  function renderNav(volumes) {
    const topNav = document.getElementById('seriesNav');
    const bottomNav = document.getElementById('bottomVolNav');
    const idx = volumes.findIndex(v => v.id === currentVolId);
    const prevVol = idx > 0 ? volumes[idx - 1] : null;
    const nextVol = idx >= 0 && idx < volumes.length - 1 ? volumes[idx + 1] : null;

    if (topNav) {
      const optionsHtml = volumes.map(v => {
        const selected = v.id === currentVolId ? ' selected' : '';
        return `<option value="${v.id}"${selected}>#${v.number} — ${v.title}</option>`;
      }).join('');

      topNav.innerHTML = `
        <div class="series-nav-left">
          <a class="nav-btn" href="../../">&larr; All Volumes</a>
          ${volumes.length > 0 ? `<select id="volSwitcher" class="nav-select" aria-label="Switch volume">${optionsHtml}</select>` : ''}
        </div>
        <div class="series-nav-right">
          <a class="nav-btn${prevVol ? '' : ' disabled'}" href="${prevVol ? `../${prevVol.id}/` : '#'}">&lsaquo; Prev Vol</a>
          <a class="nav-btn${nextVol ? '' : ' disabled'}" href="${nextVol ? `../${nextVol.id}/` : '#'}">Next Vol &rsaquo;</a>
        </div>
      `;

      const switcher = document.getElementById('volSwitcher');
      if (switcher) {
        switcher.addEventListener('change', () => {
          window.location.href = `../${switcher.value}/`;
        });
      }
    }

    if (bottomNav && (prevVol || nextVol)) {
      bottomNav.innerHTML = `
        ${prevVol
          ? `<a class="nav-btn" href="../${prevVol.id}/">&larr; Vol. #${prevVol.number}: ${prevVol.title}</a>`
          : `<a class="nav-btn" href="../../">&larr; Back to All Volumes</a>`}
        ${nextVol
          ? `<a class="btn-primary" href="../${nextVol.id}/">Next: Vol. #${nextVol.number} — ${nextVol.title} &rarr;</a>`
          : `<a class="nav-btn" href="../../">All Volumes &rarr;</a>`}
      `;
    }
  }

  // Fallback immediately so link works even before fetch completes (or on file://)
  renderNav([]);

  fetch('../../volumes.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (data && Array.isArray(data.volumes)) {
        renderNav(data.volumes);
      }
    })
    .catch(() => {
      // Keep fallback nav when opened via file:// without a local server
    });

  // ---- Fullscreen Button (auto-injected into every volume's control bar) ----
  const stageCard = document.querySelector('.stage-wrap');
  const btnMute = document.getElementById('btnMute');
  if (stageCard && btnMute && btnMute.parentElement) {
    const btnFs = document.createElement('button');
    btnFs.id = 'btnFullscreen';
    btnFs.type = 'button';
    btnFs.className = 'btn-sec';
    btnFs.title = 'Toggle Fullscreen (F)';
    btnFs.innerHTML = '&#x26F6; Fullscreen';
    btnMute.parentElement.appendChild(btnFs);

    let pseudoFs = false;
    let wakeLock = null;
    let wakeLockPending = false;
    const playLabelEl = document.getElementById('playLabel');

    function getNativeFsEl() {
      return document.fullscreenElement || document.webkitFullscreenElement || null;
    }

    function isFullscreen() {
      return Boolean(getNativeFsEl() === stageCard || pseudoFs);
    }

    function isComicPlaying() {
      return Boolean(playLabelEl && playLabelEl.textContent.trim().toLowerCase() === 'pause');
    }

    function shouldKeepAwake() {
      return isFullscreen() || isComicPlaying();
    }

    function requestWakeLock() {
      if (!('wakeLock' in navigator) || !navigator.wakeLock || wakeLock || wakeLockPending) return;
      if (document.visibilityState !== 'visible') return;
      wakeLockPending = true;
      navigator.wakeLock.request('screen')
        .then((sentinel) => {
          wakeLockPending = false;
          if (!shouldKeepAwake()) {
            sentinel.release().catch(() => {});
            return;
          }
          wakeLock = sentinel;
          sentinel.addEventListener('release', () => {
            if (wakeLock === sentinel) wakeLock = null;
          });
        })
        .catch(() => {
          wakeLockPending = false;
        });
    }

    function releaseWakeLock() {
      if (!wakeLock) return;
      const s = wakeLock;
      wakeLock = null;
      s.release().catch(() => {});
    }

    function syncWakeLock() {
      if (shouldKeepAwake()) requestWakeLock();
      else releaseWakeLock();
    }

    function syncFsButton() {
      const active = isFullscreen();
      btnFs.innerHTML = active ? '&#x2715; Exit Fullscreen' : '&#x26F6; Fullscreen';
      btnFs.setAttribute('aria-pressed', active ? 'true' : 'false');
      syncWakeLock();
    }

    function setPseudoFs(on) {
      pseudoFs = on;
      stageCard.classList.toggle('is-fullscreen', on);
      document.body.classList.toggle('fullscreen-lock', on);
      syncFsButton();
    }

    function toggleFullscreen() {
      if (isFullscreen()) {
        if (getNativeFsEl()) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) exit.call(document);
        }
        if (pseudoFs) setPseudoFs(false);
        return;
      }

      const req = stageCard.requestFullscreen || stageCard.webkitRequestFullscreen;
      if (req) {
        try {
          const res = req.call(stageCard);
          if (res && typeof res.catch === 'function') {
            res.catch(() => setPseudoFs(true));
          }
        } catch (_) {
          setPseudoFs(true);
        }
      } else {
        // Fallback for iOS Safari / browsers without Fullscreen API on divs
        setPseudoFs(true);
      }
    }

    btnFs.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', syncFsButton);
    document.addEventListener('webkitfullscreenchange', syncFsButton);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncWakeLock();
      else releaseWakeLock();
    });
    window.addEventListener('pagehide', releaseWakeLock);

    if (playLabelEl && typeof MutationObserver !== 'undefined') {
      new MutationObserver(syncWakeLock).observe(playLabelEl, { childList: true, characterData: true, subtree: true });
    }

    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && pseudoFs) {
        setPseudoFs(false);
      }
    });
  }
})();
