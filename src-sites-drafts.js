// sites/drafts.js — buildings still being made. They show up ONLY in the sandbox
// (sandbox.html), never on the job board, so a half-finished building can't break the game.
//
// To try a new building:
//   1. Make its file in this folder, the same shape as hospital.js (build, Door, components,
//      clues, faults, tests, checks, testCycles, record, procedures...).
//   2. Import it here and add it to DRAFTS, e.g.
//        import firestation from './src-sites-firestation.js';
//        export const DRAFTS = { firestation };
//   3. Open sandbox.html and pick it from the BUILDING list.
//   4. When it's ready to play, move it from DRAFTS to SITES in sites/index.js.

// (none right now: Kessler Auto Repair and Fire Station 7 are on the job board)
export const DRAFTS = {};
