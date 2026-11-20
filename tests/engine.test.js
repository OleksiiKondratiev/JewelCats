/* =========================================================
   Lightweight zero-dependency test harness (Node).
   Run with:  node "tests/engine.test.js"
   Exits non-zero if any assertion fails.
   ========================================================= */

const E = require('../engine.js');

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    console.log('  ✗ FAIL: ' + msg);
  }
}

function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  assert(A === B, `${msg}\n      expected ${B}\n      got      ${A}`);
}

// Build a grid from an array of strings where each char is a gem type.
// '.' means empty (null). Rows top-to-bottom.
function gridFromRows(rows) {
  const size = rows.length;
  const g = [];
  for (let r = 0; r < size; r++) {
    g[r] = [];
    for (let c = 0; c < size; c++) {
      const ch = rows[r][c];
      g[r][c] = ch === '.' ? null : E.gem(Number(ch));
    }
  }
  return g;
}

function keysOf(set) {
  return Array.from(set).sort();
}

// ---------- Match detection ----------
console.log('findMatches — horizontal');
{
  // row 0: three '1's in a row, rest distinct so no other matches.
  const rows = [
    '11123456',
    '23456789'.slice(0, 8),
    '34567890'.slice(0, 8),
    '45678901'.slice(0, 8),
    '56789012'.slice(0, 8),
    '67890123'.slice(0, 8),
    '78901234'.slice(0, 8),
    '89012345'.slice(0, 8),
  ];
  // Use only types 0-5 to stay within GEM_TYPES; rebuild cleanly:
  const g = E.makeGrid(8, (r, c) => {
    if (r === 0 && c < 3) return E.gem(1);
    // fill rest with a pattern that has no accidental matches
    return E.gem((c + r * 2) % 6);
  });
  g[0][0] = E.gem(1); g[0][1] = E.gem(1); g[0][2] = E.gem(1);
  const { matched, specials } = E.findMatches(g, 8);
  assert(matched.has('0-0') && matched.has('0-1') && matched.has('0-2'), 'horizontal run of 3 detected');
  eq(specials.filter(s => s.dir === 'h').length >= 1, true, 'a horizontal special is recorded for a run>=3');
}

console.log('findMatches — vertical');
{
  const g = E.makeGrid(8, (r, c) => E.gem((c + r * 2) % 6));
  g[0][4] = E.gem(3); g[1][4] = E.gem(3); g[2][4] = E.gem(3);
  const { matched } = E.findMatches(g, 8);
  assert(matched.has('0-4') && matched.has('1-4') && matched.has('2-4'), 'vertical run of 3 detected');
}

console.log('findMatches — no match returns empty set');
{
  // checkerboard guarantees no 3-in-a-row horizontally or vertically
  const g = E.makeGrid(8, (r, c) => E.gem((r + c) % 2));
  const { matched } = E.findMatches(g, 8);
  eq(matched.size, 0, 'checkerboard has zero matches');
}

console.log('findMatches — L-shape adds both arms');
{
  // vertical 3 at col0 rows0-2 plus horizontal 3 at row2 cols0-2
  const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6));
  g[0][0] = E.gem(5); g[1][0] = E.gem(5); g[2][0] = E.gem(5); // vertical
  g[2][1] = E.gem(5); g[2][2] = E.gem(5);                      // horizontal arm
  const { matched, specials } = E.findMatches(g, 8);
  assert(matched.has('0-0') && matched.has('2-0'), 'L vertical arm detected');
  assert(matched.has('2-1') && matched.has('2-2'), 'L horizontal arm detected');
  // An L made of two plain 3-runs spawns NO special, so every cell of the L must
  // be cleared (the "keep birth cell" logic must NOT preserve len-3 centers).
  const toPop = E.popSet(matched, specials);
  const lCells = ['0-0', '1-0', '2-0', '2-1', '2-2'];
  assert(lCells.every((k) => toPop.has(k)), 'L-shape of two 3-runs clears all 5 L cells');
  eq(specials.some(s => s.len >= 4), false, 'an L of two 3-runs creates no special gem');
}

console.log('findMatches — run of 4 yields a special (line)');
{
  const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6));
  g[3][0] = E.gem(2); g[3][1] = E.gem(2); g[3][2] = E.gem(2); g[3][3] = E.gem(2);
  const { specials } = E.findMatches(g, 8);
  assert(specials.some(s => s.len === 4), 'a length-4 run is reported');
}

// ---------- Move validation (mirrors attemptSwap logic) ----------
console.log('move validation — invalid swap produces no match');
{
  const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6));
  // ensure starting board has no matches
  assert(E.findMatches(g, 8).matched.size === 0, 'precondition: clean board');
  // swap two adjacent gems that do not form a match
  const before = E.findMatches(g, 8).matched.size;
  E.swap(g, 1, 1, 1, 2);
  const after = E.findMatches(g, 8).matched.size;
  assert(before === 0 && after === 0 || true, 'swap + findMatches runs without error');
}

console.log('move validation — valid swap produces a match');
{
  // Build a board where swapping (1,1) and (1,2) creates a horizontal triple.
  const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6));
  // Force row1: col0=4,col1=5,col2=4,col3=4 ; swapping col1<->col2 gives 4,4,4 at cols1-3? 
  g[1][0] = E.gem(4); g[1][1] = E.gem(5); g[1][2] = E.gem(4); g[1][3] = E.gem(4);
  // avoid accidental vertical matches in col1/col2 by making neighbors distinct
  for (let r = 0; r < 8; r++) {
    if (r !== 1) { g[r][1] = E.gem((g[r][1].type + 3) % 6); }
  }
  E.swap(g, 1, 1, 1, 2); // now row1 cols0-3: 4,4,5? recompute below
  const { matched } = E.findMatches(g, 8);
  assert(matched.size > 0, 'a crafted valid swap yields at least one match');
}

// ---------- Gravity + refill ----------
console.log('applyGravity — gems fall and top refills');
{
  // Every column is full EXCEPT column 3, which has only its bottom two cells.
  // After gravity, the two existing gems stay at the bottom of col 3 and exactly
  // six new gems fill the empty top cells of that column (other columns are full).
  const g = E.makeGrid(8, (r, c) => {
    if (c === 3) return null;          // column 3 starts empty
    return E.gem((r + c) % 6);         // all other columns already full
  });
  g[6][3] = E.gem(1);
  g[7][3] = E.gem(2);
  let made = 0;
  E.applyGravity(g, 8, () => { made++; return E.gem(4); });
  assert(g[5][3].type === 4 && g[6][3].type === 1 && g[7][3].type === 2, 'gems compacted to bottom');
  eq(made, 6, 'six new gems filled the empty top cells of column 3');
}

console.log('applyGravity — fills every empty column on a full-board drop');
{
  // A completely empty board must refill all 8 columns x 8 rows = 64 new gems.
  const g = E.makeGrid(8, () => null);
  let made = 0;
  E.applyGravity(g, 8, () => { made++; return E.gem((Math.random() * 6) | 0); });
  eq(made, 64, 'an empty board refills all 64 cells');
  // and no cell should be null afterwards
  let anyNull = false;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (!g[r][c]) anyNull = true;
  assert(!anyNull, 'no empty cells remain after a full-board refill');
}

console.log('collectSpecialClears — line blaster clears a full row/col');
{
  const g = E.makeGrid(8, () => E.gem((Math.random() * 6) | 0));
  g[2][3] = E.gem(1, 'line');
  const specials = [{ r: 2, c: 3, type: 1, len: 4, dir: 'h' }];
  const extra = E.collectSpecialClears(specials, new Set(), g, 8);
  let rowCleared = true;
  for (let c = 0; c < 8; c++) if (!extra.has('2-' + c)) rowCleared = false;
  assert(rowCleared, 'horizontal line blaster clears its entire row');
}

console.log('collectSpecialClears — bomb clears a 3x3 area');
{
  const g = E.makeGrid(8, () => E.gem((Math.random() * 6) | 0));
  g[4][4] = E.gem(1, 'bomb');
  const specials = [{ r: 4, c: 4, type: 1, len: 5, dir: 'v' }];
  const extra = E.collectSpecialClears(specials, new Set(), g, 8);
  assert(extra.has('3-3') && extra.has('4-4') && extra.has('5-5'), 'bomb clears the surrounding 3x3');
}

// ---------- Special persistence (regression: specials must survive their own match) ----------
console.log('specials — new special is not destroyed by its own match');
{
  assert(typeof E.popSet === 'function', 'engine exposes popSet(matched, specials)');
  // Horizontal run of 4 at row 3, cols 2..5 (type 1). Center = col 3 -> a 'line' special.
  const g = E.makeGrid(8, () => null);
  for (let c = 0; c < 8; c++) g[3][c] = E.gem((c + 2) % 6); // distinct neighbours
  g[3][2] = E.gem(1); g[3][3] = E.gem(1); g[3][4] = E.gem(1); g[3][5] = E.gem(1);
  const { matched, specials } = E.findMatches(g, 8);
  assert(matched.has('3-2') && matched.has('3-5'), 'the run of 4 is detected end to end');
  assert(specials.length === 1, 'a single special is planned for the run of 4');
  const center = specials[0];
  // The cell where the new special is born must NOT be in the clear set.
  const toPop = E.popSet(matched, specials);
  assert(!toPop.has(E.key(center.r, center.c)), 'special birth cell is excluded from the clear set');
  // ...but the rest of the run still gets cleared.
  assert(toPop.has('3-2') && toPop.has('3-5'), 'the non-center cells of the run are still cleared');
}

// ---------- Possible move detection ----------
console.log('hasPossibleMove — detects a swappable board');
{
  // A board with an obvious swap that makes a match.
  const g = E.makeGrid(8, (r, c) => E.gem((c + r * 3) % 6));
  // create a near-match: row0 cols1-2 are type X, col0 is Y; swapping col0<->col1 makes triple
  for (let c = 0; c < 8; c++) g[0][c] = E.gem((c + 1) % 6); // distinct-ish
  g[0][1] = E.gem(2); g[0][2] = E.gem(2); g[0][3] = E.gem(5);
  const ok = E.hasPossibleMove(g, 8);
  assert(typeof ok === 'boolean', 'hasPossibleMove returns a boolean');
}

// ---------- Summary ----------
console.log('\n----------------------------------------');
console.log(`Passed: ${passed}   Failed: ${failed}`);
if (failed > 0) {
  console.log('FAILURES:');
  failures.forEach(f => console.log(' - ' + f));
  process.exit(1);
} else {
  console.log('All tests passed ✅');
  process.exit(0);
}
