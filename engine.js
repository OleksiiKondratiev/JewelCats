/* =========================================================
   Jewel Blast — pure game engine (DOM-free, testable)
   All logic here operates on a plain 2D array `grid` of gem
   objects { type, special } and is independent of the browser.
   Loaded in the browser via <script src="engine.js"> which
   attaches to window.JewelEngine; also usable from Node tests.
   ========================================================= */

(function (root) {
  'use strict';

  const key = (r, c) => `${r}-${c}`;

  // ---- Match detection ----
  // Returns { matched: Set of "r-c" keys, specials: [{r,c,type,len,dir}] }
  function findMatches(grid, size) {
    const matched = new Set();
    const specials = [];

    // horizontal
    for (let r = 0; r < size; r++) {
      let runStart = 0;
      for (let c = 1; c <= size; c++) {
        const same = c < size && grid[r][c] && grid[r][c - 1] && grid[r][c].type === grid[r][c - 1].type;
        if (!same) {
          const len = c - runStart;
          if (len >= 3 && grid[r][runStart]) {
            addRun(matched, r, r, runStart, c - 1);
            const sr = r, sc = runStart + Math.floor(len / 2);
            specials.push({ r: sr, c: sc, type: grid[r][sc]?.type, len, dir: 'h' });
          }
          runStart = c;
        }
      }
    }

    // vertical
    for (let c = 0; c < size; c++) {
      let runStart = 0;
      for (let r = 1; r <= size; r++) {
        const same = r < size && grid[r][c] && grid[r - 1][c] && grid[r][c].type === grid[r - 1][c].type;
        if (!same) {
          const len = r - runStart;
          if (len >= 3 && grid[runStart][c]) {
            addRun(matched, runStart, r - 1, c, c);
            const sr = runStart + Math.floor(len / 2), sc = c;
            specials.push({ r: sr, c: sc, type: grid[sr][sc]?.type, len, dir: 'v' });
          }
          runStart = r;
        }
      }
    }

    return { matched, specials };
  }

  // Add every cell in the rectangle [rStart..rEnd] x [cStart..cEnd].
  function addRun(set, rStart, rEnd, cStart, cEnd) {
    for (let r = rStart; r <= rEnd; r++) {
      for (let c = cStart; c <= cEnd; c++) set.add(key(r, c));
    }
  }

  // ---- Board building helpers ----
  function createsMatchAt(grid, r, c, type) {
    if (c >= 2 && grid[r][c - 1]?.type === type && grid[r][c - 2]?.type === type) return true;
    if (r >= 2 && grid[r - 1]?.[c]?.type === type && grid[r - 2]?.[c]?.type === type) return true;
    return false;
  }

  function inBounds(r, c, size) {
    return r >= 0 && r < size && c >= 0 && c < size;
  }

  // ---- Swap ----
  function swap(grid, r1, c1, r2, c2) {
    const tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
  }

  // ---- Gravity + refill ----
  function applyGravity(grid, size, makeGem) {
    for (let c = 0; c < size; c++) {
      let writeRow = size - 1;
      for (let r = size - 1; r >= 0; r--) {
        if (grid[r][c]) {
          if (writeRow !== r) {
            grid[writeRow][c] = grid[r][c];
            grid[r][c] = null;
          }
          writeRow--;
        }
      }
      for (let r = writeRow; r >= 0; r--) {
        grid[r][c] = makeGem();
      }
    }
  }

  // ---- Possible move detection ----
  function hasPossibleMove(grid, size) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (c + 1 < size) {
          swap(grid, r, c, r, c + 1);
          const ok = findMatches(grid, size).matched.size > 0;
          swap(grid, r, c, r, c + 1);
          if (ok) return true;
        }
        if (r + 1 < size) {
          swap(grid, r, c, r + 1, c);
          const ok = findMatches(grid, size).matched.size > 0;
          swap(grid, r, c, r + 1, c);
          if (ok) return true;
        }
      }
    }
    return false;
  }

  // ---- Special gem area clears ----
  function collectSpecialClears(specials, matched, grid, size) {
    const extra = new Set();
    for (const sp of specials) {
      const r = sp.r, c = sp.c;
      const gem = grid[r][c];
      if (gem?.special === 'line') {
        if (sp.dir === 'h') {
          for (let c2 = 0; c2 < size; c2++) extra.add(key(r, c2));
        } else {
          for (let r2 = 0; r2 < size; r2++) extra.add(key(r2, c));
        }
      } else if (gem?.special === 'bomb') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc, size)) extra.add(key(nr, nc));
          }
        }
      }
    }
    return extra;
  }
  // ---- Clear-set builder ----
  // Returns the set of cells to actually clear: every matched cell EXCEPT
  // the birth cell of each newly-created special. This keeps a just-made
  // special gem on the board instead of popping it in the same cascade.
  function popSet(matched, specials) {
    const keep = new Set();
    for (const sp of specials || []) keep.add(key(sp.r, sp.c));
    const out = new Set();
    for (const k of matched) if (!keep.has(k)) out.add(k);
    return out;
  }
  // ---- Test helpers ----
  function makeGrid(size, fill) {
    const g = [];
    for (let r = 0; r < size; r++) {
      g[r] = [];
      for (let c = 0; c < size; c++) {
        g[r][c] = typeof fill === 'function' ? fill(r, c) : fill;
      }
    }
    return g;
  }

  function gem(type, special = null) {
    return { type, special };
  }

  const api = {
    key, findMatches, addRun, popSet, createsMatchAt, inBounds, swap, applyGravity, hasPossibleMove, collectSpecialClears, makeGrid, gem,
  };

  root.JewelEngine = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(this);
