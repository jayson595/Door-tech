// sites/index.js — the buildings beyond Riverside Market.
//
// Each building is one module that brings everything specific to it: its 3D scene, how its
// door moves, its parts, clues, faults, repairs and door tests (see hospital.js for the shape).
// The job board's ?door=<id> picks which one loads; Riverside Market's two doors ('ada' and
// 'manual') are the original game and don't use this.
//
// Buildings still being made live in drafts.js: only the sandbox (sandbox.html) loads those.

import { param } from './src-params.js';
import hospital from './src-sites-hospital.js';
import dock from './src-sites-dock.js';
import dockman from './src-sites-dockman.js';
import school from './src-sites-school.js';
import coffee from './src-sites-coffee.js';
import hotel from './src-sites-hotel.js';
import autoshop from './src-sites-autoshop.js';
import firestation from './src-sites-firestation.js';
import { DRAFTS } from './src-sites-drafts.js';

export const SITES = { hospital, dock, dockman, school, coffee, hotel, autoshop, firestation };
export { DRAFTS };

// The building loaded right now (null = Riverside Market). Drafts only load in the sandbox.
export const SITE = SITES[param('door')] || (param('sandbox') ? DRAFTS[param('door')] : null) || null;
