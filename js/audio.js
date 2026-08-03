/* Procedural SFX (Web Audio) and background music playback. */

export const Audio = (function(){
  let ctx=null, master=null, muted=false, started=false, sfxVol=0.9;
  function init(){                                  // no background music — just sets up the context for SFX
    if(started) return; started=true;
    ctx = new (window.AudioContext||window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = sfxVol; master.connect(ctx.destination);
  }
  function blip(freq, dur, type, vol, glideTo){
    if(!ctx||muted) return;
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime);
    if(glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime+dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol||0.25, ctx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime+dur+0.05);
  }
  // layered in place of a single flat blip — a sawtooth "wail" with a wavering vibrato (an LFO
  // frequency-modulating the main oscillator) plus a thinner, higher "shrill" harmonic on top.
  // Still fully procedural (no sampled audio asset available to ship), but reads as a cry rather
  // than a generic sci-fi blip.
  function cryBurst(){
    if(!ctx||muted) return;
    const t0 = ctx.currentTime, dur = 0.55;
    const o1=ctx.createOscillator(), g1=ctx.createGain();
    o1.type='sawtooth'; o1.frequency.setValueAtTime(560,t0); o1.frequency.exponentialRampToValueAtTime(190,t0+dur);
    const lfo=ctx.createOscillator(), lfoGain=ctx.createGain();
    lfo.type='sine'; lfo.frequency.value=7; lfoGain.gain.value=18;
    lfo.connect(lfoGain); lfoGain.connect(o1.frequency);
    g1.gain.setValueAtTime(0.0001,t0); g1.gain.exponentialRampToValueAtTime(0.16,t0+0.03); g1.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o1.connect(g1); g1.connect(master);
    const o2=ctx.createOscillator(), g2=ctx.createGain();
    o2.type='square'; o2.frequency.setValueAtTime(1080,t0); o2.frequency.exponentialRampToValueAtTime(380,t0+dur-0.05);
    g2.gain.setValueAtTime(0.0001,t0); g2.gain.exponentialRampToValueAtTime(0.05,t0+0.03); g2.gain.exponentialRampToValueAtTime(0.0001,t0+dur-0.05);
    o2.connect(g2); g2.connect(master);
    lfo.start(t0); o1.start(t0); o2.start(t0);
    lfo.stop(t0+dur+0.05); o1.stop(t0+dur+0.05); o2.stop(t0+dur);
  }
  return {
    start(){ init(); if(ctx.state==='suspended') ctx.resume(); },
    chime(){ blip(880,0.18,'sine',0.22); setTimeout(()=>blip(1318,0.25,'sine',0.2),90); },
    poo(){ blip(300,0.14,'square',0.14,180); },
    buy(){ blip(660,0.1,'triangle',0.2); setTimeout(()=>blip(990,0.16,'triangle',0.2),80); },
    cry(){ cryBurst(); },
    error(){ blip(200,0.18,'sawtooth',0.15,120); },
    cough(){ blip(340,0.09,'triangle',0.16); setTimeout(()=>blip(260,0.11,'triangle',0.14),70); },  // hazard telegraph — distinct from cry/error
    doorbell(){ blip(784,0.2,'sine',0.22); setTimeout(()=>blip(587,0.28,'sine',0.2),150); },        // descending, unlike chime's ascending contour — for packages, not work pings
    giggle(){ [0,1,2].forEach(i=>setTimeout(()=>blip(520+i*90,0.14,'sine',0.14),i*90)); },          // a baby happily playing with a toy
    setMuted(m){ muted=m; },
    get muted(){ return muted; },
    setSfxVolume(v){ sfxVol=Math.max(0,Math.min(1,v)); if(master) master.gain.value=sfxVol; },
    get sfxVolume(){ return sfxVol; },
  };
})();

export const Music = (function(){
  const TRACKS = { games:'music/game-vibes.mp3', retro:'music/retro-arcade.mp3' };
  let el=null, muted=false, started=false, current='games', baseVolume=0.14, intensity=0;
  function ensure(){ if(!el){ el=new window.Audio(); el.loop=true; applyVolume(); } return el; }
  // called both when the user drags the volume slider and every frame off the cry-o-meter — panic
  // used to be communicated by a red bar alone; now the music itself swells and speeds up with it
  function applyVolume(){ if(!el) return; el.volume = Math.min(1, baseVolume*(1+intensity*0.6)); el.playbackRate = 1+intensity*0.15; }
  return {
    start(){
      started=true; const a=ensure();
      if(!a.src) a.src = TRACKS[current];
      if(!muted) a.play().catch(()=>{});
    },
    setTrack(key){
      if(!TRACKS[key]) return; current=key;
      const a=ensure(); a.src=TRACKS[key];
      if(started && !muted) a.play().catch(()=>{});
    },
    setMuted(m){ muted=m; const a=ensure(); if(m) a.pause(); else if(started) a.play().catch(()=>{}); },
    setVolume(v){ baseVolume=Math.max(0,Math.min(1,v)); applyVolume(); },
    setIntensity(i){ intensity=Math.max(0,Math.min(1,i)); applyVolume(); },
    get muted(){ return muted; },
    get current(){ return current; },
    get volume(){ return baseVolume; },
  };
})();

