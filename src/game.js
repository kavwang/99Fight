import { generateTriple, isValidTriple, countSolutionsFromCells, areAdjacent } from './utils.js';
import { updateHpBars, log, updateSolutionCounter, clearHints, findOneSolution, ensureSolvableBoard } from './ui.js';
import { initAudio, playSpawnSound } from './audio.js';
import { initEffects, destroyEffects, playMatchBurstAtCell, playMonsterHit, playPlayerHit, showCombo } from './effects.js';
import { initBattle, destroyBattle, battleSpawnAtElement, battleHeroAttack, battleMonsterAttack, battleComboThreshold } from './battle.js';
import { initBattleView, destroyBattleView, bvHeroAttack, bvMonsterAttack, bvComboThreshold } from './battleview.js';

export function createInitialState(){
  return {
    rows: 6,
    cols: 6,
    playerMaxHp: 100,
    monsterMaxHp: 120,
    playerHp: 100,
    monsterHp: 120,
    monsterInterval: 5000,
    running: false,
    selected: [],
    monsterTimer: null,
    combo: 0,
    solutionWatchTimer: null,
    hintTimeout: null,
  };
}

export function initGridStructure(els, state){
  els.grid.style.gridTemplateColumns = `repeat(${state.cols},1fr)`;
  els.grid.innerHTML = '';
  const total = state.rows * state.cols;
  for(let i=0;i<total;i++){
    const div = document.createElement('div');
    div.className = 'cell';
    div.dataset.index = i;
    div.textContent = '?';
    els.grid.appendChild(div);
  }
}

export function buildNumberPool(count){
  const pool=[];
  while(pool.length < count){
    const need = count - pool.length;
    const triple = generateTriple();
    if(need >=3) pool.push(...triple);
    else pool.push(...triple.slice(0,need));
  }
  for(let i=pool.length-1;i>0;i--){
    const r = Math.floor(Math.random()*(i+1));
    [pool[i],pool[r]]=[pool[r],pool[i]];
  }
  return pool;
}

export function fillAllCells(els){
  const cells = Array.from(els.grid.querySelectorAll('.cell'));
  const nums = buildNumberPool(cells.length);
  cells.forEach((cell,i)=>{ cell.textContent = nums[i]; cell.dataset.value = nums[i]; });
}

export function getCellAt(els, state, r,c){
  if(r<0||c<0||r>=state.rows||c>=state.cols) return null;
  const idx = r*state.cols + c;
  return els.grid.querySelector(`.cell[data-index="${idx}"]`);
}

export function collapseColumn(els, state, c){
  const values=[];
  for(let r=state.rows-1;r>=0;r--){
    const cell = getCellAt(els, state, r,c); if(!cell) continue;
    const v = cell.dataset.value;
    if(v!==undefined && v!=='' && !cell.classList.contains('to-clear')){
      values.push(parseInt(v,10));
    }
  }
  let writeR = state.rows-1;
  for(const v of values){
    const cell = getCellAt(els, state, writeR, c);
    cell.dataset.value = v; cell.textContent = v; writeR--;
  }
  const holes = writeR + 1;
  for(let r=0;r<holes;r++){
    const cell = getCellAt(els, state, r,c);
    const triple = generateTriple();
    const v = triple[Math.floor(Math.random()*3)];
    cell.dataset.value = v; cell.textContent = v;
    // sound only (spawn animation removed)
    playSpawnSound(520 - r*25);
  }
}

export function applyGravity(els, state, clearedIndices){
  if(!clearedIndices || clearedIndices.length===0) return;
  clearedIndices.forEach(idx=>{
    const cell = els.grid.querySelector(`.cell[data-index="${idx}"]`);
    if(cell){
      cell.classList.add('to-clear');
      cell.classList.remove('match');
      cell.dataset.value='';
      cell.textContent='';
    }
  });
  const colSet = new Set(clearedIndices.map(i=> i % state.cols));
  colSet.forEach(c=> collapseColumn(els, state, c));
  els.grid.querySelectorAll('.cell.to-clear').forEach(c=>c.classList.remove('to-clear'));
  clearHints(els, state);
  const cells = Array.from(els.grid.querySelectorAll('.cell'));
  const has = countSolutionsFromCells(cells, state.rows, state.cols, 1) > 0;
  if(!has){ log(els.log, '下落後盤面無解，重新洗牌'); reshuffleBoard(els, state); }
}

export function reshuffleBoard(els, state){
  clearHints(els, state);
  fillAllCells(els);
  const cells = Array.from(els.grid.querySelectorAll('.cell'));
  let tries=0; let has = countSolutionsFromCells(cells, state.rows, state.cols, 1) > 0;
  while(!has && tries<30){ tries++; fillAllCells(els); has = countSolutionsFromCells(Array.from(els.grid.querySelectorAll('.cell')), state.rows, state.cols, 1) > 0; }
  if(!has){
    // force insert
    const cs = Array.from(els.grid.querySelectorAll('.cell'));
    if(cs.length>=3){
      const triple = generateTriple();
      for(let i=cs.length-1;i>0;i--){ const r=Math.floor(Math.random()*(i+1)); [cs[i],cs[r]]=[cs[r],cs[i]]; }
      for(let i=0;i<3;i++){ cs[i].textContent=triple[i]; cs[i].dataset.value=triple[i]; }
    }
  }
  updateSolutionCounter(els, state);
}

export function applyInputs(els, state){
  state.rows = parseInt(els.rowsInput.value)||6;
  state.cols = parseInt(els.colsInput.value)||6;
  state.playerMaxHp = state.playerHp = parseInt(els.playerHpInput.value)||100;
  state.monsterMaxHp = state.monsterHp = parseInt(els.monsterHpInput.value)||120;
  state.monsterInterval = (parseInt(els.monsterIntervalInput.value)||5)*1000;
}

export function attachGridHandlers(els, state){
  const onCellClick = (e)=>{
    if(!state.running) return;
    const cell = e.currentTarget;
    if(state.selected.includes(cell)){
      cell.classList.remove('selected');
      state.selected = state.selected.filter(c=>c!==cell);
      return;
    }
    if(state.selected.length>=3) state.selected.forEach(c=>c.classList.remove('selected')), state.selected=[];
    cell.classList.add('selected');
    state.selected.push(cell);
    if(state.selected.length===3){
      const indices = state.selected.map(c=>parseInt(c.dataset.index,10));
      if(!areAdjacent(indices, state.rows, state.cols)){
        log(els.log, '三個格子需要互相相鄰連通。');
        setTimeout(()=>{ state.selected.forEach(c=>c.classList.remove('selected')); state.selected=[]; },400);
        return;
      }
      const values = state.selected.map(c=>c.dataset.value);
      const triple = isValidTriple(values);
      if(triple){
        log(els.log, `成功: ${triple.a} x ${triple.b} = ${triple.c}`);
        state.selected.forEach(c=>c.classList.add('match'));
        const matched = [...state.selected];
        try{ matched.forEach(c => playMatchBurstAtCell(c)); }catch{}
        try{ matched.forEach(c => battleSpawnAtElement(c)); }catch{}
        performPlayerAttack(els, state, triple, matched.length);
        setTimeout(()=>{
          const idxs = matched.map(c=> parseInt(c.dataset.index,10));
          matched.forEach(c=> c.classList.remove('selected'));
          state.selected=[];
          applyGravity(els, state, idxs);
          updateSolutionCounter(els, state);
        },120);
      } else {
        log(els.log, '不是有效的乘法組合。');
        setTimeout(()=>{ state.selected.forEach(c=>c.classList.remove('selected')); state.selected=[]; },400);
      }
    }
  };
  els.grid.querySelectorAll('.cell').forEach(cell=>cell.addEventListener('click', onCellClick));
}

export function performPlayerAttack(els, state, triple){
  const base = Math.max(5, Math.floor(triple.a * triple.b / 3));
  state.combo += 1;
  const bonus = Math.floor(base * (state.combo-1) * 0.15);
  const dmg = base + bonus;
  state.monsterHp -= dmg;
  updateHpBars(els, state);
  if(els.monsterAvatar){
    els.monsterAvatar.classList.add('shake');
    setTimeout(()=>els.monsterAvatar && els.monsterAvatar.classList.remove('shake'),500);
  }
  try{ playMonsterHit(els); showCombo(state.combo, els.monsterAvatar); }catch{}
  try{ battleHeroAttack(els, state.combo, dmg); battleComboThreshold(els, state.combo); }catch{}
  try{ bvHeroAttack(dmg, state.combo); bvComboThreshold(state.combo); }catch{}
  if(!checkEnd(els, state)){
    // placeholder for reward hooks
  }
}

export function monsterAttack(els, state){
  if(!state.running) return;
  const dmg = 8 + Math.floor(Math.random()*6);
  state.playerHp -= dmg; state.combo = 0;
  updateHpBars(els, state);
  if(els.playerAvatar){
    els.playerAvatar.classList.add('shake');
    setTimeout(()=>els.playerAvatar && els.playerAvatar.classList.remove('shake'),500);
  }
  try{ playPlayerHit(els); }catch{}
  try{ battleMonsterAttack(els, dmg); }catch{}
  try{ bvMonsterAttack(dmg); }catch{}
  checkEnd(els, state);
}

export function startMonsterTimer(els, state){
  if(state.monsterTimer) clearInterval(state.monsterTimer);
  state.monsterTimer = setInterval(()=>monsterAttack(els, state), state.monsterInterval);
}

export function startGame(els, state){
  applyInputs(els, state); initGridStructure(els, state); initAudio();
  try{ initEffects(els); }catch{}
  try{ initBattle(els); }catch{}
  try{ initBattleView(); }catch{}
  fillAllCells(els);
  attachGridHandlers(els, state);
  ensureSolvableBoard(els, state, ()=>reshuffleBoard(els, state));
  updateSolutionCounter(els, state);
  updateHpBars(els, state);
  state.combo = 0; state.running = true;
  els.startBtn.disabled = true; els.resetBtn.disabled = false; els.hintBtn.disabled = false;
  log(els.log, '遊戲開始! 選取三個相鄰格子組成 a x b = c 來攻擊怪獸');
  startMonsterTimer(els, state);
  if(state.solutionWatchTimer) clearInterval(state.solutionWatchTimer);
  state.solutionWatchTimer = setInterval(()=>{
    if(!state.running) return;
    const cells = Array.from(els.grid.querySelectorAll('.cell'));
    const has = countSolutionsFromCells(cells, state.rows, state.cols, 1) > 0;
    if(!has){ log(els.log, '偵測到盤面無解 -> 自動重洗'); reshuffleBoard(els, state); }
    updateSolutionCounter(els, state);
  }, 5000);
  setTimeout(()=>log(els.log, `怪獸將每 ${(state.monsterInterval/1000)} 秒攻擊一次`),200);
}

export function resetGame(els, state){
  state.running = false;
  if(state.monsterTimer){ clearInterval(state.monsterTimer); state.monsterTimer=null; }
  if(state.solutionWatchTimer){ clearInterval(state.solutionWatchTimer); state.solutionWatchTimer=null; }
  els.startBtn.disabled = false; els.resetBtn.disabled = true;
  els.hintBtn.disabled = true; els.overlay.style.display = 'none';
  state.selected=[]; els.grid.innerHTML='';
  clearHints(els, state);
  if(els.solutionCounter) els.solutionCounter.textContent='-';
  log(els.log, '已重置。');
  try{ destroyEffects(); }catch{}
  try{ destroyBattle(); }catch{}
  try{ destroyBattleView(); }catch{}
}

export function bindGlobalButtons(els, state){
  if(els.playAgainBtn) els.playAgainBtn.addEventListener('click', ()=>{ resetGame(els, state); startGame(els, state); });
  if(els.startBtn) els.startBtn.addEventListener('click', ()=> startGame(els, state));
  if(els.resetBtn) els.resetBtn.addEventListener('click', ()=> resetGame(els, state));
  if(els.hintBtn) els.hintBtn.addEventListener('click', ()=>{
    if(!state.running) return;
    clearHints(els, state);
    const sol = findOneSolution(els, state);
    if(!sol){ log(els.log, '目前無解，重新洗牌'); reshuffleBoard(els, state); return; }
    sol.forEach(idx=>{
      const cell = els.grid.querySelector(`.cell[data-index="${idx}"]`);
      if(cell) cell.classList.add('hint');
    });
    log(els.log, '提示：紅框為一組可行組合');
    if(state.hintTimeout) { clearTimeout(state.hintTimeout); state.hintTimeout=null; }
    state.hintTimeout = setTimeout(()=>{ clearHints(els, state); }, 1500);
    updateSolutionCounter(els, state);
  });
}

function checkEnd(els, state){
  if(state.monsterHp<=0){
    state.running=false; clearInterval(state.monsterTimer); state.monsterTimer=null;
    log(els.log, '你擊敗了怪獸!');
    els.finalText.textContent = '勝利!';
    els.overlay.style.display='flex';
    return true;
  }
  if(state.playerHp<=0){
    state.running=false; clearInterval(state.monsterTimer); state.monsterTimer=null;
    log(els.log, '你被擊敗了...');
    els.finalText.textContent = '失敗';
    els.overlay.style.display='flex';
    return true;
  }
  return false;
}
