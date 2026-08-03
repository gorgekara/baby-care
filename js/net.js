/* Multiplayer networking: the Net object (Firebase Realtime Database room sync) plus the
   host/guest snapshot-apply functions that translate remote state into local game state. */

import { fbDb, scene, dad, endGame, resetState, freshPlayer, onMetaChange, renderLobbyPlayers, renderColorPicker, shopEl, refreshShop, me, enterHouseCommon, leaveToMainMenu, closeShopFn } from './main.js';
import { buildHouse } from './house/build.js';
import { PLAYER_COLORS, spawnBabies, setMood, poseBabySit, setCarrySprite } from './entities.js';
import { CARRY_ICON } from './config.js';
import { makeSprite } from './utils.js';
import {
  S, babies, houseGroup,
  myId, myName, setMyName,
  isHost, setIsHost,
  roomCode, setRoomCode,
  difficulty, setDifficulty,
  tasksMode, setTasksMode,
  players,
  setActingPlayerId,
} from './state.js';

export const Net = (function(){
  let roomRef=null, actionsRef=null, playersRef=null, babiesRef=null, worldRef=null, metaRef=null;
  let actionsListening=false, worldListening=false, playersListening=false; // a room can now host several
                                                            // rounds in a row (Back to Lobby, play again) —
                                                            // these guards keep listen*() idempotent so a
                                                            // second round doesn't stack duplicate Firebase
                                                            // listeners and double-process every action
  function code5(){ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=A[(Math.random()*A.length)|0]; return s; }
  function attach(c){
    setRoomCode(c); roomRef = fbDb.ref('rooms/'+c);
    actionsRef=roomRef.child('actions'); playersRef=roomRef.child('players');
    babiesRef=roomRef.child('babies'); worldRef=roomRef.child('world'); metaRef=roomRef.child('meta');
    actionsListening=worldListening=playersListening=false;
  }
  return {
    available(){ return !!fbDb; },
    async hostCreate(name){
      attach(code5());
      setIsHost(true); setMyName(name);
      await metaRef.set({hostId:myId, state:'lobby', difficulty:'veteran', babyCount:1, tasksMode:false, createdAt:Date.now()});
      metaRef.onDisconnect().update({state:'ended', reason:'hostleft'});
      await playersRef.child(myId).set({name, colorIdx:0, poo:0, x:0, z:0, rotY:0, carrying:null, holdingBaby:-1});
      me().colorIdx = 0;
      playersRef.child(myId).onDisconnect().remove();
      playersRef.on('value', snap=>{ const v=snap.val()||{}; renderLobbyPlayers(v); renderColorPicker(v); });
      metaRef.on('value', snap=>{ const m=snap.val(); if(m) onMetaChange(m); });
      return roomCode;
    },
    async join(code, name){
      attach(code.toUpperCase());
      const snap = await metaRef.get();
      if(!snap.exists()) { setRoomCode(null); throw new Error('no-room'); }
      setIsHost(false); setMyName(name);
      const existing = await playersRef.get();
      const n = existing.exists() ? Object.keys(existing.val()).length : 0;
      await playersRef.child(myId).set({name, colorIdx:n%PLAYER_COLORS.length, poo:0, x:0, z:0, rotY:0, carrying:null, holdingBaby:-1});
      me().colorIdx = n%PLAYER_COLORS.length;
      playersRef.child(myId).onDisconnect().remove();
      playersRef.on('value', s=>{ const v=s.val()||{}; renderLobbyPlayers(v); renderColorPicker(v); });
      metaRef.on('value', s=>{ const m=s.val(); if(m) onMetaChange(m); });
      return true;
    },
    setDifficulty(d){ if(isHost && metaRef) metaRef.update({difficulty:d}); },
    setBabyCount(n){ if(isHost && metaRef) metaRef.update({babyCount:n}); },
    setTasksMode(on){ if(isHost && metaRef) metaRef.update({tasksMode:on}); },
    setMyColor(idx){ if(playersRef) playersRef.child(myId).update({colorIdx:idx}); },
    startGameFromHost(){ if(isHost && metaRef) metaRef.update({state:'playing', seed:Math.floor(Math.random()*1e9)}); },
    sendAction(type, arg){
      if(!actionsRef) return;
      actionsRef.push({playerId:myId, type, arg: arg!==undefined?arg:null,
        x:dad.position.x, z:dad.position.z, rotY:dad.rotation.y, ts:Date.now()});
    },
    listenActions(){                                    // host-only: replay a guest's queued action through the
      if(actionsListening) return; actionsListening=true; // exact same functions the host's own input calls
      actionsRef.on('child_added', snap=>{
        const a = snap.val(); snap.ref.remove();
        if(!a || a.playerId===myId) return;
        const p = players[a.playerId]; if(!p) return;
        p.x=a.x; p.z=a.z; p.rotY=a.rotY;
        setActingPlayerId(a.playerId);
        try{
          if(a.type==='interact') interact();
          else if(a.type==='hold') toggleHoldBaby();
          else if(a.type==='drop') discardCarrying();
          else if(a.type==='buy') buyUpgrade(a.arg);
        } finally { setActingPlayerId(myId); }              // always hand control back, even if a handler throws —
        Net.pushWorldSnapshot();                            // otherwise every future action (incl. the host's
      });                                                    // own input) would misfire as this guest until it
                                                              // recovers. Push right away too, instead of waiting
                                                              // for the next throttled tick, so a guest's carry
                                                              // icon / holding-baby pose reaches everyone else
                                                              // with minimal delay instead of up to ~120ms late
    },
    listenWorldAsGuest(){                                // non-host: mirror the host's authoritative snapshot
      if(worldListening) return; worldListening=true;
      babiesRef.on('value', snap=>applyRemoteBabies(snap.val()));
      worldRef.on('value', snap=>applyRemoteWorld(snap.val()));
    },
    listenPlayers(){                                     // host and guest alike: spawn/update/remove avatars,
      if(playersListening) return; playersListening=true; // and (guest-only) my own host-owned outcome fields
      playersRef.on('child_added', snap=>applyPlayerSnapshot(snap.key, snap.val()));
      playersRef.on('child_changed', snap=>applyPlayerSnapshot(snap.key, snap.val()));
      playersRef.on('child_removed', snap=>{ if(snap.key!==myId) removeRemotePlayer(snap.key); });
    },
    pushMyTransform(){                                    // every client owns writing its own position/heading
      if(!playersRef) return;                              // (holdStamina too — it drains/recovers locally in
      const P = me();                                       // tick() and the host needs a fresh copy to correctly
      const payload = {x:dad.position.x, z:dad.position.z, rotY:dad.rotation.y, name:myName,   // gate a guest's
        colorIdx:P.colorIdx, holdStamina:P.holdStamina};                                       // own pickup attempts
      if(isHost) Object.assign(payload, {carrying:P.carrying||'', holdingBaby:P.holdingBaby, poo:P.poo, lvl:P.lvl});
      playersRef.child(myId).update(payload);
    },
    pushWorldSnapshot(){                                  // host-only: the shared world, plus every player's
      if(!isHost || !babiesRef) return;                   // "outcome" fields (carrying/holdingBaby/poo/lvl)
      const bSnap = {};
      // y/rotY matter most while held — without them a guest saw the baby dragging along the ground at
      // the holder's feet instead of lifted into their arms. traits/favoriteToy are seed-derivable and
      // already match on every client, but synced anyway as a safety net (same reasoning as `name` below).
      babies.forEach((b,i)=>{ bSnap[i] = {x:b.mesh.position.x, y:b.mesh.position.y, z:b.mesh.position.z,
        rotY:b.mesh.rotation.y, name:b.name, traits:b.traits, pickyRefusing:b.pickyRefusing,
        need:b.need, mood:b.moodLast, fallen:b.fallen, burned:b.burned, choking:b.choking, penned:b.penned,
        targetIsOven:b.targetIsOven, heldBy:b.heldBy, dirty:b.dirty, wet:b.wet, bathTimer:b.bathTimer}; });
      babiesRef.set(bSnap);
      worldRef.set({cry:S.cry, cartoonsOn:S.cartoonsOn, notification:S.notification,
        elapsed:S.elapsed, timeLeft: isFinite(S.timeLeft)?S.timeLeft:-1, score:S.score,
        packageWaiting:S.packageWaiting, phaseIdx: S.phaseIdx==null?-1:S.phaseIdx,
        messes:S.messes.map(m=>({x:m.x,z:m.z})),
        milestoneNonce:S.milestoneNonce, milestoneMsg:S.milestoneMsg,  // guests detect the nonce changing
        tasksDone:S.tasks.map(t=>t.done)});      // task identity/order is already deterministic from the shared
                                                  // seed — only the done-flags actually need to be synced
      for(const id in players){ if(id===myId) continue;
        playersRef.child(id).update({carrying:players[id].carrying||'', holdingBaby:players[id].holdingBaby,
          poo:players[id].poo, lvl:players[id].lvl, changes:players[id].changes, cuddles:players[id].cuddles,
          hazardsHandled:players[id].hazardsHandled, bathsGiven:players[id].bathsGiven}); }
    },
    setGameOver(reason){ if(isHost && metaRef) metaRef.update({state:'ended', reason}); },
    setPlayerLeft(id, reason){ if(isHost && playersRef) playersRef.child(id).update({gameOverReason:reason}); },
    reopenLobby(){ if(isHost && metaRef) metaRef.update({state:'lobby'}); }, // host's "Back to Lobby" — keeps
                                                            // everyone in the same room; flips the shared state
                                                            // so guests' difficulty/baby-count pickers live-sync
                                                            // again instead of staying frozen on 'ended'
    leaveRoom(){
      if(playersRef){ playersRef.child(myId).remove(); playersRef.off(); }
      if(metaRef){ metaRef.onDisconnect().cancel(); metaRef.off(); }
      if(babiesRef) babiesRef.off();
      if(worldRef) worldRef.off();
      if(actionsRef) actionsRef.off();
      for(const id in players){ if(id!==myId) removeRemotePlayer(id); }
      roomRef=actionsRef=playersRef=babiesRef=worldRef=metaRef=null;
      setRoomCode(null); setIsHost(true);
    },
  };
})();

export function beginMultiplayerRound(meta){
  setDifficulty(meta.difficulty || 'veteran');
  setTasksMode(!!meta.tasksMode);
  const myColorIdx = players[myId] ? players[myId].colorIdx : 0;
  // a room can now host several rounds in a row (Back to Lobby, play again) without ever leaving/rejoining,
  // and listenPlayers() is idempotent — so child_added won't fire again for players already known from an
  // earlier round here. Capture their avatars before resetState() wipes `players`, then reattach them,
  // otherwise every remote player's avatar mesh would be orphaned (leaked into the scene) and never rebuilt.
  const preservedRemote = {};
  for(const id in players){ if(id!==myId) preservedRemote[id] = players[id]; }
  resetState();
  S.babyCount = meta.babyCount || 1;
  players[myId].name = myName;
  players[myId].colorIdx = myColorIdx;
  for(const id in preservedRemote){
    const old = preservedRemote[id];
    const p = players[id] = freshPlayer(old.name, old.colorIdx);
    p.avatar = old.avatar; p.connected = old.connected;
    if(p.avatar.carrySprite){                             // clear any stale carry icon left from the last round
      p.avatar.group.remove(p.avatar.carrySprite);
      p.avatar.carrySprite.material.map.dispose(); p.avatar.carrySprite.material.dispose();
      p.avatar.carrySprite=null; p.avatar.lastCarrying=null;
    }
  }
  buildHouse(meta.seed);
  spawnBabies();
  enterHouseCommon();
  document.getElementById('tutorialPanel').classList.add('hidden');
  if(isHost) Net.listenActions(); else Net.listenWorldAsGuest();
  Net.listenPlayers();
  S.mode='play';
}
export function handleRemoteGameOver(meta){
  if(meta.reason==='hostleft'){
    const wasPlaying = S.mode==='play';
    Net.leaveRoom();
    if(wasPlaying){
      S.mode='over'; closeShopFn();
      retryAction = 'menu';                               // the room is gone — no lobby left to rejoin
      document.getElementById('goIcon').textContent='📡💔';
      document.getElementById('goTitle').textContent='Host Disconnected';
      document.getElementById('goBody').textContent="The host's connection dropped, so the game had to end. No harm done — try hosting your own room!";
      document.getElementById('goStats').textContent='';
      document.getElementById('retryBtn').textContent = 'Back to Menu ↻';
      document.getElementById('gameover').classList.remove('hidden');
    } else {
      leaveToMainMenu();                                  // also hides any gameover/win overlay still stuck
                                                            // on screen from an earlier real round in this room
    }
    return;
  }
  if(S.mode!=='play') return;
  endGame(meta.reason||'lose');
}
/* ---------- Players: remote avatars (spawned/removed as players join/leave, lerped toward synced
   transforms) plus — for a guest only — mirroring my own host-owned outcome fields back down to me ---------- */
export function applyPlayerSnapshot(id, data){
  if(!data) return;
  if(id===myId){
    if(isHost) return;                                  // host's own record is already authoritative locally
    const P = me();
    const prevCarrying = P.carrying;
    // carrying is written as '' (not null) on the wire — Firebase deletes any key written as null, so a
    // cleared "not carrying anything" would otherwise arrive as an absent key (undefined) and never overwrite
    // the last real value, leaving a stale carry icon stuck on-screen forever. || null restores the sentinel.
    if(data.carrying!==undefined) P.carrying = data.carrying || null;
    if(data.holdingBaby!==undefined) P.holdingBaby = data.holdingBaby;
    if(data.poo!==undefined) P.poo = data.poo;
    if(data.lvl) P.lvl = data.lvl;
    // changes/cuddles/hazardsHandled/bathsGiven are host-simulated the same way — only mirrored back down
    // for the profile-XP tally at endGame(), so a guest's own lifetime stats aren't left stuck at zero
    if(data.changes!==undefined) P.changes = data.changes;
    if(data.cuddles!==undefined) P.cuddles = data.cuddles;
    if(data.hazardsHandled!==undefined) P.hazardsHandled = data.hazardsHandled;
    if(data.bathsGiven!==undefined) P.bathsGiven = data.bathsGiven;
    if(P.carrying !== prevCarrying) setCarrySprite(P.carrying ? CARRY_ICON[P.carrying] : null);
    if(!shopEl.classList.contains('hidden')) refreshShop();
    if(data.gameOverReason && S.mode==='play'){             // the host saw ME hide/walk out — my round ends,
      endGame(data.gameOverReason);                          // but the room stays alive for everyone else, so
      retryAction = 'menu';                                   // there's no shared lobby left to rejoin alone
      document.getElementById('retryBtn').textContent = 'Back to Menu ↻';
    }
    return;
  }
  let p = players[id];
  if(!p){
    p = players[id] = freshPlayer(data.name, data.colorIdx||0);
    const c = PLAYER_COLORS[(data.colorIdx||0)%PLAYER_COLORS.length];
    const group = buildDad(c.body, c.leg);
    const nameSprite = makeSprite(data.name||'Player', {font:36});
    nameSprite.position.set(0,3.9,0); nameSprite.scale.multiplyScalar(0.8); nameSprite.renderOrder=10;
    group.add(nameSprite);
    scene.add(group);
    p.avatar = {group, nameSprite, carrySprite:null, lastCarrying:null};
  }
  p.name=data.name||p.name; p.colorIdx=(data.colorIdx!==undefined?data.colorIdx:p.colorIdx);
  if(data.x!==undefined) p.x=data.x; if(data.z!==undefined) p.z=data.z; if(data.rotY!==undefined) p.rotY=data.rotY;
  if(data.carrying!==undefined) p.carrying=data.carrying || null;   // see note above re: '' vs deleted null
  if(data.holdingBaby!==undefined) p.holdingBaby=data.holdingBaby;
  if(data.poo!==undefined) p.poo=data.poo; if(data.lvl) p.lvl=data.lvl;
  if(data.holdStamina!==undefined) p.holdStamina=data.holdStamina;
  p.connected=true;
  if(p.avatar.lastCarrying !== p.carrying){
    if(p.avatar.carrySprite){ p.avatar.group.remove(p.avatar.carrySprite); p.avatar.carrySprite.material.map.dispose(); p.avatar.carrySprite.material.dispose(); p.avatar.carrySprite=null; }
    if(p.carrying && CARRY_ICON[p.carrying]){ const spr=makeSprite(CARRY_ICON[p.carrying],{bg:null,font:64}); spr.position.set(0,3.5,0);
      spr.scale.set(1.3,1.3,1.3); spr.renderOrder=10; p.avatar.group.add(spr); p.avatar.carrySprite=spr; }
    p.avatar.lastCarrying = p.carrying;
  }
}
export function removeRemotePlayer(id){
  const p = players[id]; if(!p) return;
  if(p.avatar){ scene.remove(p.avatar.group); disposeGroup(p.avatar.group); }
  delete players[id];
}
export function updateRemoteAvatars(dt){
  for(const id in players){
    if(id===myId) continue;
    const p = players[id]; if(!p.avatar) continue;
    const g = p.avatar.group, k = Math.min(1, dt*8);
    const dx = p.x-g.position.x, dz = p.z-g.position.z;
    g.position.x += dx*k; g.position.z += dz*k;
    let dRot = Math.atan2(Math.sin(p.rotY-g.rotation.y), Math.cos(p.rotY-g.rotation.y));
    g.rotation.y += dRot*k;
    // walking leg/arm swing — we don't have this player's raw key input, only their synced position, so
    // "are they moving" is derived from how much ground is still being closed toward that position each frame
    const moving = Math.hypot(dx,dz) > 0.03;
    if(moving) p.walkPhase = (p.walkPhase||0) + dt*12;
    const sw = Math.sin(p.walkPhase||0)*0.5*(moving?1:0);
    g.userData.legL.rotation.x = sw; g.userData.legR.rotation.x = -sw;
    g.position.y = Math.abs(Math.sin(p.walkPhase||0))*0.06*(moving?1:0);
    if(p.holdingBaby>=0){
      g.userData.arms[0].rotation.x += (-1.15-g.userData.arms[0].rotation.x)*k;
      g.userData.arms[1].rotation.x += (-1.15-g.userData.arms[1].rotation.x)*k;
    } else { g.userData.arms[0].rotation.x = -sw; g.userData.arms[1].rotation.x = sw; }
  }
}
/* ---------- Guest-side mirroring: apply the host's authoritative babies/world snapshot ---------- */
export function applyRemoteBabies(snap){
  if(!snap) return;
  Object.keys(snap).forEach(i=>{
    const d = snap[i], b = babies[i]; if(!b) return;
    b.netTarget = {x:d.x, y:(d.y!==undefined?d.y:b.mesh.position.y), z:d.z, // smoothed every frame in
      rotY:(d.rotY!==undefined?d.rotY:b.mesh.rotation.y)};  // updateRemoteBabies(), not just when a snapshot
    if(d.name) b.name = d.name;                            // arrives — otherwise
    if(d.traits) b.traits = d.traits;
    b.pickyRefusing=!!d.pickyRefusing;
    b.need = d.need || b.need; b.fallen=!!d.fallen; b.burned=!!d.burned; b.choking=!!d.choking; b.penned=!!d.penned;
    b.targetIsOven=!!d.targetIsOven; b.heldBy=d.heldBy||null;
    b.dirty = d.dirty!==undefined ? d.dirty : b.dirty; b.wet=!!d.wet; b.bathTimer = d.bathTimer||0;
    setMood(b, d.mood||'🙂');
    if(b.heldBy){ b.mesh.scale.set(0.9,0.9,0.9); b.mesh.userData.mat.visible=false; }
    else { b.mesh.scale.set(1,1,1); b.mesh.userData.mat.visible=true; }
    poseBabySit(b.mesh.userData);                        // simplified pose for remote-observed babies (v1)
  });
}
export function updateRemoteBabies(dt){                          // guest-only: continuous per-frame lerp toward the
  const k = Math.min(1, dt*8);                             // host's last-known baby positions, so movement stays
  const myHeld = me().holdingBaby;                          // smooth between the ~8Hz Firebase snapshots instead
  babies.forEach((b,i)=>{                                   // of visibly stepping every time one arrives
    if(i===myHeld){
      // I'm the one holding this baby — position it straight from my own (zero-latency) transform, exactly
      // like the host does for its own held baby. Otherwise it lags twice over: once for my movement to
      // reach the host, again for the host's resulting baby position to sync back down to me.
      const bob = Math.abs(Math.sin(walkPhase))*0.05;
      b.mesh.position.set(dad.position.x + Math.sin(dad.rotation.y)*0.55, 1.15+bob, dad.position.z + Math.cos(dad.rotation.y)*0.55);
      b.mesh.rotation.y = dad.rotation.y;
      return;
    }
    if(!b.netTarget) return;
    b.mesh.position.x += (b.netTarget.x-b.mesh.position.x)*k;
    b.mesh.position.y += (b.netTarget.y-b.mesh.position.y)*k; // height matters most while held — without it the
    b.mesh.position.z += (b.netTarget.z-b.mesh.position.z)*k; // baby looked dragged along the ground instead of
    let dRot = Math.atan2(Math.sin(b.netTarget.rotY-b.mesh.rotation.y), Math.cos(b.netTarget.rotY-b.mesh.rotation.y));
    b.mesh.rotation.y += dRot*k;                            // lifted into the holder's arms
  });
}
export function applyRemoteWorld(w){
  if(!w) return;
  S.cry=w.cry||0; S.cartoonsOn=!!w.cartoonsOn; S.notification=!!w.notification;
  S.elapsed=w.elapsed||0; S.timeLeft = w.timeLeft<0 ? Infinity : w.timeLeft; S.score=w.score||0;
  const newPhaseIdx = (w.phaseIdx==null || w.phaseIdx<0) ? null : w.phaseIdx;
  if(newPhaseIdx !== S.phaseIdx){                       // guest-side: detect the host's phase transitions too,
    S.phaseIdx = newPhaseIdx;                           // so the banner/HUD indicator shows up for everyone
    if(newPhaseIdx!=null){ S.phaseBannerTimer = PHASE_BANNER_SECONDS; Audio.chime(); }
  }
  if(w.milestoneNonce!=null && w.milestoneNonce !== S.milestoneNonce){  // guest-side: detect the host's
    S.milestoneNonce = w.milestoneNonce;                                 // rare milestone moments too
    S.milestoneMsg = w.milestoneMsg||'';
    S.milestoneBannerTimer = MILESTONE_BANNER_SECONDS;
    Audio.giggle();
  }
  const packageNowWaiting = !!w.packageWaiting;
  if(packageNowWaiting !== S.packageWaiting){
    S.packageWaiting = packageNowWaiting;
    if(S.packageWaiting && !S.packageMesh){
      S.packageMesh = packageBoxGroup(); S.packageMesh.position.copy(packageSpot); houseGroup.add(S.packageMesh);
    } else if(!S.packageWaiting && S.packageMesh){
      houseGroup.remove(S.packageMesh); disposeGroup(S.packageMesh); S.packageMesh=null;
    }
  }
  const list = w.messes||[];
  while(S.messes.length>list.length){ const m=S.messes.pop(); if(m.mesh){ houseGroup.remove(m.mesh); disposeGroup(m.mesh); } }
  while(S.messes.length<list.length){ const mesh=messBlob(); houseGroup.add(mesh); S.messes.push({x:0,z:0,mesh,playerInside:false}); }
  list.forEach((pt,i)=>{ S.messes[i].x=pt.x; S.messes[i].z=pt.z; S.messes[i].mesh.position.set(pt.x,0.01,pt.z); });
  if(w.tasksDone) w.tasksDone.forEach((done,i)=>{ if(S.tasks[i]) S.tasks[i].done = !!done; });
}

