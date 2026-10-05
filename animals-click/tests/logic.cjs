// Tests execute the actual app/SW scripts in a simulated DOM/cache environment.
// They do not replace installation and offline checks on a real browser/device.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
let passed=0;
function ok(value,description) { assert(value,description); passed++; console.log('PASS',description); }
function surface(extra={}) {
  const listeners={};
  return Object.assign({listeners,addEventListener(name,fn){(listeners[name] ||= []).push(fn);},dispatch(name,event={}){ for(const fn of listeners[name] || []) fn(event); }},extra);
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function appTests() {
  let now=0,sequence=0; const timers=new Map();
  const gallery=surface({clientWidth:412,setPointerCapture(){}});
  const image={src:'./assets/images/01-arich.webp',style:{},getAnimations(){return [];},animate(){}};
  const document=surface({hidden:false,getElementById:id=>id==='gallery'?gallery:image});
  const window=surface();
  const sandbox={document,window,performance:{now:()=>now},Image:class{decode(){return Promise.resolve();}},matchMedia:()=>({matches:false}),navigator:{},console,
    setTimeout(fn,ms){let id=++sequence;timers.set(id,{fn,due:now+ms});return id;},clearTimeout(id){timers.delete(id);}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),sandbox);
  async function tick(ms) {
    const end=now+ms;
    while(true){const next=[...timers].filter(([,t])=>t.due<=end).sort((a,b)=>a[1].due-b[1].due)[0];if(!next)break;now=next[1].due;timers.delete(next[0]);next[1].fn();await flush();}
    now=end;await flush();
  }
  const pointer=(name,x,y,id=1)=>gallery.dispatch(name,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0});
  async function swipe(dx,dy=0,duration=200){pointer('pointerdown',250,400);await tick(duration);pointer('pointermove',250+dx,400+dy);pointer('pointerup',250+dx,400+dy);await flush();}
  const at=name=>image.src.includes(name);
  await swipe(0); ok(at('01-arich'),'tap ignored');
  await swipe(12,4); ok(at('01-arich'),'jitter ignored');
  await swipe(5,160); ok(at('01-arich'),'vertical ignored');
  await swipe(100,90); ok(at('01-arich'),'diagonal ignored');
  await swipe(-140,0,1100); ok(at('01-arich'),'long hold and drag ignored');
  pointer('pointerdown',250,400);pointer('pointerdown',300,400,2);await tick(200);pointer('pointerup',100,400);pointer('pointerup',150,400,2);await flush();ok(at('01-arich'),'multi-touch ignored');
  pointer('pointerdown',250,400);await tick(200);pointer('pointercancel',100,400);pointer('pointerup',100,400);await flush();ok(at('01-arich'),'cancelled gesture ignored');
  await swipe(-140);ok(at('02-kitten'),'left advances');
  pointer('pointerup',100,400);await flush();ok(at('02-kitten'),'duplicate pointerup ignored');
  await swipe(-140);ok(at('02-kitten'),'rapid repeat suppressed');
  await tick(400);await swipe(140);ok(at('01-arich'),'right goes back');
  await tick(400);await swipe(140);ok(at('10-hedgehog'),'first wraps to last');
  await tick(400);await swipe(-140);ok(at('01-arich'),'last wraps to first');
  await tick(29000);await swipe(0,0,150);ok(at('01-arich'),'no transition before 30 seconds');
  await tick(850);ok(at('02-kitten'),'automatic transition at 30 seconds; tap did not reset');
  await tick(29000);await swipe(-140);ok(at('03-corgi'),'manual transition near expiration');
  await tick(1000);ok(at('03-corgi'),'manual swipe resets timer');
  await tick(29000);ok(at('04-rabbit'),'new countdown is 30 seconds');
  await tick(30000);ok(at('05-calf'),'automatic transition restarts countdown');
  document.hidden=true;document.dispatch('visibilitychange');await tick(180000);ok(at('05-calf'),'background pauses timer');
  document.hidden=false;document.dispatch('visibilitychange');await tick(29000);ok(at('05-calf'),'return has no cascade');await tick(1000);ok(at('06-goat'),'return starts fresh 30 seconds');
  await tick(400);pointer('pointerdown',250,400);await tick(200);pointer('pointermove',250,500);pointer('pointerup',100,400);await flush();ok(at('06-goat'),'vertical-start gesture cannot become horizontal');
  const evt={preventDefault(){this.prevented=true;}};document.dispatch('contextmenu',evt);ok(evt.prevented,'context menu blocked');
  ok((document.listeners.click||[]).length===0 && (gallery.listeners.click||[]).length===0,'no click navigation handler');
}
async function swTests() {
  const scope='https://example.test/kids-games/animals-click/';
  const entries=new Map([['speech-games:v1',new Map()]]);let network=0,offline=false,skipped=false,claimed=false;
  const caches={async open(name){if(!entries.has(name))entries.set(name,new Map());const cache=entries.get(name);return {
    async addAll(urls){const pending=urls.map(url=>{const local=url.slice(scope.length)||'index.html';return [url,fs.readFileSync(path.join(root,local))];});for(const [url,bytes] of pending)cache.set(url,bytes);},
    async match(request,{ignoreSearch=false}={}){let url=typeof request==='string'?request:request.url;if(ignoreSearch)url=url.split('?')[0];return cache.get(url);}
  };},async keys(){return [...entries.keys()];},async delete(name){return entries.delete(name);}};
  const self=surface({registration:{scope},async skipWaiting(){skipped=true;},clients:{async claim(){claimed=true;}}});
  const sandbox={self,caches,URL,console,fetch(){network++;if(offline)throw Error('offline');return Buffer.from('network');}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),sandbox);
  async function lifecycle(name){let pending;self.dispatch(name,{waitUntil(p){pending=p;}});await pending;}
  await lifecycle('install');ok(skipped,'SW activates only after precache succeeds');
  const cache=[...entries].find(([name])=>name.startsWith('animals-click:'))[1];
  ok(cache.size===18,'18 precached routes/files');
  ok([...cache.keys()].filter(url=>url.endsWith('.webp')).length===10,'all ten images cached');
  await lifecycle('activate');ok(claimed && entries.has('speech-games:v1'),'SW claims clients and preserves other game caches');
  offline=true;
  async function request(url,mode='cors'){let result;self.dispatch('fetch',{request:{url,method:'GET',mode},respondWith(p){result=p;}});return result && await result;}
  for(const url of cache.keys())ok((await request(url)).length>0,'offline cache serves '+url.slice(scope.length));
  ok((await request(scope+'anything','navigate')).equals(fs.readFileSync(path.join(root,'index.html'))),'offline navigation fallback');
  ok((await request(scope+'app.js?v=1')).length>0,'cached asset query fallback');
  ok(await request('https://other.test/file')===undefined,'SW does not intercept external URLs');
  ok(await request('https://example.test/kids-games/speech-games/')===undefined,'SW does not intercept other games');
  ok(network===0,'cached/offline requests never call network');
  // Failed precache must prevent installation; never present a partial cache as ready.
  skipped=false; sandbox.caches={...caches,async open(){return {async addAll(){throw Error('missing asset');}};}};
  // Separate fresh worker context avoids const redeclaration and event sharing.
  const failSelf=surface({registration:{scope},skipWaiting(){skipped=true;}});
  vm.runInNewContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),{...sandbox,self:failSelf});
  let failed;failSelf.dispatch('install',{waitUntil(p){failed=p;}});
  await assert.rejects(failed,/missing asset/);ok(!skipped,'missing asset rejects installation');
}
(async()=>{await appTests();await swTests();console.log(`${passed} checks passed (simulated DOM/SW, not a browser).`);})().catch(error=>{console.error(error);process.exitCode=1;});
