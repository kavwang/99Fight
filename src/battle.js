// Canvas 2D battle overlay (no external deps). Mobile-friendly with DPR scaling.
let canvas = null, ctx = null, wrapper = null, ro = null, rafId = 0;
let W = 0, H = 0, DPR = 1, DENSITY = 1;

const particles = []; // {x,y,vx,vy,life,max, r, color}
const projectiles = []; // {x,y,vx,vy,life,max, r, color, onHit}
const floats = []; // {x,y,vy,life,max, text, color}
const waves = []; // {x,y,r,vr,life,max,color,lineWidth}

function computeDensity(){
  let d = 1;
  const ua = navigator.userAgent || '';
  const isMobile = /Mobi|Android/i.test(ua);
  const saveData = navigator.connection && navigator.connection.saveData;
  const area = W*H;
  if(isMobile) d *= 0.8;
  if(saveData) d *= 0.7;
  if(DPR > 1.5) d *= 0.85;
  if(area < 220*220) d *= 0.8; // very small viewport
  return Math.max(0.4, Math.min(1, d));
}

function resize(){
  if(!wrapper || !canvas) return;
  W = Math.max(1, wrapper.clientWidth);
  H = Math.max(1, wrapper.clientHeight);
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  if(ctx){ ctx.setTransform(DPR,0,0,DPR,0,0); }
  DENSITY = computeDensity();
}

function loop(){
  rafId = requestAnimationFrame(loop);
  if(!ctx) return;
  // fade clear
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(0,0,W,H);

  // update projectiles
  for(let i=projectiles.length-1;i>=0;i--){
    const p = projectiles[i];
    p.x += p.vx; p.y += p.vy; p.life++;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    if(p.life>p.max){
      projectiles.splice(i,1);
      spawnBurst(p.x,p.y,p.color);
      spawnShockwave(p.x,p.y,p.color, 1);
      if(typeof p.onHit === 'function') p.onHit(p.x,p.y);
    }
  }

  // update particles
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life++;
    const k = 1 - p.life/p.max;
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r*k + 0.5, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    if(p.life>p.max) particles.splice(i,1);
  }

  // update shockwaves
  for(let i=waves.length-1;i>=0;i--){
    const w = waves[i];
    w.r += w.vr; w.life++;
    const k = 1 - w.life/w.max;
    ctx.globalAlpha = Math.max(0, k*0.9);
    ctx.strokeStyle = w.color;
    ctx.lineWidth = Math.max(1, w.lineWidth * k);
    ctx.beginPath(); ctx.arc(w.x, w.y, Math.max(0,w.r), 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
    if(w.life>w.max) waves.splice(i,1);
  }

  // update floating texts
  for(let i=floats.length-1;i>=0;i--){
    const f = floats[i];
    f.y += f.vy; f.life++;
    const k = f.life/f.max;
    ctx.globalAlpha = k<0.2 ? k*5 : 1-(k-0.2)/0.8;
    ctx.fillStyle = f.color;
    // Responsive font size: base 22px, scale with min(W,H)
    const base = 22;
    const scale = Math.max(0.9, Math.min(1.6, Math.min(W,H) / 360));
    const fontPx = Math.round(base * scale);
    ctx.font = `900 ${fontPx}px Segoe UI, Arial, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // Stronger outline and soft glow for visibility
    ctx.strokeStyle = '#111a26'; ctx.lineWidth = Math.max(3, Math.round(fontPx * 0.12));
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = Math.round(fontPx * 0.25);
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 1;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
    // reset shadow
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    if(f.life>f.max) floats.splice(i,1);
  }
}

function localPoint(el){
  if(!wrapper) return {x:0,y:0};
  const wr = wrapper.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width/2) - wr.left, y: (r.top + r.height/2) - wr.top };
}

// Ensure a point is inside the canvas area; optionally bias by role for nicer placement
function clampToCanvas(p, role){
  let x = Math.max(10, Math.min(W - 10, p.x));
  let y = Math.max(10, Math.min(H - 10, p.y));
  // If the avatar is above the wrapper (negative y), bias to top/bottom bands
  if(role === 'monster' && p.y < 0) y = Math.max(10, Math.min(H - 10, H * 0.15));
  if(role === 'player' && p.y < 0) y = Math.max(10, Math.min(H - 10, H * 0.85));
  return { x, y };
}

// Default in-canvas anchors when the source element is outside the wrapper
function roleAnchor(role){
  const margin = Math.max(10, Math.round(Math.min(W, H) * 0.05));
  if(role === 'monster') return { x: Math.max(margin, Math.min(W - margin, W * 0.78)), y: Math.max(margin, Math.min(H - margin, H * 0.18)) };
  // player
  return { x: Math.max(margin, Math.min(W - margin, W * 0.22)), y: Math.max(margin, Math.min(H - margin, H * 0.82)) };
}

// Project an element's center into canvas space; if it's outside, use a role anchor
function projectToCanvas(el, role){
  if(!wrapper) return roleAnchor(role);
  const wr = wrapper.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const outside = (r.right < wr.left) || (r.left > wr.right) || (r.bottom < wr.top) || (r.top > wr.bottom);
  if(outside || W <= 1 || H <= 1) return roleAnchor(role);
  return clampToCanvas({ x: (r.left + r.width/2) - wr.left, y: (r.top + r.height/2) - wr.top }, role);
}

function spawnBurst(x, y, color='#ffca28', count=12){
  const n = Math.max(4, Math.round(count * DENSITY));
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const s = 2 + Math.random()*3;
    particles.push({
      x, y,
      vx: Math.cos(a)*s,
      vy: Math.sin(a)*s,
      life: 0,
      max: 24 + Math.floor(Math.random()*12),
      r: 2 + Math.random()*2,
      color
    });
  }
}

function spawnProjectile(x0,y0,x1,y1,color='#ffca28', onHit){
  const dx=x1-x0, dy=y1-y0; const len=Math.max(1, Math.hypot(dx,dy));
  const speed = 10; const vx = dx/len*speed; const vy = dy/len*speed;
  const max = Math.ceil(len / speed);
  projectiles.push({x:x0,y:y0,vx,vy,life:0,max,r:3,color,onHit});
}

function spawnShockwave(x,y,color='#ffffff', size=1){
  const base = 10 * size;
  waves.push({x,y,r: base*0.2, vr: 4+size*2, life:0, max: 24+size*10, color, lineWidth: 6*size});
}

export function initBattle(els){
  if(canvas) return;
  wrapper = document.getElementById('gridWrapper');
  if(!wrapper) return;
  canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '6';
  // insert before overlay so overlay stays on top
  const overlay = document.getElementById('overlayMessage');
  if(overlay && overlay.parentElement===wrapper){ wrapper.insertBefore(canvas, overlay); } else { wrapper.appendChild(canvas); }
  ctx = canvas.getContext('2d');
  resize();
  // Ensure a post-layout resize in case wrapper hasn't finalized dimensions yet
  requestAnimationFrame(()=>{ resize(); });
  if('ResizeObserver' in window){ ro = new ResizeObserver(resize); ro.observe(wrapper); } else { window.addEventListener('resize', resize); }
  loop();
}

export function destroyBattle(){
  if(ro && wrapper){ ro.unobserve(wrapper); ro = null; }
  if(rafId){ cancelAnimationFrame(rafId); rafId=0; }
  if(canvas && canvas.parentElement){ canvas.parentElement.removeChild(canvas); }
  canvas = null; ctx = null; wrapper = null;
  particles.length = 0; projectiles.length = 0; floats.length = 0;
}

export function battleSpawnAtElement(el, color='#ffca28'){
  if(!canvas || !el) return;
  const p = localPoint(el); spawnBurst(p.x, p.y, color, 12);
}

export function battleHeroAttack(els, combo=1, dmg){
  if(!canvas) return;
  // from playerAvatar center to monsterAvatar center
  const p0 = projectToCanvas(els.playerAvatar, 'player');
  const p1 = projectToCanvas(els.monsterAvatar, 'monster');
  spawnProjectile(p0.x, p0.y, p1.x, p1.y, '#ffca28', (hx,hy)=>{
    // on hit: bigger shockwave + damage float
    spawnShockwave(hx,hy,'#ffca28', 1.2);
    if(typeof dmg==='number') floats.push({x:hx, y:hy-18, vy:-0.7, life:0, max:52, text:`-${dmg}`, color:'#ffca28'});
  });
  // combo float near monster
  floats.push({x:p1.x, y:p1.y-28, vy:-0.55, life:0, max:50, text:`x${combo}`, color:'#ffca28'});
}

export function battleMonsterAttack(els, dmg){
  if(!canvas) return;
  const p0 = projectToCanvas(els.monsterAvatar, 'monster');
  const p1 = projectToCanvas(els.playerAvatar, 'player');
  spawnProjectile(p0.x, p0.y, p1.x, p1.y, '#4caf50', (hx,hy)=>{
    spawnShockwave(hx,hy,'#4caf50', 1.0);
    if(typeof dmg==='number') floats.push({x:hx, y:hy-18, vy:-0.65, life:0, max:48, text:`-${dmg}`, color:'#4caf50'});
  });
}

export function battleComboThreshold(els, combo){
  if(!canvas || !combo) return;
  if(combo % 5 !== 0) return;
  const p = localPoint(els.monsterAvatar);
  const size = combo % 10 === 0 ? 2.0 : 1.4;
  spawnShockwave(p.x, p.y, '#ffd95e', size);
  spawnBurst(p.x, p.y, '#ffd95e', Math.round(18 * size));
}
