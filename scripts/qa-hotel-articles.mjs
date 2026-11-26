import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = process.cwd();
const evidence = root + "/audit/hotel-articles-2026-11-25";
await mkdir(evidence, { recursive: true });
const chrome = spawn(
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=45456",
    `--user-data-dir=${root}/.tmp/hotel-articles-browser`,
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
      await fetch("http://127.0.0.1:45456/json/new?about:blank", {
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
  // A same-path URL with a fragment can be a same-document navigation in Chrome.
  if (await evaluate(`location.pathname===${JSON.stringify(path.split(/[?#]/)[0])}`)) {
    await call("Page.navigate", { url: "about:blank" });
    await waitFor("location.href==='about:blank'");
  }
  await call("Page.navigate", { url: "http://127.0.0.1:3099" + path });
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

const articleId = "8aff0000-0000-4000-8000-000000000011";
const draftId = "8aff0000-0000-4000-8000-000000000012";
const scheduledId = "8aff0000-0000-4000-8000-000000000013";
async function updateArticle(id, status, publishedAt) {
  const result = await evaluate(`(async()=>{
    const response=await fetch('/api/admin/articles/${id}');
    const {article}=await response.json();
    if(!article)throw Error('Local fixture article missing');
    const result=await fetch('/api/admin/articles/${id}',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({...article,tagIds:article.tags.map(t=>t.id),seriesId:null,seriesOrder:null,status:${JSON.stringify(status)},publishedAt:${JSON.stringify(publishedAt)}})});
    return {status:result.status,body:await result.json()};
  })()`);
  assert.equal(result.status, 200, JSON.stringify(result));
  const expected = status === "published" && Date.parse(publishedAt) > Date.now() ? "scheduled" : status;
  assert.equal(result.body.article?.status, expected, JSON.stringify(result));
}
async function login() {
  await navigate("/admin/login?next=/admin/hotels");
  if(await evaluate("location.pathname==='/admin/login'")) {
    await field("メールアドレス","qa@example.test");
    await field("パスワード","local-hotel-qa");
    await click("管理画面にログイン");
  }
  await waitFor("location.pathname==='/admin/hotels'&&document.body.innerText.includes('fico HIJI')");
}
async function resetFixtures() {
  await login();
  await updateArticle(articleId,"published","2026-11-24T00:00:00Z");
  await updateArticle(draftId,"draft",null);
  await updateArticle(scheduledId,"scheduled","2035-01-01T00:00:00Z");
  const result=await evaluate(`(async()=>{
    const {catalog}=await(await fetch('/api/admin/hotels')).json();
    const hotel=catalog.hotels.find(h=>h.slug==='grand-mercure-beppu-bay');
    const response=await fetch('/api/admin/hotels',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save',hotel:{...hotel,articleId:${JSON.stringify(draftId)}}})});
    return {status:response.status,body:await response.json()};
  })()`);
  assert.equal(result.status,200,JSON.stringify(result));
}
async function legacyRedirect(slug, expected) {
  const response = await fetch(`http://127.0.0.1:3099/hotels/${slug}`, {redirect:"manual"});
  assert.ok(response.status>=300&&response.status<400);
  assert.equal(response.headers.get("location"),expected);
  assert.equal(response.headers.get("x-robots-tag"),"noindex");
  checks.push({name:`legacy URL redirects: ${slug}`,passed:true});
}
try {
  await call("Page.enable");
  await call("Runtime.enable");
  await size(390,845);
  await resetFixtures();
  await navigate("/hotels#sort=near");
  await waitFor("document.querySelectorAll('[data-hotel]').length===6");
  await waitFor("[...document.querySelectorAll('[data-hotel] img')].every(i=>i.complete&&i.naturalWidth>0)");
  await check("no standalone detail links", "![...document.querySelectorAll('a[href]')].some(a=>/^\\/hotels\\//.test(a.getAttribute('href')))&&!document.body.innerText.includes('詳細を見る')");
  await check("only the published article gets a button", "[...document.querySelectorAll('[data-hotel] a')].filter(a=>a.textContent.trim()==='記事を見る').length===1&&!!document.querySelector('[data-hotel=fico-hiji] a[href=\"/articles/local-hotel-article-1\"]')");
  await check("draft, scheduled, deleted and unset articles have no link", "['grand-mercure-beppu-bay','grandvrio-beppuwan-wakura','kamenoi-hotel-beppu','suginoi-hotel'].every(slug=>!document.querySelector('[data-hotel='+slug+'] h3 a'))");
  await check("no unpublished article metadata in public page", "![2,3,4].some(n=>document.documentElement.innerHTML.includes('local-hotel-article-'+n))");
  await check("booking buttons remain available", "[...document.querySelectorAll('[data-hotel] a')].filter(a=>a.innerText.includes('料金・空室')).length===6");
  await check("unlinked booking button fills row", "(()=>{const row=document.querySelector('[data-hotel=grand-mercure-beppu-bay] [data-has-article=false]');return row.querySelector('a').getBoundingClientRect().width>=row.getBoundingClientRect().width-1})()");
  await check("390px no overflow", "document.documentElement.scrollWidth<=innerWidth");
  await screenshot("01-mobile.png",false);
  await screenshot("02-mobile-full.png");
  const sitemap=await(await fetch("http://127.0.0.1:3099/sitemap.xml")).text();
  assert.ok(sitemap.includes("/hotels</loc>")&&!sitemap.includes("/hotels/"));
  checks.push({name:"sitemap has catalog only, no hotel detail URLs",passed:true});
  await legacyRedirect("fico-hiji","/articles/local-hotel-article-1");
  await legacyRedirect("grand-mercure-beppu-bay","/hotels#hotel-grand-mercure-beppu-bay");
  await evaluate("document.querySelector('[data-hotel=fico-hiji] h3 a').click()");
  await waitFor("location.pathname==='/articles/local-hotel-article-1'&&document.body.innerText.includes('ローカル検証専用ホテル記事 1')");
  await screenshot("03-linked-article.png",false);
  await login();
  await click("編集");
  await waitFor("document.body.innerText.includes('「記事を見る」のリンク先')");
  await check("admin can select draft article", `document.querySelector('select option[value="${draftId}"]').textContent.includes('下書き')`);
  await evaluate(`document.querySelector('select:has(option[value="${draftId}"])').scrollIntoView({block:'center'})`);
  await screenshot("04-admin-article-picker.png",false);
  await field("「記事を見る」のリンク先",articleId);
  await click("保存する");
  await waitFor("document.body.innerText.includes('保存しました。')");
  await navigate("/hotels#sort=near");
  await check("saved article association reaches public catalog", "!!document.querySelector('[data-hotel=grand-mercure-beppu-bay] h3 a[href=\"/articles/local-hotel-article-1\"]')");
  await updateArticle(articleId,"draft",null);
  await navigate("/hotels#sort=near");
  await check("returning article to draft removes every linked button", "!document.querySelector('[data-hotel] a[href^=\"/articles/\"]')");
  await screenshot("05-no-article-buttons.png",false);
  await legacyRedirect("fico-hiji","/hotels#hotel-fico-hiji");
  await updateArticle(articleId,"published","2026-11-24T00:00:00Z");
  await navigate("/hotels#sort=near");
  await check("republishing restores article buttons", "[...document.querySelectorAll('[data-hotel] a')].filter(a=>a.innerText.trim()==='記事を見る').length===2");
  await updateArticle(scheduledId,"published","2035-01-01T00:00:00Z");
  await navigate("/hotels#sort=near");
  await check("future publication stays hidden", "!document.querySelector('[data-hotel=grandvrio-beppuwan-wakura] h3 a')");
  await updateArticle(scheduledId,"scheduled","2035-01-01T00:00:00Z");
  await navigate("/admin/hotels");
  await click("編集");
  await field("「記事を見る」のリンク先",draftId);
  await click("保存する");
  await waitFor("document.body.innerText.includes('保存しました。')");
  await check("no obsolete hotel detail indexing control", "!document.body.innerText.includes('検索エンジンの索引対象にする')");
  await check("nonexistent article cannot be saved", `(async()=>{
    const {catalog}=await(await fetch('/api/admin/hotels')).json();
    const hotel=catalog.hotels.find(h=>h.slug==='grand-mercure-beppu-bay');
    const response=await fetch('/api/admin/hotels',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save',hotel:{...hotel,articleId:'8aff0000-0000-4000-8000-000000000099'}})});
    return response.status===400;
  })()`);
  await navigate("/hotels#sort=near");
  await size(320,845);
  await check("320px no overflow", "document.documentElement.scrollWidth<=innerWidth");
  await screenshot("06-mobile-320.png",false);
  await size(1280,900);
  await check("1280px no overflow", "document.documentElement.scrollWidth<=innerWidth");
  await screenshot("07-desktop.png",false);
  await screenshot("08-desktop-full.png");
  // A very short fixture article exposes the existing footer logo above the fold.
  // Record that development-only Next image hint rather than changing production footer loading.
  // Current master also loads the existing AdSense component on the fixture article.
  // Preserve its known Next Script attribute warning in the report; fail on other messages.
  const expectedWarnings=consoleMessages.filter(message=>message.type==='warning'&&(
    message.text.startsWith('Image with src "/logo-compact.png" was detected as the Largest Contentful Paint')||
    message.text==="AdSense head tag doesn't support data-nscript attribute."
  ));
  const unexpected=consoleMessages.filter(message=>!expectedWarnings.includes(message));
  await writeFile(evidence+"/browser-results.json",JSON.stringify({localOnly:true,checks,errors,consoleMessages,expectedWarnings},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(unexpected,[]);
  console.log("Hotel article QA passed: "+checks.length+" checks");
} catch(error) {
  console.error("Local UI:",await evaluate("document.body.innerText.slice(0,1200)").catch(()=>"unavailable"));
  await screenshot("failure.png",false).catch(()=>{});
  throw error;
} finally {
  await call("Browser.close").catch(()=>{});
  socket.close();
  chrome.kill();
}
