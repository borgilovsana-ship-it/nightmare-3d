import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const root=document.querySelector('#game');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x030607);
scene.fog=new THREE.FogExp2(0x030607,0.045);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,180);
camera.position.set(0,1.65,7);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x72818a,0x10100d,1.0));
const moon=new THREE.DirectionalLight(0x8594a0,.8);moon.position.set(-8,15,4);moon.castShadow=true;scene.add(moon);
const flashlight=new THREE.SpotLight(0xdce7ff,45,24,Math.PI/7,.48,1.2);
camera.add(flashlight);flashlight.position.set(0,0,0);flashlight.target.position.set(0,0,-1);camera.add(flashlight.target);scene.add(camera);
const ambient=new THREE.PointLight(0x86252b,2,8);ambient.position.set(0,2,-20);scene.add(ambient);

const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
const groundMat=mat(0x171b18),bark=mat(0x211d19),leaf=mat(0x101914),stone=mat(0x292b29),cabinMat=mat(0x28201c),windowMat=new THREE.MeshStandardMaterial({color:0xffa34c,emissive:0xff4a0a,emissiveIntensity:2});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.08;ground.receiveShadow=true;scene.add(ground);
const obstacles=[];
function box(w,h,d,material,x,y,z,collide=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);if(collide)obstacles.push({x,z,rx:w/2+.4,rz:d/2+.4});return m}
function tree(x,z,s=1){const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16*s,.3*s,3.5*s,6),bark);trunk.position.set(x,1.65*s,z);trunk.castShadow=true;scene.add(trunk);for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.ConeGeometry((1.25-i*.22)*s,(2.2-i*.18)*s,7),leaf);crown.position.set(x,(3.2+i*.7)*s,z);crown.castShadow=true;scene.add(crown)}obstacles.push({x,z,rx:.55*s,rz:.55*s})}
let seed=34821;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
for(let i=0;i<100;i++){const side=i%2?1:-1;const x=side*(4+rand()*25);const z=12-rand()*75;tree(x,z,.7+rand()*.8)}
// A broken path leads to the old cabin.
for(let i=0;i<22;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.45+rand()*.7,.08,.4+rand()*.8),stone);m.position.set((rand()-.5)*3,-.01,5-i*3.3);m.rotation.y=rand()*2;scene.add(m)}
// Cabin and warm, suspicious light.
box(5,3.2,4,cabinMat,0,1.55,-62,true);
box(5.4,.25,4.4,bark,0,3.25,-62,false);
box(1.15,2.1,.18,mat(0x100e0d),0,.98,-59.88,true);
for(const x of [-1.55,1.55]){box(.65,.7,.12,windowMat,x,1.9,-59.82,false);const glow=new THREE.PointLight(0xff6b28,2,8);glow.position.set(x,2,-57.5);scene.add(glow)}
// A distant silhouette that starts moving after the player advances.
const monster=new THREE.Group();scene.add(monster);
const dark= new THREE.MeshStandardMaterial({color:0x050606,roughness:1});
const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,1.25,4,7),dark);body.position.y=1.25;body.castShadow=true;monster.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.32,8,8),dark);head.position.y=2.25;monster.add(head);
for(const x of [-.13,.13]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,8,8),new THREE.MeshBasicMaterial({color:0xc8242d}));eye.position.set(x,2.29,-.27);monster.add(eye)}
for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.9,3,5),dark);arm.position.set(s*.52,1.35,-.02);arm.rotation.z=s*-.13;monster.add(arm);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.8,3,5),dark);leg.position.set(s*.2,.42,0);monster.add(leg)}
monster.position.set(5,0,-34);
const monsterLight=new THREE.PointLight(0xb90019,1.2,4);monsterLight.position.set(0,2.3,0);monster.add(monsterLight);
let running=false,ended=false,started=false,keys={},yaw=0,pitch=0,moveX=0,moveY=0,lookX=0,lastTouch=0,progress=0,messageTimer=0,audioCtx=null,heartbeatOsc=null,heartbeatGain=null,lastFootstep=0;
const msg=document.querySelector('#message');
function say(text,secs=3){msg.textContent=text;msg.classList.add('show');messageTimer=secs}
function startAudio(){
 if(audioCtx)return;
 try{
  audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  const master=audioCtx.createGain();master.gain.value=.24;master.connect(audioCtx.destination);
  const drone=audioCtx.createOscillator(),droneGain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
  drone.type='sawtooth';drone.frequency.value=47;filter.type='lowpass';filter.frequency.value=110;droneGain.gain.value=.055;
  drone.connect(filter);filter.connect(droneGain);droneGain.connect(master);drone.start();
  heartbeatOsc=audioCtx.createOscillator();heartbeatGain=audioCtx.createGain();
  heartbeatOsc.type='sine';heartbeatOsc.frequency.value=48;heartbeatGain.gain.value=0;
  heartbeatOsc.connect(heartbeatGain);heartbeatGain.connect(master);heartbeatOsc.start();
  window.__horrorAudio={master};
 }catch(e){audioCtx=null}
}
function soundTone(freq=80,duration=.12,volume=.08,type='sine'){
 if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();
 o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);
 o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.55),audioCtx.currentTime+duration);
 g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
 o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);
}
function tryLock(){if(!matchMedia('(pointer:coarse)').matches&&renderer.domElement.requestPointerLock)renderer.domElement.requestPointerLock()}
document.querySelector('#start-btn').addEventListener('click',async()=>{started=true;document.querySelector('#start-screen').classList.add('hidden');startAudio();try{if(screen.orientation?.lock)await screen.orientation.lock('landscape')}catch{}tryLock();soundTone(110,.5,.12,'triangle');say('Фонарик едва освещает тропу. Иди к хижине.',4)});
document.querySelector('#rotate-btn').addEventListener('click',()=>document.querySelector('#rotate-screen').style.display='none');
document.querySelector('#retry').addEventListener('click',()=>location.reload());
document.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='e'&&started&&!ended)say('Дверь открыта... внутри кто-то дышит.',3)});
document.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.0024;pitch-=e.movementY*.002;pitch=THREE.MathUtils.clamp(pitch,-1.2,1.2)}});
renderer.domElement.addEventListener('click',()=>{if(started)tryLock()});
function bindHold(id,key){const el=document.querySelector(id);el.addEventListener('pointerdown',e=>{keys[key]=true;el.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,()=>keys[key]=false))}
bindHold('#run','shift');
function bindTurn(id,key){const el=document.querySelector(id);el.addEventListener('pointerdown',e=>{keys[key]=true;el.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,()=>keys[key]=false))}bindTurn('#look-left','turnleft');bindTurn('#look-right','turnright');
const area=document.querySelector('#stick-area'),stick=document.querySelector('#stick');let stickId=null;
area.addEventListener('pointerdown',e=>{stickId=e.pointerId;area.setPointerCapture(stickId);moveStick(e)});
area.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});
function moveStick(e){const r=area.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),scale=Math.min(1,36/(len||1));moveX=dx/36*scale;moveY=dy/36*scale;stick.style.transform=`translate(${moveX*27}px,${moveY*27}px)`}
function resetStick(){stickId=null;moveX=moveY=0;stick.style.transform=''}area.addEventListener('pointerup',resetStick);area.addEventListener('pointercancel',resetStick);
const clock=new THREE.Clock();
function endGame(){ended=true;document.querySelector('#ending').classList.remove('hidden');document.exitPointerLock?.()}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
if(started&&!ended){if(keys.turnleft)yaw+=dt*1.6;if(keys.turnright)yaw-=dt*1.6;
camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
const forward=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)-moveY;
const strafe=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+moveX;
const speed=(keys.shift?5.2:2.8)*dt;const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed;const dz=(-Math.cos(yaw)*forward+Math.sin(yaw)*strafe)*speed;
const nx=camera.position.x+dx,nz=camera.position.z+dz;
if(!obstacles.some(o=>Math.abs(nx-o.x)<o.rx&&Math.abs(camera.position.z-o.z)<o.rz))camera.position.x=nx;
if(!obstacles.some(o=>Math.abs(camera.position.x-o.x)<o.rx&&Math.abs(nz-o.z)<o.rz))camera.position.z=nz;
camera.position.x=THREE.MathUtils.clamp(camera.position.x,-32,32);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-75,12);
progress=Math.max(progress,Math.max(0,(7-camera.position.z)/69));
if(audioCtx&&(Math.abs(forward)+Math.abs(strafe)>.2)&&t-lastFootstep>(keys.shift?.29:.48)){lastFootstep=t;soundTone(55+rand()*25,.055,keys.shift?.055:.025,'triangle')}\nif(audioCtx&&(Math.abs(forward)+Math.abs(strafe)>.2)&&t-lastFootstep>(keys.shift?.29:.48)){lastFootstep=t;soundTone(55+rand()*25,.055,keys.shift?.055:.025,'triangle')}
document.querySelector('#objective').textContent=progress>.83?'Доберись до хижины':'Найди выход из леса';
if(progress>.24&&t>8){
 const distanceToPlayer=monster.position.distanceTo(camera.position);
 const speed=distanceToPlayer<12?1.45:distanceToPlayer<22?.72:.24;
 const target=new THREE.Vector3(camera.position.x,0,camera.position.z);
 monster.position.lerp(target,Math.min(1,dt*speed));
 monster.lookAt(camera.position.x,0,camera.position.z);
 monster.position.y=Math.sin(t*5)*.045;
 if(heartbeatGain&&audioCtx){const intensity=THREE.MathUtils.clamp((18-distanceToPlayer)/18,0,1);heartbeatGain.gain.setTargetAtTime(intensity*.10,audioCtx.currentTime,.18);heartbeatOsc.frequency.setTargetAtTime(45+intensity*18,audioCtx.currentTime,.2)}
 if(progress<.5&&Math.random()<.003)say('Ты слышишь шаги позади...',2);
 if(distanceToPlayer<9&&Math.random()<.008)soundTone(62,.25,.04,'sawtooth');
}
const distance=monster.position.distanceTo(camera.position);if(distance<1.65){soundTone(42,.8,.3,'sawtooth');endGame()}
if(camera.position.z<-57&&Math.abs(camera.position.x)<4){say('Ты нашёл хижину. Но дверь медленно закрывается...',5);setTimeout(()=>{if(!ended){document.querySelector('#ending h1').textContent='ТЫ ВЫЖИЛ?';document.querySelector('#ending p').textContent='Это была только первая ночь.';document.querySelector('#ending').classList.remove('hidden');ended=true}},1500)}
if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)msg.classList.remove('show')}
}
ambient.intensity=1.2+Math.sin(t*2)*.5;renderer.render(scene,camera)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7))});
animate();