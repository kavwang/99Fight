// Lightweight PixiJS overlay for battle effects (mobile-friendly)
// ESM import from CDN to avoid bundler requirements
import * as PIXI from 'https://unpkg.com/pixi.js@7.x/dist/pixi.mjs';

let app = null;
let root = null;
let wrapper = null;
let ro = null; // ResizeObserver

function resizeToWrapper(){
  if(!app || !wrapper) return;
  const w = Math.max(1, wrapper.clientWidth);
  const h = Math.max(1, wrapper.clientHeight);
  app.renderer.resize(w, h);
}

export function initEffects(els){
  try{
    if(app) return; // already initialized
    wrapper = document.getElementById('gridWrapper');
    if(!wrapper) return;
    app = new PIXI.Application({
      width: wrapper.clientWidth || 300,
      height: wrapper.clientHeight || 300,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2), // cap for mobile perf
      autoDensity: true,
    });
    root = new PIXI.Container();
    app.stage.addChild(root);
    const view = app.view;
    view.style.position = 'absolute';
    view.style.inset = '0';
    view.style.pointerEvents = 'none';
    view.style.zIndex = '5'; // keep UI overlay above
    wrapper.style.position = wrapper.style.position || 'relative';
    const overlayEl = document.getElementById('overlayMessage');
    if(overlayEl && overlayEl.parentElement === wrapper){
      wrapper.insertBefore(view, overlayEl);
    } else {
      wrapper.appendChild(view);
    }
    resizeToWrapper();
    // Resize observer for responsiveness
    if('ResizeObserver' in window){
      ro = new ResizeObserver(()=> resizeToWrapper());
      ro.observe(wrapper);
    } else {
      window.addEventListener('resize', resizeToWrapper);
    }
  }catch(e){
    console.warn('initEffects failed', e);
  }
}

function getLocalPoint(el){
  if(!wrapper) return {x:0,y:0};
  const wr = wrapper.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const x = (r.left + r.width/2) - wr.left;
  const y = (r.top + r.height/2) - wr.top;
  return {x, y};
}

function spawnBurst(x, y, color=0xffca28, count=10){
  if(!app || !root) return;
  const container = new PIXI.Container();
  root.addChild(container);
  const particles = [];
  for(let i=0;i<count;i++){
    const g = new PIXI.Graphics();
    g.beginFill(color).drawCircle(0,0, 2+Math.random()*2).endFill();
    g.x = x; g.y = y;
    const angle = Math.random()*Math.PI*2;
    const speed = 1 + Math.random()*2.5;
    const life = 18 + Math.floor(Math.random()*12);
    particles.push({g, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, life});
    container.addChild(g);
  }
  let t = 0;
  const tick = (delta)=>{
    t += delta;
    for(const p of particles){
      p.g.x += p.vx * delta;
      p.g.y += p.vy * delta;
      p.vy += 0.05 * delta; // gravity
      p.g.alpha = Math.max(0, 1 - (t/p.life));
      p.g.scale.set(Math.max(0.2, 1 - (t/p.life)*0.5));
    }
    // cleanup
    if(t > Math.max(...particles.map(p=>p.life))){
      app.ticker.remove(tick);
      container.destroy({children:true});
    }
  };
  app.ticker.add(tick);
}

function screenShake(intensity=6, durationMs=150){
  if(!app || !root) return;
  const orig = {x: root.x, y: root.y};
  let elapsed = 0;
  const tick = (delta)=>{
    elapsed += (delta/60)*1000; // approximate ms
    if(elapsed >= durationMs){
      root.position.set(orig.x, orig.y);
      app.ticker.remove(tick);
      return;
    }
    const k = 1 - (elapsed/durationMs);
    root.x = (Math.random()*2-1) * intensity * k;
    root.y = (Math.random()*2-1) * intensity * k;
  };
  app.ticker.add(tick);
}

export function playMatchBurstAtCell(cellEl){
  if(!cellEl) return;
  const {x,y} = getLocalPoint(cellEl);
  spawnBurst(x, y, 0xffca28, 12);
}

export function playMonsterHit(els){
  const el = els?.monsterAvatar || document.getElementById('monsterAvatar');
  if(!el) return;
  const {x,y} = getLocalPoint(el);
  spawnBurst(x, y, 0xff5252, 16);
  screenShake(8, 180);
}

export function playPlayerHit(els){
  const el = els?.playerAvatar || document.getElementById('playerAvatar');
  if(!el) return;
  const {x,y} = getLocalPoint(el);
  spawnBurst(x, y, 0x4caf50, 14);
  screenShake(6, 160);
}

export function showCombo(n, nearEl){
  if(!app || !root || !n) return;
  const text = new PIXI.Text(`x${n}`, {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontWeight: '800',
    fontSize: 28,
    fill: 0xffca28,
    stroke: 0x1b2a38,
    strokeThickness: 4,
  });
  let x= app.renderer.width/2, y = app.renderer.height*0.18;
  if(nearEl){ const p = getLocalPoint(nearEl); x = p.x; y = p.y - 20; }
  text.x = x; text.y = y; text.alpha = 0.0; text.anchor.set(0.5);
  root.addChild(text);
  let t = 0;
  const dur = 40; // frames
  const tick = (delta)=>{
    t += delta;
    const k = Math.min(1, t/dur);
    text.alpha = k < 0.2 ? k*5 : 1 - (k-0.2)/0.8;
    text.y = y - k*22;
    text.scale.set(1 + Math.sin(k*Math.PI)*0.15);
    if(k >= 1){
      app.ticker.remove(tick);
      text.destroy();
    }
  };
  app.ticker.add(tick);
}

export function destroyEffects(){
  try{
    if(ro && wrapper) ro.unobserve(wrapper);
    ro = null;
    if(app){ app.destroy(true, {children:true}); app = null; root = null; wrapper = null; }
  }catch{}
}
