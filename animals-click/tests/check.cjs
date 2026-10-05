// Development-only browser checks. Requires Playwright; no runtime dependencies.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const root = path.resolve(__dirname, '../..');
const output = process.env.ANIMALS_TEST_OUTPUT || '/tmp/animals-click-check';
const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webmanifest':'application/manifest+json', '.png':'image/png', '.webp':'image/webp' };
const server = http.createServer((req,res) => {
  let file = path.join(root, decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (file.endsWith(path.sep)) file += 'index.html';
  try { res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' }); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
(async () => {
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}/animals-click/`;
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  const context = await browser.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true });
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  const popups=[]; context.on('page',p=>{ if(p!==page) popups.push(p.url()); });
  await page.clock.install();
  await page.goto(base);
  await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('img').complete);
  const cdp=await context.newCDPSession(page);
  const current=()=>page.locator('#animal').getAttribute('src');
  const check=(value,message)=>{assert(value,message); console.log('PASS',message);};
  const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([x,y,id=1])=>({x,y,id}))});
  async function gesture(dx,dy=0,duration=200) {
    await touch('touchStart',[[250,400]]);
    await page.clock.runFor(duration);
    await touch('touchMove',[[250+dx,400+dy]]);
    await touch('touchEnd',[]);
    await page.waitForTimeout(30);
  }
  async function expectSlide(name) { await page.waitForFunction(name=>document.querySelector('#animal').getAttribute('src').includes(name),name); }
  check((await current()).includes('01-arich'),'first photograph');
  check(await page.locator('body').innerText()==='','no visible text');
  check(await page.locator('button,a,input').count()===0,'no controls or links');
  const manifest=await page.evaluate(async()=> (await fetch('./manifest.webmanifest')).json());
  check(manifest.display==='standalone' && manifest.orientation==='portrait' && manifest.start_url==='./' && manifest.scope==='./','isolated standalone portrait manifest');
  const cached=await page.evaluate(async()=>{
    const keys=await caches.keys(); const key=keys.find(k=>k.startsWith('animals-click:'));
    return (await (await caches.open(key)).keys()).map(r=>r.url);
  });
  check(cached.length===18 && cached.filter(u=>u.endsWith('.webp')).length===10,'all app assets and ten images cached');
  const install=await cdp.send('Page.getInstallabilityErrors');
  check(install.installabilityErrors.length===0,'Chromium installability checks');
  await gesture(0); check((await current()).includes('01-arich'),'tap does nothing');
  await gesture(12,4); check((await current()).includes('01-arich'),'short movement ignored');
  await gesture(5,160); check((await current()).includes('01-arich'),'vertical gesture ignored');
  await gesture(100,90); check((await current()).includes('01-arich'),'diagonal gesture ignored');
  await gesture(-140,0,1100); check((await current()).includes('01-arich'),'hold then drag ignored');
  await touch('touchStart',[[240,400,1],[290,400,2]]); await page.clock.runFor(200);
  await touch('touchMove',[[100,400,1],[150,400,2]]); await touch('touchEnd',[]);
  check((await current()).includes('01-arich'),'multitouch ignored');
  await gesture(-140); await expectSlide('02-kitten'); console.log('PASS left swipe');
  await gesture(-140); check((await current()).includes('02-kitten'),'rapid repeat suppressed');
  await page.clock.runFor(400); await gesture(140); await expectSlide('01-arich'); console.log('PASS right swipe');
  await page.clock.runFor(400); await gesture(140); await expectSlide('10-hedgehog'); console.log('PASS first to last wrap');
  await page.clock.runFor(400); await gesture(-140); await expectSlide('01-arich'); console.log('PASS last to first wrap');
  // Exact 30-second timer, including a tap just before expiration.
  await page.reload(); await page.waitForFunction(()=>document.querySelector('img').complete);
  await page.clock.runFor(29000); await gesture(0,0,150);
  check((await current()).includes('01-arich'),'no automatic transition before 30 seconds');
  await page.clock.runFor(1000); await expectSlide('02-kitten'); console.log('PASS 30-second transition; tap does not reset timer');
  await page.clock.runFor(29000); await gesture(-140); await expectSlide('03-corgi');
  await page.clock.runFor(1000); check((await current()).includes('03-corgi'),'manual swipe resets timer');
  await page.clock.runFor(29000); await expectSlide('04-rabbit'); console.log('PASS new 30-second countdown after manual swipe');
  await page.clock.runFor(30000); await expectSlide('05-calf'); console.log('PASS automatic transition resets timer');
  // Visibility event follows the browser's actual document.hidden state in production.
  await page.evaluate(()=>{ Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(180000); check((await current()).includes('05-calf'),'timer paused in background');
  await page.evaluate(()=>{ Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(29000); check((await current()).includes('05-calf'),'no return-from-background cascade');
  await page.clock.runFor(1000); await expectSlide('06-goat'); console.log('PASS fresh countdown on return');
  const attempts=[]; page.on('request',r=>attempts.push(r.url()));
  await context.setOffline(true);
  await page.reload(); await page.waitForFunction(()=>document.querySelector('img').complete && document.querySelector('img').naturalWidth>0);
  for(let i=0;i<10;i++) {
    await page.clock.runFor(400); await gesture(-140);
    await page.waitForFunction(()=>document.querySelector('img').complete && document.querySelector('img').naturalWidth>0);
  }
  check((await current()).includes('01-arich'),'complete ten-image cycle offline after reload');
  await page.goto(base+'offline-fallback'); await page.waitForFunction(()=>document.querySelector('img').naturalWidth>0);
  check((await current()).includes('01-arich'),'offline navigation fallback');
  check(attempts.every(u=>u.startsWith(base)),'no external requests');
  // Capture all crops on a tall phone; inspection checks limbs and composition.
  await page.goto(base);
  for(let i=0;i<10;i++) {
    await page.waitForFunction(()=>document.querySelector('img').complete && document.querySelector('img').naturalWidth>0);
    await page.clock.runFor(400);
    await page.screenshot({path:path.join(output,`phone-${i+1}.png`)});
    await gesture(-140);
  }
  for(const [width,height] of [[360,800],[430,932],[768,1024]]) {
    await page.setViewportSize({width,height});
    const dimensions=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,fit:getComputedStyle(document.querySelector('img')).objectFit}));
    check(dimensions.sw===dimensions.w && dimensions.sh===dimensions.h && dimensions.fit==='cover',`no overflow; cover ${width}x${height}`);
  }
  check(popups.length===0,'no windows or tabs opened');
  check(errors.length===0,'no browser JS errors');
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({errors,popups,cached,installability:install,offline:true,androidPhysicalDevice:'NOT TESTED'},null,2));
  await browser.close(); server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1);});
