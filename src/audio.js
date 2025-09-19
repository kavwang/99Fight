let audioCtx = null; let masterGain = null;

export function initAudio(){
  try{
    if(!audioCtx){
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.06; // global volume
      masterGain.connect(audioCtx.destination);
    }
  }catch{}
}

export function playSpawnSound(freq=500, dur=0.08){
  if(!audioCtx) return; 
  try{
    if(audioCtx.state==='suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type='sine'; osc.frequency.value = Math.max(220, Math.min(1000, freq));
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now+0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now+dur);
    osc.connect(gain); gain.connect(masterGain||audioCtx.destination);
    osc.start(now); osc.stop(now+dur+0.02);
  }catch{}
}
