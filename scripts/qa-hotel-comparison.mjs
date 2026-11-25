import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = process.cwd();
const evidence = root + "/audit/hotels-comparison-2026-11-25";
await mkdir(evidence, { recursive: true });
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=45455",
    `--user-data-dir=${root}/.tmp/hotel-comparison-browser`,
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
      await fetch("http://127.0.0.1:45455/json/new?about:blank", {
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
  await call("Page.navigate", { url: "http://127.0.0.1:3100" + path });
  const expected = path.startsWith("/admin/login")
    ? "(location.pathname==='/admin/login'||location.pathname==='/admin/hotels')"
    : `location.pathname===${JSON.stringify(path.split(/[?#]/)[0])}`;
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
async function size(width, height = 900) {
  await call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 700,
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
  await size(390, 845);
  await navigate("/hotels#sort=near");
  await waitFor("document.querySelectorAll('[data-hotel]').length===6");
  await waitFor("[...document.querySelectorAll('[data-hotel] img')].every(i=>i.complete&&i.naturalWidth>0)");
  await check("near sort restored", "document.querySelector('[data-hotel]').dataset.hotel==='fico-hiji'");
  await check("no mobile overflow", "document.documentElement.scrollWidth<=innerWidth");
  await check("booking attributes preserved", "[...document.querySelectorAll('[data-hotel] a[target]')].every(a=>['sponsored','noopener','noreferrer'].every(v=>a.rel.split(' ').includes(v)))");
  await check("booking touch targets", "[...document.querySelectorAll('[data-hotel] a[target]')].filter(a=>a.innerText.includes('料金・空室')).every(a=>a.getBoundingClientRect().height>=44)");
  await screenshot("01-mobile-390.png", false);
  await screenshot("02-mobile-full.png");
  await click("条件");
  await check("all conditions open", "!document.querySelector('#hotel-all-conditions').hidden");
  await screenshot("03-conditions-mobile.png", false);
  await click("条件を閉じる");
  await check("focus restored on close", "document.querySelector('#hotel-all-conditions').hidden&&document.activeElement.textContent.trim()==='条件'");
  await click("パークに近い");
  await check("three verified nearby hotels", "document.querySelectorAll('[data-hotel]').length===3");
  await click("子連れ");
  await check("multiple tags AND", "document.querySelectorAll('[data-hotel]').length===2");
  await screenshot("04-filtered-mobile.png", false);
  await click("条件をクリア");
  await click("エリア：すべて");
  await click("別府市");
  await check("area filter", "document.querySelectorAll('[data-hotel]').length===2");
  await click("日出町");
  await check("multiple areas OR", "document.querySelectorAll('[data-hotel]').length===6");
  await click("すべて");
  await click("エリア：すべて");
  await click("条件");
  await click("リーズナブル");
  await check("empty result recovery", "document.querySelectorAll('[data-hotel]').length===0&&document.body.innerText.includes('条件に合うホテルが見つかりませんでした。')");
  await click("条件をクリア");
  await click("条件を閉じる");
  await check("sort preserved on clear", "document.querySelector('[data-hotel]').dataset.hotel==='fico-hiji'");
  await evaluate("document.querySelector('details summary').click()");
  await check("editorial recommendations expand", "document.querySelector('details').open");
  await screenshot("05-editorial-picks.png", false);
  await navigate("/hotels#sort=near");
  await size(320, 845);
  await check("320px no overflow", "document.documentElement.scrollWidth<=innerWidth");
  await screenshot("06-mobile-320.png", false);
  await click("パークに近い");
  await click("子連れ");
  await click("温泉");
  await check("selected chips fit at 320px", "document.documentElement.scrollWidth<=innerWidth");
  await navigate("/hotels#sort=near");
  await size(768, 1024);
  await check("tablet no overflow", "document.documentElement.scrollWidth<=innerWidth");
  await screenshot("07-tablet.png", false);
  await size(1280, 900);
  await check("desktop no overflow", "document.documentElement.scrollWidth<=innerWidth");
  await screenshot("08-desktop.png", false);
  await screenshot("09-desktop-full.png");
  await evaluate("document.querySelector('[data-hotel] h3 a').click()");
  await waitFor("location.pathname==='/hotels/fico-hiji'&&document.body.innerText.includes('子ども')");
  await screenshot("10-detail-desktop.png", false);
  await size(390, 845);
  await check("detail fits mobile", "document.documentElement.scrollWidth<=innerWidth");
  await screenshot("11-detail-mobile.png", false);
  await check("catalog styling does not leak to detail", "getComputedStyle(document.body).backgroundColor==='rgb(255, 251, 253)'");
  await navigate("/hotels#sort=near");
  await size(390, 845);
  await screenshot("12-final-mobile.png", false);
  const metrics=await evaluate("({width:innerWidth,height:innerHeight,rows:[...document.querySelectorAll('[data-hotel]')].slice(0,3).map(e=>{const r=e.getBoundingClientRect();return{hotel:e.dataset.hotel,y:r.y,height:r.height}})})");
  await writeFile(evidence+"/browser-results.json",JSON.stringify({localOnly:true,checks,errors,consoleMessages,metrics},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(consoleMessages,[]);
  console.log("Comparison browser checks passed: "+checks.length);
} catch(error) {
  await screenshot("failure.png",false).catch(()=>{});
  throw error;
} finally {
  await call("Browser.close").catch(()=>{});
  socket.close();
  chrome.kill();
}
