import { bindElements, updateHpBars } from './ui.js';
import { createInitialState, bindGlobalButtons } from './game.js';

const els = bindElements();
const state = createInitialState();

updateHpBars(els, state);

bindGlobalButtons(els, state);
