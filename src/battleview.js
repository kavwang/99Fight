// Dedicated battle view canvas renderer (no external assets):
// Renders a simple scene with hero and monster, idle motion, attacks, damage/combo text.

let root = null, canvas = null, ctx = null, ro = null, rafId = 0;
let W = 0, H = 0, DPR = 1;

const state = {
  time: 0,
  hero: { x: 0, y: 0, r: 40, color: '#4fc3f7' },
  monster: { x: 0, y: 0, r: 46, color: '#ef5350' },
  projectiles: [], // {x,y,vx,vy,life,max,color,r,onHit}
  floats: [], // {x,y,vy,life,max,text,color,size}
  waves: [], // {x,y,r,vr,life,max,color,lineWidth}
};

const imgs = { hero: null, monster: null };

function placeActors(){
  const pad = Math.max(24, Math.min(W,H)*0.06);
  // side-scroller: hero left, monster right
  state.hero.x = pad + state.hero.r + 8;
  state.hero.y = H - pad - state.hero.r - 10;
  state.monster.x = W - pad - state.monster.r - 8;
  state.monster.y = pad + state.monster.r + 10;
}

function resize(){
  if(!root || !canvas) return;
  const r = root.getBoundingClientRect();
  W = Math.max(1, Math.floor(r.width));
  H = Math.max(1, Math.floor(r.height));
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  if(ctx) ctx.setTransform(DPR,0,0,DPR,0,0);
  placeActors();
}

function spawnProjectile(x0,y0,x1,y1,color='#ffca28', onHit){
  const dx=x1-x0, dy=y1-y0; const len = Math.max(1, Math.hypot(dx,dy));
  const speed = Math.max(6, Math.min(12, Math.sqrt(len)));
  const vx = dx/len*speed, vy = dy/len*speed;
  const max = Math.ceil(len / speed);
  state.projectiles.push({x:x0,y:y0,vx,vy,life:0,max,color,r:3,onHit});
}

function spawnWave(x,y,color='#ffd95e', size=1){
  const base = 10 * size;
  state.waves.push({x,y,r:base*0.2,vr:4+size*2,life:0,max:24+size*10,color,lineWidth:6*size});
}

function addFloat(x,y,text,color='#ffca28', size=1){
  const max = 52 + Math.floor(Math.random()*10);
  state.floats.push({x,y,vy:-0.7,life:0,max,text,color,size});
}

export function bvHeroAttack(dmg, combo){
  if(!ctx) return;
  spawnProjectile(state.hero.x, state.hero.y, state.monster.x, state.monster.y, '#ffca28', (hx,hy)=>{
    spawnWave(hx,hy,'#ffca28',1.2);
    if(typeof dmg==='number') addFloat(hx, hy-18, `-${dmg}`, '#ffca28', 1.1);
  });
  addFloat(state.monster.x, state.monster.y-28, `x${combo}`, '#ffd95e', 1.0);
}

export function bvMonsterAttack(dmg){
  if(!ctx) return;
  spawnProjectile(state.monster.x, state.monster.y, state.hero.x, state.hero.y, '#4caf50', (hx,hy)=>{
    spawnWave(hx,hy,'#4caf50',1.0);
    if(typeof dmg==='number') addFloat(hx, hy-18, `-${dmg}`, '#4caf50', 1.0);
  });
}

export function bvComboThreshold(combo){
  if(!ctx) return;
  if(combo % 5 !== 0) return;
  const size = combo % 10 === 0 ? 1.8 : 1.2;
  spawnWave(state.monster.x, state.monster.y, '#ffd95e', size);
}

export function initBattleView(){
  if(canvas) return;
  root = document.getElementById('battleView');
  if(!root) return;
  canvas = document.createElement('canvas');
  root.appendChild(canvas);
  ctx = canvas.getContext('2d');
  // load images (SVG, pixel-art)
  try {
    const h = new Image(); h.decoding = 'async'; h.src = './assets/hero-pixel.svg'; h.onload = ()=>{ imgs.hero = h; };
    const m = new Image(); m.decoding = 'async'; m.src = './assets/monster-pixel.svg'; m.onload = ()=>{ imgs.monster = m; };
  } catch {}
  resize();
  requestAnimationFrame(resize);
  if('ResizeObserver' in window){ ro = new ResizeObserver(resize); ro.observe(root); } else { window.addEventListener('resize', resize); }
  loop();
}

export function destroyBattleView(){
  if(ro && root){ ro.unobserve(root); ro = null; }
  if(rafId){ cancelAnimationFrame(rafId); rafId = 0; }
  if(canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas);
  canvas = null; ctx = null; root = null;
  state.projectiles.length = 0; state.floats.length = 0; state.waves.length = 0;
}

function loop(){
  rafId = requestAnimationFrame(loop);
  if(!ctx) return;
  // disable smoothing for pixel crisp
  ctx.imageSmoothingEnabled = false;
  state.time += 1;
  // background: side-scroller mountains and ground
  // sky gradient
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#0e1522'); grad.addColorStop(1,'#1a2740');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  // distant mountains (parallax)
  const t = state.time * 0.3;
  drawMountainLayer(0.18*H, '#233249', 0.4, t*0.3);
  drawMountainLayer(0.32*H, '#1e2a3f', 0.6, t*0.5);
  // ground strip
  drawGround('#1c3526', '#2e5d3f');

  // idle bob
  const heroBob = Math.sin(state.time*0.06)*2;
  const monBob = Math.cos(state.time*0.05)*2;

  // draw actors first (so effects/text render on top)
  drawActor(state.hero.x, state.hero.y + heroBob, state.hero.r, state.hero.color, '#1f2d3a', imgs.hero);
  drawActor(state.monster.x, state.monster.y + monBob, state.monster.r, state.monster.color, '#3a1f1f', imgs.monster);

  // projectiles
  for(let i=state.projectiles.length-1;i>=0;i--){
    const p = state.projectiles[i];
    p.x += p.vx; p.y += p.vy; p.life++;
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    if(p.life>p.max){
      state.projectiles.splice(i,1);
      spawnWave(p.x,p.y,p.color,1);
      if(typeof p.onHit==='function') p.onHit(p.x,p.y);
    }
  }

  // waves
  for(let i=state.waves.length-1;i>=0;i--){
    const w = state.waves[i]; w.r+=w.vr; w.life++;
    const k = 1 - w.life/w.max; ctx.globalAlpha = Math.max(0, k*0.9);
    ctx.strokeStyle = w.color; ctx.lineWidth = Math.max(1, w.lineWidth*k);
    ctx.beginPath(); ctx.arc(w.x,w.y,Math.max(0,w.r),0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1; if(w.life>w.max) state.waves.splice(i,1);
  }

  // floats (top-most)
  for(let i=state.floats.length-1;i>=0;i--){
    const f = state.floats[i]; f.y += f.vy; f.life++;
    const k = f.life/f.max; ctx.globalAlpha = k<0.2 ? k*5 : 1-(k-0.2)/0.8;
    const base = 22; const scale = Math.max(0.9, Math.min(1.6, Math.min(W,H)/360));
    const px = Math.round(base*scale*f.size);
    ctx.font = `900 ${px}px Segoe UI, Arial, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.strokeStyle = '#111a26'; ctx.lineWidth = Math.max(3, Math.round(px*0.12));
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = Math.round(px*0.25); ctx.shadowOffsetX=0; ctx.shadowOffsetY=1;
    ctx.fillStyle = f.color; ctx.strokeText(f.text,f.x,f.y); ctx.fillText(f.text,f.x,f.y);
    ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.globalAlpha=1;
    if(f.life>f.max) state.floats.splice(i,1);
  }
  // end frame
}

function drawActor(x,y,r,fill,shadow,img){
  ctx.save();
  if(img && img.complete){
    const size = r*2;
    ctx.shadowColor = shadow; ctx.shadowBlur = Math.max(6, Math.round(r*0.7));
    ctx.drawImage(img, Math.round(x-size/2), Math.round(y-size/2), Math.round(size), Math.round(size));
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  } else {
    ctx.shadowColor = shadow; ctx.shadowBlur = Math.max(4, Math.round(r*0.6));
    ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    // simple face fallback
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x-r*0.35, y-r*0.15, r*0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.35, y-r*0.15, r*0.12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0f1a28';
    ctx.beginPath(); ctx.arc(x-r*0.35, y-r*0.15, r*0.06, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.35, y-r*0.15, r*0.06, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#0f1a28'; ctx.lineWidth = Math.max(1, Math.round(r*0.12));
    ctx.beginPath(); ctx.arc(x, y+r*0.15, r*0.4, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
  }
  ctx.restore();
}

function drawMountainLayer(h, color, scale, offset){
  // draw a repeating triangular mountain range
  const baseY = Math.floor(H*0.55 + h);
  const width = Math.max(60, Math.floor(140*scale));
  const amp = Math.max(20, Math.floor(50*scale));
  const scroll = Math.floor(offset % width);
  ctx.fillStyle = color;
  // two passes to wrap
  for(let pass=0; pass<2; pass++){
    const start = -scroll + pass*width;
    for(let x=start; x<W+width; x+=width){
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + width*0.5, baseY - amp);
      ctx.lineTo(x + width, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawGround(dark, light){
  const y = Math.floor(H*0.82);
  // dark base
  ctx.fillStyle = dark; ctx.fillRect(0, y, W, H - y);
  // light ridges stripes
  ctx.fillStyle = light;
  const stripeH = 3; const gap = 6;
  for(let yy = y + 6; yy < H; yy += (stripeH + gap)){
    ctx.fillRect(0, yy, W, stripeH);
  }
}
