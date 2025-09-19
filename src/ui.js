import { countSolutionsFromCells, findOneSolutionFromCells } from './utils.js';

export function bindElements(){
  return {
    grid: document.getElementById('grid'),
    log: document.getElementById('log'),
    startBtn: document.getElementById('startBtn'),
    resetBtn: document.getElementById('resetBtn'),
    rowsInput: document.getElementById('rowsInput'),
    colsInput: document.getElementById('colsInput'),
    monsterIntervalInput: document.getElementById('monsterIntervalInput'),
    playerHpInput: document.getElementById('playerHpInput'),
    monsterHpInput: document.getElementById('monsterHpInput'),
    playerHpFill: document.getElementById('playerHpFill'),
    playerHpText: document.getElementById('playerHpText'),
    monsterHpFill: document.getElementById('monsterHpFill'),
    monsterHpText: document.getElementById('monsterHpText'),
    overlay: document.getElementById('overlayMessage'),
    finalText: document.getElementById('finalText'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    hintBtn: document.getElementById('hintBtn'),
    playerAvatar: document.getElementById('playerAvatar'),
    monsterAvatar: document.getElementById('monsterAvatar'),
    solutionCounter: document.getElementById('solutionCounter'),
  };
}

export function log(elLog, msg){
  const time = new Date().toLocaleTimeString('zh-TW', {hour12:false});
  elLog.innerHTML = `<div>[${time}] ${msg}</div>` + elLog.innerHTML;
}

export function updateHpBars(els, state){
  if(!els || !els.playerHpFill || !els.playerHpText || !els.monsterHpFill || !els.monsterHpText){
    return;
  }
  const pPct = (state.playerHp/state.playerMaxHp)*100;
  const mPct = (state.monsterHp/state.monsterMaxHp)*100;
  els.playerHpFill.style.width = pPct+"%";
  els.playerHpText.textContent = `${Math.max(0,state.playerHp)}/${state.playerMaxHp}`;
  els.monsterHpFill.style.width = mPct+"%";
  els.monsterHpText.textContent = `${Math.max(0,state.monsterHp)}/${state.monsterMaxHp}`;
}

export function updateSolutionCounter(els, state){
  if(!els.solutionCounter) return;
  try{
    const cells = Array.from(els.grid.querySelectorAll('.cell'));
    const n = countSolutionsFromCells(cells, state.rows, state.cols, 200);
    els.solutionCounter.textContent = n.toString();
  }catch{ els.solutionCounter.textContent='-'; }
}

export function ensureSolvableBoard(els, state, reshuffleBoard){
  const cells = Array.from(els.grid.querySelectorAll('.cell'));
  const has = countSolutionsFromCells(cells, state.rows, state.cols, 1) > 0;
  if(!has) reshuffleBoard();
}

export function findOneSolution(els, state){
  const cells = Array.from(els.grid.querySelectorAll('.cell'));
  return findOneSolutionFromCells(cells, state.rows, state.cols);
}

export function clearHints(els, state){
  els.grid.querySelectorAll('.cell.hint').forEach(c=>c.classList.remove('hint'));
  if(state.hintTimeout){ clearTimeout(state.hintTimeout); state.hintTimeout=null; }
}
