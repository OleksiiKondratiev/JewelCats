/* =========================================================
   Reproduction harness for the engine bugs listed in
   docs/bugs/README.md.

   Run with:  node docs/bugs/repro.js

   Each check asserts the CORRECT (expected) behaviour.
   Exit code 1  => at least one bug is still present.
   Exit code 0  => every documented bug below is fixed.
   ========================================================= */

const path = require('path');
const E = require(path.join(__dirname, '..', '..', 'engine.js'));

// Base fill with no accidental matches:
// horizontal neighbours differ by 1 (mod 6), vertical neighbours alternate.
const base = (r, c) => E.gem((c + r * 3) % 6);
// Stricter fill: no two orthogonally adjacent cells share a type at all, so only the
// cells a check writes down can ever form a run.
const baseAdj = (r, c) => E.gem((r + 2 * c) % 6);

let failing = 0;
function check(bugId, label, cond, detail) {
  const ok = !!cond;
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${bugId}] ${label}`);
  if (detail) console.log(`        ${detail}`);
  if (!ok) failing++;
}

// Mirror of game.js resolveBoard() lines 363-384 (special placement + clear set).
function simulateResolve(grid, specials, matched) {
  for (const sp of specials) {
    if (sp.len >= 5) grid[sp.r][sp.c] = { ...grid[sp.r][sp.c], special: 'bomb' };
    else if (sp.len === 4) grid[sp.r][sp.c] = { ...grid[sp.r][sp.c], special: 'line' };
  }
  const extra = E.collectSpecialClears(specials, matched, grid, 8);
  const clearAll = new Set([...matched, ...extra]);
  for (const sp of specials) if (sp.len >= 4) clearAll.delete(E.key(sp.r, sp.c));
  return { extra, clearAll };
}

// ---- BUG-001: a pre-existing special that is part of a match must fire ----
{
  const g = E.makeGrid(8, base);
  g[0][0] = E.gem(1, 'line'); g[0][1] = E.gem(1); g[0][2] = E.gem(1); // run of 3, special at col 0
  const { matched, specials } = E.findMatches(g, 8);
  const extra = E.collectSpecialClears(specials, matched, g, 8);
  const rowCleared = [0, 1, 2, 3, 4, 5, 6, 7].every((c) => extra.has('0-' + c));
  check('BUG-001', 'line gem at the END of a matched run clears its row', rowCleared,
    `specials=${JSON.stringify(specials)} extraClear.size=${extra.size} (expected 8)`);
}

// ---- BUG-002: a line gem must blast along ITS OWN orientation ----
{
  const g = E.makeGrid(8, base);
  // Vertical run of 3 in col 4; the 'line' gem (created horizontally earlier) sits at the
  // run's center (1,4), so collectSpecialClears() does see it and uses sp.dir = 'v'.
  g[0][4] = E.gem(2); g[1][4] = E.gem(2, 'line'); g[2][4] = E.gem(2);
  const { matched, specials } = E.findMatches(g, 8);
  const extra = E.collectSpecialClears(specials, matched, g, 8);
  const rowCleared = [0, 1, 2, 3, 4, 5, 6, 7].every((c) => extra.has('1-' + c));
  const colCleared = [0, 1, 2, 3, 4, 5, 6, 7].every((r) => extra.has(r + '-4'));
  check('BUG-002', 'horizontal line gem cleared its ROW (not its column)', rowCleared && !colCleared,
    `specials=${JSON.stringify(specials)} rowCleared=${rowCleared} colCleared=${colCleared} -> blast direction comes from the triggering run (sp.dir), not from the gem`);
}

// ---- BUG-003: a special created in this step must NOT detonate in this step ----
{
  const g = E.makeGrid(8, base);
  for (let c = 1; c <= 4; c++) g[3][c] = E.gem(5); // plain run of 4 -> line gem at (3,3)
  const { matched, specials } = E.findMatches(g, 8);
  const { extra, clearAll } = simulateResolve(g, specials, matched);
  check('BUG-003', 'freshly created line gem does not blast the row it created', extra.size === 0,
    `extraClear=${extra.size} cells, total cleared=${clearAll.size} (run of 4 = 4 cells expected)`);
}

// ---- BUG-007: the longest run must win when two runs share a birth cell ----
{
  const g = E.makeGrid(8, baseAdj);
  for (let c = 1; c <= 5; c++) g[3][c] = E.gem(4); // horizontal len 5, center (3,3)
  for (let r = 1; r <= 4; r++) g[r][3] = E.gem(4); // vertical   len 4, center (3,3)
  const { matched, specials } = E.findMatches(g, 8);
  simulateResolve(g, specials, matched); // applies game.js' placement loop, in array order
  check('BUG-007', 'cell (3,3) ends up a bomb (run of 5 beats the run of 4)', g[3][3].special === 'bomb',
    `specials=${JSON.stringify(specials)} finalSpecialAt(3,3)=${g[3][3].special}`);
}

// ---- BUG-010: specials[] must only describe runs that actually spawn a gem ----
{
  const g = E.makeGrid(8, base);
  g[0][0] = E.gem(1); g[0][1] = E.gem(1); g[0][2] = E.gem(1); // plain 3-match
  const { specials } = E.findMatches(g, 8);
  check('BUG-010', 'a plain 3-match contributes no special entry', specials.length === 0,
    `specials=${JSON.stringify(specials)}`);
}

console.log('\n----------------------------------------');
console.log(failing === 0
  ? 'All documented engine reproductions now pass ✅'
  : `${failing} reproduction(s) still fail — the documented bug(s) are present ❌`);
process.exit(failing === 0 ? 0 : 1);
