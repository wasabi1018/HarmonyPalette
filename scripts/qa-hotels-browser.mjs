import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";
const root = process.cwd();
const evidence = root + "/audit/hotels-2026-11-24";
await mkdir(evidence, { recursive: true });
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=45452",
    `--user-data-dir=${root}/.tmp/hotel-browser-qa`,
    "--window-size=1280,1000",
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let target;
for (let i = 0; i < 40; i++) {
  try {
    target = await (
      await fetch("http://127.0.0.1:45452/json/new?about:blank", {
        method: "PUT",
      })
    ).json();
    break;
  } catch {
    await pause(200);
  }
}
if (!target) throw new Error("Local Chrome did not start");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let seq = 0;
const pending = new Map();
const errors = [];
const consoleMessages = [];
const checks = [];
function call(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id) {
    const p = pending.get(data.id);
    if (p) {
      pending.delete(data.id);
      if (data.error) p.reject(new Error(data.error.message));
      else p.resolve(data.result);
    }
  } else if (data.method === "Page.javascriptDialogOpening")
    void call("Page.handleJavaScriptDialog", { accept: true });
  else if (data.method === "Runtime.exceptionThrown")
    errors.push(
      data.params.exceptionDetails.text +
        ": " +
        (data.params.exceptionDetails.exception?.description || ""),
    );
  else if (data.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(data.params.type)) consoleMessages.push({ type: data.params.type, text: data.params.args.map(a => a.value ?? a.description ?? "").join(" ") });
});
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text,
    );
  return result.result?.value;
}
async function waitFor(expression, timeout = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await pause(150);
  }
  throw new Error("Timed out: " + expression);
}
async function navigate(path) {
  assert.ok(path.startsWith("/"));
  await call("Page.navigate", { url: "http://127.0.0.1:3099" + path });
  const expected = path.startsWith("/admin/login")
    ? "(location.pathname==='/admin/login'||location.pathname==='/admin/hotels')"
    : `location.pathname===${JSON.stringify(path.split("?")[0])}`;
  await waitFor(
    `${expected} && document.readyState === 'complete' && !!document.querySelector('h1')`,
  );
  await pause(700);
}
async function click(text) {
  const result = await evaluate(
    `(() => {const el=[...document.querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)} && e.getClientRects().length);if(!el)return false;el.click();return true})()`,
  );
  assert.ok(result, "Control exists: " + text);
  await pause(200);
}
async function field(label, value) {
  const result = await evaluate(
    `(() => {const label=[...document.querySelectorAll('label')].find(e=>e.textContent.trim().startsWith(${JSON.stringify(label)}));const el=label?.querySelector('input,textarea,select');if(!el)return false;const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(String(value))});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`,
  );
  assert.ok(result, "Field exists: " + label);
  await pause(100);
}
async function size(width, height = 900) {
  await call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await pause(250);
}
async function screenshot(name, full = true) {
  await pause(450);
  const metrics = await call("Page.getLayoutMetrics");
  const width = await evaluate("innerWidth");
  const height = Math.ceil(metrics.cssContentSize.height);
  const result = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: full,
    ...(full ? { clip: { x: 0, y: 0, width, height, scale: 1 } } : {}),
  });
  await writeFile(evidence + "/" + name, Buffer.from(result.data, "base64"));
  console.log("Screenshot:", name);
}
async function check(name, expression) {
  const value = await evaluate(expression);
  assert.ok(value, name + ": " + JSON.stringify(value));
  checks.push({ name, passed: true });
  console.log("Passed:", name);
}
try {
  await call("Page.enable");
  await call("Runtime.enable");
  await size(1280, 900);
  if (process.argv.includes("--console-only")) {
    for (const path of ["/hotels", "/hotels/grand-mercure-beppu-bay", "/admin/hotels"]) await navigate(path);
    await pause(1500);
    await writeFile(evidence + "/console-results.json", JSON.stringify({ localOnly: true, consoleMessages, errors }, null, 2));
    console.log(JSON.stringify({ consoleMessages, errors }));
    assert.deepEqual(errors, []); assert.deepEqual(consoleMessages, []);
    await call("Browser.close").catch(() => {}); socket.close(); chrome.kill(); process.exit(0);
  }
  await navigate("/admin/login?next=/admin/hotels");
  if ((await evaluate("location.pathname")) === "/admin/login") {
    await field("メールアドレス", "qa@example.test");
    await field("パスワード", "local-hotel-qa");
    await click("管理画面にログイン");
  }
  await waitFor(
    "location.pathname==='/admin/hotels' && document.body.innerText.includes('fico HIJI')",
  );
  await evaluate(
    `(async()=>{const {catalog}=await(await fetch('/api/admin/hotels')).json();for(const h of catalog.hotels.filter(h=>h.slug.startsWith('local-qa-only')&&!h.deletedAt))await fetch('/api/admin/hotels',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',id:h.id,updatedAt:h.updatedAt})})})()`,
  );
  await navigate("/admin/hotels");
  await click("編集");
  await waitFor("document.body.innerText.includes('ホテルURL（slug）')");
  // Save an unchanged hotel through the real admin route, invalidating the public cache.
  await click("保存する");
  await waitFor("document.body.innerText.includes('保存しました。')");
  await screenshot("06-admin-editor-desktop.png");
  await click("ホテル一覧へ");
  await screenshot("05-admin-list-desktop.png");
  await navigate("/hotels");
  await waitFor("document.querySelectorAll('[data-hotel]').length===6");
  await check(
    "six hotels rendered from isolated database",
    "document.querySelectorAll('[data-hotel]').length===6",
  );
  await check(
    "unknown travel times displayed honestly",
    "document.body.innerText.includes('所要時間未確認')",
  );
  await check(
    "booking links sponsored",
    "[...document.querySelectorAll('a[href*=\"hb.afl.rakuten.co.jp\"]')].every(a=>a.rel.includes('sponsored'))",
  );
  await waitFor(
    "[...document.querySelectorAll('img')].every(i=>i.complete)",
    20000,
  );
  await screenshot("01-hotels-desktop.png");
  await size(390, 844);
  await screenshot("02-hotels-mobile.png");
  await evaluate(
    "window.scrollTo(0,document.querySelector('[data-hotel]').getBoundingClientRect().top+scrollY-80)",
  );
  await screenshot("09-hotels-mobile-cards.png", false);
  await evaluate("scrollTo(0,0)");
  await check(
    "390px layout has no horizontal overflow",
    "document.documentElement.scrollWidth<=innerWidth",
  );
  await click("温泉・大浴場あり");
  await click("子連れ・ファミリー向け");
  await check(
    "multiple filters use AND",
    "document.querySelectorAll('[data-hotel]').length===4",
  );
  await screenshot("07-hotels-filtered-mobile.png");
  await click("条件をクリア");
  await field("ホテルの並べ替え", "near");
  await check(
    "nearest hotel first",
    "document.querySelector('[data-hotel]').dataset.hotel==='fico-hiji'",
  );
  await check(
    "filters persist in fragment",
    "location.hash.includes('sort=near')",
  );
  await evaluate(`document.querySelector('details').open=true`);
  await click("別府市");
  await check(
    "area filter combines with sort",
    "[...document.querySelectorAll('[data-hotel]')].every(e=>['suginoi-hotel','kamenoi-hotel-beppu'].includes(e.dataset.hotel))",
  );
  await click("条件をクリア");
  await navigate("/hotels/grand-mercure-beppu-bay");
  await check(
    "detail has sourced travel time",
    "document.body.innerText.includes('車で約13分') && document.body.innerText.includes('所要時間の確認元')",
  );
  await check(
    "390px detail has no horizontal overflow",
    "document.documentElement.scrollWidth<=innerWidth",
  );
  await screenshot("04-hotel-detail-mobile.png");
  await size(1280, 900);
  await screenshot("03-hotel-detail-desktop.png");
  await size(320, 844);
  await navigate("/hotels");
  await check(
    "320px list has no horizontal overflow",
    "document.documentElement.scrollWidth<=innerWidth",
  );
  await navigate("/admin/hotels");
  await check(
    "320px admin has no page overflow",
    "document.documentElement.scrollWidth<=innerWidth",
  );
  await screenshot("08-admin-mobile.png");
  await size(1280, 900);
  await click("ホテルを登録");
  await field("ホテル名", "動作確認用の宿（ローカル検証）");
  await field("ホテルURL（slug）", "local-qa-only-" + Date.now());
  await click("保存する");
  await waitFor("document.body.innerText.includes('保存しました。')");
  await click("ホテル一覧へ");
  await check(
    "admin create saved and reloaded",
    "document.body.innerText.includes('動作確認用の宿（ローカル検証）')",
  );
  await evaluate(
    "[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='動作確認用の宿（ローカル検証）を削除').click()",
  );
  await waitFor(
    "!document.querySelector('table tbody')?.innerText.includes('動作確認用の宿（ローカル検証）')",
  );
  await field("ホテルの公開状態で絞り込む", "trash");
  await waitFor("document.body.innerText.includes('下書きへ復元')");
  await click("下書きへ復元");
  await waitFor("document.body.innerText.includes('保存しました。')");
  await field("ホテルの公開状態で絞り込む", "draft");
  await check(
    "delete and restore returns hotel to draft",
    "document.querySelector('tbody').innerText.includes('動作確認用の宿（ローカル検証）') && document.querySelector('tbody').innerText.includes('下書き')",
  );
  await click("編集");
  await click("写真");
  const fixture = root + "/.tmp/hotel-qa-pixel.png";
  await sharp({ create: { width: 32, height: 32, channels: 3, background: "#f9d5e3" } }).png().toFile(fixture);
  const fileInput = await call("Runtime.evaluate", {
    expression: "document.querySelector('input[type=file]')",
  });
  await call("DOM.setFileInputFiles", {
    files: [fixture],
    objectId: fileInput.result.objectId,
  });
  await waitFor("document.body.innerText.includes('写真を追加しました。')");
  await field("写真の提供元・クレジット", "ローカル検証専用");
  await field(
    "利用許諾・取得元の記録",
    "自動テストで作成した単色画像。実在ホテルの写真ではありません。",
  );
  await click("保存する");
  await waitFor("document.body.innerText.includes('保存しました。')");
  const privateImage = await evaluate(
    `(async()=>{const {catalog}=await(await fetch('/api/admin/hotels')).json();const h=catalog.hotels.find(h=>h.slug.startsWith('local-qa-only')&&!h.deletedAt);const p=h.images[0];const url='/api/hotels/'+h.id+'/images/'+p.id;return {public:(await fetch(url)).status,preview:(await fetch(url+'?preview=1')).status,id:h.id,updatedAt:h.updatedAt}})()`,
  );
  assert.equal(privateImage.public, 404);
  assert.equal(privateImage.preview, 200);
  checks.push({
    name: "uploaded draft photo stays private; authenticated preview works",
    passed: true,
  });
  await evaluate(
    `(async()=>{const {catalog}=await(await fetch('/api/admin/hotels')).json();const h=catalog.hotels.find(h=>h.id===${JSON.stringify(privateImage.id)});await fetch('/api/admin/hotels',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'delete',id:h.id,updatedAt:h.updatedAt})})})()`,
  );
  await evaluate(
    `(async()=>{const {catalog}=await(await fetch('/api/admin/hotels')).json();const h=catalog.hotels.find(h=>h.slug==='grand-mercure-beppu-bay');const response=await fetch('/api/admin/hotels',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save',hotel:{...h,prEnabled:true,prStartsAt:new Date(Date.now()-60000).toISOString(),prEndsAt:new Date(Date.now()+15000).toISOString(),disclosure:'ローカル動作確認用のPR表示です。実際の広告契約ではありません。'}})});if(!response.ok)throw new Error(await response.text())})()`,
  );
  await navigate("/hotels");
  await waitFor("document.body.innerText.includes('PR掲載ホテル')");
  await check(
    "paid PR has a separate labelled placement",
    "document.querySelectorAll('[data-hotel]').length===7 && document.body.innerText.includes('広告契約に基づく掲載')",
  );
  await screenshot("10-hotels-pr-desktop.png");
  await waitFor("!document.body.innerText.includes('PR掲載ホテル')", 22000);
  await check(
    "PR priority automatically expires without page reload",
    "document.querySelectorAll('[data-hotel]').length===6",
  );
  await evaluate(
    `(async()=>{const {catalog}=await(await fetch('/api/admin/hotels')).json();const h=catalog.hotels.find(h=>h.slug==='grand-mercure-beppu-bay');await fetch('/api/admin/hotels',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save',hotel:{...h,prEnabled:false,prStartsAt:null,prEndsAt:null,disclosure:''}})})})()`,
  );
  await check(
    "same-origin hotel metrics batch reaches existing API",
    `(async()=>{const response=await fetch('/api/analytics/event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({hotelEvents:[{event:'hotel_list_view',hotelId:'',provider:'',source:'home',placement:'list'}]})});return response.status===204})()`,
  );
  await navigate("/admin/hotels");
  await click("アクセス・クリック");
  await screenshot("11-admin-analytics-desktop.png");
  for (const [path, source] of [
    ["/", "home"],
    ["/crowd-forecast", "crowd"],
    ["/plan", "plan"],
  ]) {
    await navigate(path);
    await check(
      "hotel guide entry on " + path,
      `!!document.querySelector('a[data-hotel-source="${source}"]')`,
    );
    await evaluate(`document.querySelector('a[data-hotel-source="${source}"]').click()`);
    await waitFor("location.pathname==='/hotels'");
    await check("SPA navigation retains source " + source, `sessionStorage.getItem('hp:hotel-source')===${JSON.stringify(source)}`);
  }
  await check("no application JavaScript exceptions", "true");
  assert.deepEqual(errors, []);
  await writeFile(
    evidence + "/browser-results.json",
    JSON.stringify(
      {
        localOnly: true,
        app: "http://127.0.0.1:3099",
        viewports: [1280, 390, 320],
        checks,
        errors,
      },
      null,
      2,
    ),
  );
  console.log("Hotel browser QA completed.");
} catch (error) {
  console.error(
    "Browser state:",
    await evaluate("document.body.innerText.slice(0,4000)").catch(
      () => "unavailable",
    ),
  );
  await screenshot("failure.png").catch(() => {});
  throw error;
} finally {
  await call("Browser.close").catch(() => {});
  socket.close();
  chrome.kill();
}
