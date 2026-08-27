/* =========================================================
   💎 Jewel Blast — a colorful match-3 game
   ========================================================= */

(() => {
  // ---- Config ----
  const SIZE = 8;                 // 8x8 grid
  const GEM_TYPES = 6;            // number of jewel colors
  const START_MOVES = 20;
  const START_TIME = 60;
  const MATCH_BASE = 60;          // points per jewel in a 3-match
  const CHAIN_BONUS = 25;         // per chain level multiplier step

  const CAT_IMAGES = [
    '1_red_cat.png',
    '1_yellow_cat.png',
    '1_green_cat.png',
    '1_blue_cat.png',
    '1_purple_cat.png',
    '1_orange_cat.png'
  ];         // per chain level multiplier step

  // ---- DOM ----
  const boardEl = document.getElementById('board');
  const scoreEl = document.getElementById('score');
  const movesEl = document.getElementById('moves');
  const timerEl = document.getElementById('timer');
  const overlay = document.getElementById('overlay');
  const ovTitle = document.getElementById('ov-title');
  const ovText = document.getElementById('ov-text');
  const ovFinal = document.getElementById('final-score');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  // ---- State ----
  let grid = [];                 // grid[row][col] = gem object | null
  let selected = null;           // {r, c} of selected gem
  let busy = false;              // true while animating / resolving
  let score = 0;
  let moves = 0;
  let timeLeft = 0;
  let timerId = null;
  let playing = false;

  // A gem: { type: 0..GEM_TYPES-1, special: null | 'line' | 'bomb', id }
  let gemSeq = 0;

  // ---- Helpers ----
  const key = (r, c) => `${r}-${c}`;

  function makeGem(type, special = null) {
    return { type, special, id: gemSeq++ };
  }

  function randomGem() {
    return makeGem(Math.floor(Math.random() * GEM_TYPES));
  }

  // Build a board with no initial matches
  function buildBoard() {
    grid = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      grid.push(row); // push first so createsMatchAt can read this row while filling it
      for (let c = 0; c < SIZE; c++) {
        let type, guard = 0;
        do {
          type = Math.floor(Math.random() * GEM_TYPES);
          guard++;
        } while (guard < 20 && createsMatchAt(r, c, type));
        row.push(makeGem(type));
      }
      // grid.push(row) moved above the inner loop
    }
    // Guarantee the starting board has at least one legal move; retry a few times
    // then fall back to a fresh random board so we can never recurse forever.
    for (let attempt = 0; attempt < 30 && !hasPossibleMove(); attempt++) {
      buildBoardFresh();
    }
    renderBoard();
  }

  function buildBoardFresh() {
    grid = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      grid.push(row); // push first so createsMatchAt can read this row while filling it
      for (let c = 0; c < SIZE; c++) {
        let type, guard = 0;
        do {
          type = Math.floor(Math.random() * GEM_TYPES);
          guard++;
        } while (guard < 20 && createsMatchAt(r, c, type));
        row.push(makeGem(type));
      }
      // grid.push(row) moved above the inner loop
    }
  }

  function createsMatchAt(r, c, type) {
    // check left two
    if (c >= 2 && grid[r][c - 1]?.type === type && grid[r][c - 2]?.type === type) return true;
    if (r >= 2 && grid[r - 1]?.[c]?.type === type && grid[r - 2]?.[c]?.type === type) return true;
    return false;
  }

  // ---- Rendering ----
  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${SIZE}, var(--cell))`;
    boardEl.style.gridTemplateRows = `repeat(${SIZE}, var(--cell))`;

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const gem = grid[r][c];
        if (gem) cell.appendChild(renderGem(gem, r, c));
        boardEl.appendChild(cell);
      }
    }
  }

  function renderGem(gem, r, c, animate) {
    const el = document.createElement('div');
    el.className = `gem g${gem.type}` + (gem.special ? ' special' : '') + (animate ? ' fall' : '');

    const img = document.createElement('img');
    img.src = `cats/62px/${CAT_IMAGES[gem.type]}`;
    img.alt = `Cat type ${gem.type}`;
    el.appendChild(img);

    el.dataset.id = gem.id;
    return el;
  }

  function cellAt(r, c) {
    return boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  }

  function refreshGem(r, c, animate) {
    const cell = cellAt(r, c);
    cell.innerHTML = '';
    if (grid[r][c]) cell.appendChild(renderGem(grid[r][c], r, c, animate));
  }

  // ---- Game flow ----
  function startGame() {
    score = 0;
    moves = START_MOVES;
    timeLeft = START_TIME;
    selected = null;
    busy = false;
    playing = true;
    gemSeq = 0;
    buildBoard();
    renderBoard();
    updateHud();
    overlay.classList.add('hidden');
    startTimer();
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      if (!playing) return;
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) endGame('⌛ Time\'s up!');
    }, 1000);
  }

  function updateHud() {
    scoreEl.textContent = score;
    movesEl.textContent = moves;
    timerEl.textContent = timeLeft;
  }

  function endGame(title) {
    playing = false;
    busy = true;
    clearInterval(timerId);
    ovTitle.textContent = title;
    ovText.textContent = 'Great game! Ready for another round? 🐾';
    ovFinal.textContent = score;
    ovFinal.classList.remove('hidden');
    startBtn.textContent = '↻ Play Again 🐾';
    overlay.classList.remove('hidden');
  }

  // ---- Input ----
  boardEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell || busy || !playing) return;
    const r = +cell.dataset.r;
    const c = +cell.dataset.c;
    onCellTap(r, c);
  });

  // Swipe / drag support
  let dragStart = null;
  boardEl.addEventListener('pointerdown', (e) => {
    if (busy || !playing) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    dragStart = { r: +cell.dataset.r, c: +cell.dataset.c, x: e.clientX, y: e.clientY };
  });
  boardEl.addEventListener('pointerup', (e) => {
    if (!dragStart || busy || !playing) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) { dragStart = null; return; } // treat as tap
    let dr = 0, dc = 0;
    if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
    else dr = dy > 0 ? 1 : -1;
    const sr = dragStart.r, sc = dragStart.c;
    dragStart = null;
    const nr = sr + dr;
    const nc = sc + dc;
    if (inBounds(nr, nc)) attemptSwap(sr, sc, nr, nc);
  });

  function onCellTap(r, c) {
    if (!selected) {
      select(r, c);
      return;
    }
    if (selected.r === r && selected.c === c) {
      deselect();
      return;
    }
    if (isAdjacent(selected.r, selected.c, r, c)) {
      attemptSwap(selected.r, selected.c, r, c);
    } else {
      deselect();
      select(r, c);
    }
  }

  function select(r, c) {
    selected = { r, c };
    const cell = cellAt(r, c);
    const gem = cell.firstChild;
    if (gem) gem.classList.add('selected');
  }

  function deselect() {
    if (!selected) return;
    const cell = cellAt(selected.r, selected.c);
    const gem = cell?.firstChild;
    if (gem) gem.classList.remove('selected');
    selected = null;
  }

  // ---- Swap & resolve ----
  function attemptSwap(r1, c1, r2, c2) {
    deselect();
    busy = true;

    swap(r1, c1, r2, c2);
    refreshGem(r1, c1);
    refreshGem(r2, c2);

    const matches = findMatches();
    if (matches.matched.size === 0) {
      // Invalid move: swap back and don't spend a turn.
      setTimeout(() => {
        swap(r1, c1, r2, c2);
        refreshGem(r1, c1);
        refreshGem(r2, c2);
        busy = false;
      }, 180);
      return;
    }

    // valid move — consume a move
    moves--;
    updateHud();
    resolveBoard(0);
  }

  function swap(r1, c1, r2, c2) {
    const tmp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = tmp;
  }

  // ---- Match detection ----
  // Returns a Set of "r-c" keys that are part of a match, plus metadata for specials.
  function findMatches() {
    const matched = new Set();
    const specials = []; // {r, c, type, special}

    // horizontal
    for (let r = 0; r < SIZE; r++) {
      let runStart = 0;
      for (let c = 1; c <= SIZE; c++) {
        const same = c < SIZE && grid[r][c] && grid[r][c - 1] && grid[r][c].type === grid[r][c - 1].type;
        if (!same) {
          const len = c - runStart;
          if (len >= 3 && grid[r][runStart]) {
            addRun(matched, r, r, runStart, c - 1);
            // special detection
            const sr = r, sc = runStart + Math.floor(len / 2);
            specials.push({ r: sr, c: sc, type: grid[r][sc]?.type, len, dir: 'h' });
          }
          runStart = c;
        }
      }
    }

    // vertical
    for (let c = 0; c < SIZE; c++) {
      let runStart = 0;
      for (let r = 1; r <= SIZE; r++) {
        const same = r < SIZE && grid[r][c] && grid[r - 1][c] && grid[r][c].type === grid[r - 1][c].type;
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

  // ---- Resolve cascades ----
  function resolveBoard(chain) {
    const { matched, specials } = findMatches();
    if (matched.size === 0) {
      // no more matches
      busy = false;
      if (moves <= 0) {
        setTimeout(() => endGame('🚫 Out of moves!'), 300);
      } else if (!hasPossibleMove()) {
        setTimeout(() => {
          shuffleBoard();
        }, 300);
      }
      return;
    }

    // Score: base * count, scaled by the chain multiplier so CHAIN_BONUS is live.
    const chainMult = 1 + chain * CHAIN_BONUS / 100;
    const gained = Math.round(matched.size * MATCH_BASE * chainMult);
    score += gained;
    updateHud();

    // Place specials before clearing
    for (const sp of specials) {
      if (sp.len >= 5) {
        grid[sp.r][sp.c] = { ...grid[sp.r][sp.c], special: 'bomb' };
      } else if (sp.len === 4) {
        grid[sp.r][sp.c] = { ...grid[sp.r][sp.c], special: 'line' };
      }
    }

    // Show floating score
    showPopup(`+${gained}${chain > 0 ? `  x${chain + 1}` : ''}`);

    // Trigger specials' area effects (collect extra cells to clear)
    const extraClear = collectSpecialClears(specials, matched);

    // Build the full set of cells to clear, but keep every newly-created
    // special's birth cell alive so it survives its own match.
    const keep = new Set(specials.map((sp) => key(sp.r, sp.c)));
    const clearAll = new Set([...matched, ...extraClear]);
    for (const k of keep) clearAll.delete(k);

    // Animate pop on the cells that will actually be cleared.
    clearAll.forEach((k) => {
      const [r, c] = k.split('-').map(Number);
      const cell = cellAt(r, c);
      const gem = cell?.firstChild;
      if (gem) { gem.classList.add('pop'); }
    });

    setTimeout(() => {
      // remove gems (newly-created specials are kept alive by `keep`)
      for (const k of clearAll) {
        const [r, c] = k.split('-').map(Number);
        grid[r][c] = null;
        refreshGem(r, c, false);
      }

      // gravity + refill (renderBoard re-renders surviving specials too)
      applyGravity();

      // resolve next cascade
      setTimeout(() => resolveBoard(chain + 1), 300);
    }, 240);
  }

  function collectSpecialClears(specials, matched) {
    const extra = new Set();
    for (const sp of specials) {
      const [r, c] = [sp.r, sp.c];
      const gem = grid[r][c];
      if (gem?.special === 'line') {
        if (sp.dir === 'h') {
          for (let c2 = 0; c2 < SIZE; c2++) extra.add(key(r, c2));
        } else {
          for (let r2 = 0; r2 < SIZE; r2++) extra.add(key(r2, c));
        }
      } else if (gem?.special === 'bomb') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc)) extra.add(key(nr, nc));
          }
        }
      }
    }
    return extra;
  }

  // ---- Gravity ----
  function applyGravity() {
    for (let c = 0; c < SIZE; c++) {
      // compact downward
      let writeRow = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        if (grid[r][c]) {
          if (writeRow !== r) {
            grid[writeRow][c] = grid[r][c];
            grid[r][c] = null;
          }
          writeRow--;
        }
      }
      // fill top with new gems
      for (let r = writeRow; r >= 0; r--) {
        grid[r][c] = randomGem();
      }
    }
    // Re-render whole board with fall animation on new gems
    renderBoard();
  }

  // ---- Possible move detection ----
  function hasPossibleMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        // try swap right
        if (c + 1 < SIZE) {
          swap(r, c, r, c + 1);
          const ok = findMatches().matched.size > 0;
          swap(r, c, r, c + 1);
          if (ok) return true;
        }
        // try swap down
        if (r + 1 < SIZE) {
          swap(r, c, r + 1, c);
          const ok = findMatches().matched.size > 0;
          swap(r, c, r + 1, c);
          if (ok) return true;
        }
      }
    }
    return false;
  }

  function shuffleBoard() {
    // Collect the current gem types, then reshuffle them into new positions.
    const types = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c]) types.push(grid[r][c].type);
      }
    }

    // Try a few times to land on a board with no immediate match and at least one
    // legal move. Cap the attempts so we can never infinite-loop / stack-overflow.
    const MAX_ATTEMPTS = 30;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // Fisher–Yates shuffle of a copy, then lay it back onto the grid.
      const pool = types.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      let idx = 0;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) grid[r][c] = makeGem(pool[idx++]);
      }
      if (findMatches().matched.size === 0 && hasPossibleMove()) break;
    }

    // If we couldn't find a clean shuffle, fall back to a guaranteed-fresh board.
    if (findMatches().matched.size > 0 || !hasPossibleMove()) buildBoard();

    renderBoard();
    showPopup('✨ Shuffled!');
    busy = false;
  }

  // ---- UI effects ----
  function showPopup(text) {
    const p = document.createElement('div');
    p.className = 'popup';
    p.textContent = text;
    p.style.left = `${10 + Math.random() * 60}%`;
    p.style.top = `${30 + Math.random() * 40}%`;
    boardEl.parentElement.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }
  function isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  // ---- Wiring ----
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', () => {
    if (playing) {
      clearInterval(timerId);
      overlay.classList.remove('hidden');
      ovTitle.textContent = 'Paused ⏸';
      ovText.textContent = 'Take a break — your progress is safe. 🐾';
      ovFinal.classList.add('hidden');
      startBtn.textContent = '▶ Resume 🐾 🐾';
      playing = false;
    }
  });

  // Initial board preview behind the start overlay
  gemSeq = 0;
  buildBoard();
  renderBoard();
  updateHud();
  moves = START_MOVES;
  timeLeft = START_TIME;
  updateHud();
})();
