/* =========================================================
   board-fit.js — dynamic board sizing for a web app
   ------------------------------------------------------------
   The game grid is 8x8. This script sizes the cells so the
   FULL board always fits inside the available screen space
   (width AND height), growing to fill the screen on large
   displays and shrinking on small ones. It measures the board's own
    available region and self-corrects down until the rendered board
    provably fits, so it works at any window size with no per-screen
    tuning.
   ========================================================= */
(() => {
    const SIZE = 8;        // 8x8 grid
    const GAP_FRAC = 0.09; // gap ≈ this fraction of a cell
    const PAD = 12;        // board-wrap padding (each side)
    const BORD = 2;        // board-wrap border (each side)
    const FLOOR = 12;      // absolute smallest cell so a board always fits
    const CAP_FRAC = 0.12; // cell cap ≈ this fraction of the smaller viewport side
    const root = document.documentElement;
    // Total board = SIZE cells + (SIZE-1) gaps. With gap = GAP_FRAC * cell,
    // the whole board = cell * (SIZE + (SIZE-1) * GAP_FRAC).
    const BOARD_UNITS = SIZE + (SIZE - 1) * GAP_FRAC;

    // The board lives inside .board-area, a grid region whose size is set by the
    // layout (independent of the cell size): on wide screens it is the 1fr track
    // beside the side panel, on narrow screens it is the row below the panel.
    // Measuring that region directly gives the free space for the board with no
    // chicken-and-egg dependency on the cell size we are about to compute.
    function applySize(sized) {
        // Gap is a fixed fraction of the cell, kept >= 3px for readability.
        const gap = Math.max(3, Math.round(sized * GAP_FRAC));
        root.style.setProperty('--cell', sized + 'px');
        root.style.setProperty('--gap', gap + 'px');
    }

    function fit() {
        const area = document.querySelector('.board-area');
        const board = document.getElementById('board');
        if (!area || !board) return;

        // Free space for the board grid inside the region (minus wrap border/pad).
        const rect = area.getBoundingClientRect();
        const boardW = rect.width - BORD * 2 - PAD * 2;
        const boardH = rect.height - BORD * 2 - PAD * 2;
        if (boardW <= 0 || boardH <= 0) return;

        // Analytic starting point: the largest cell that fits 8 cells + 7 gaps in
        // the smaller available dimension. Capped to a screen-proportional size so
        // large monitors fill the screen instead of capping at a fixed pixel value.
        const cap = Math.round(Math.min(window.innerWidth, window.innerHeight) * CAP_FRAC);
        let sized = Math.floor(Math.min(boardW, boardH) / BOARD_UNITS);
        sized = Math.min(cap, sized);

        // Self-correcting step: round off and shrink one cell at a time until the
        // *rendered* board provably fits both width and height. This guarantees no
        // overflow at any window size, without hand-tuning per screen — the board
        // sizes itself down to the largest value that actually fits.
        applySize(Math.max(FLOOR, sized));
        let guard = 60;
        let w = board.offsetWidth, h = board.offsetHeight;
        while (guard-- > 0 && (w > boardW + 0.5 || h > boardH + 0.5)) {
            sized = Math.max(FLOOR, sized - 1);
            applySize(sized);
            w = board.offsetWidth;
            h = board.offsetHeight;
        }
    }

    // Coalesce every trigger into one pass per animation frame, so the fit
    // re-runs automatically on any resize / breakpoint switch / font swap.
    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            fit();
        });
    }

    // Initial fit once the DOM and CSS are ready.
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        requestAnimationFrame(fit);
    } else {
        window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(fit));
    }
    window.addEventListener('load', fit);
    window.addEventListener('resize', schedule);

    // Watch the viewport (via documentElement) and the board region so the fit
    // re-runs when the window is resized or the layout switches breakpoints.
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(schedule);
        ro.observe(document.documentElement);
        const area = document.querySelector('.board-area');
        if (area) ro.observe(area);
    }

    // Re-fit once fonts settle so the panel height is accurate.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
})();
