// Local-only services with fictional credentials. Normal app authentication stays enabled.
import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixturePort = 4308, appPort = 3108;
const email = "rakuten-qa@example.test";
const user = { id: "11111111-1111-4111-8111-111111111111", email, aud: "authenticated", role: "authenticated", app_metadata: { role: "admin", provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })}`;
const token = `${unsigned}.${createHmac("sha256", "local-qa-only").update(unsigned).digest("base64url")}`;
const files = new Map();
let bucketExists = false, uploads = 0, apiCalls = 0;
const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${fixturePort}`);
  response.setHeader("Access-Control-Allow-Origin", `http://localhost:${appPort}`);
  response.setHeader("Access-Control-Allow-Headers", "authorization,apikey,content-type,x-client-info,x-supabase-api-version");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  if (request.method === "OPTIONS") { response.writeHead(204).end(); return; }
  const json = (data, status = 200) => { response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(data)); };
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  if (url.pathname === "/_qa/state") return json({ uploads, apiCalls, stored: files.size > 0, privateBucket: bucketExists });
  if (url.pathname === "/rakuten") {
    apiCalls++;
    if (request.headers.accesskey === "fixture-denied") return json({ error: "fixture-rejection" }, 403);
    return json({ items: [{ itemName: "接続確認用タオル（ローカル検証データ）", affiliateUrl: "https://hb.afl.rakuten.co.jp/fixture" }] });
  }
  if (url.pathname === "/auth/v1/token") {
    const credentials = JSON.parse(body.toString() || "{}");
    if (credentials.email !== email || credentials.password !== "fixture-only") return json({ message: "Invalid QA credentials" }, 400);
    return json({ access_token: token, token_type: "bearer", refresh_token: "qa-refresh", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user });
  }
  if (url.pathname === "/auth/v1/user") return request.headers.authorization === `Bearer ${token}` ? json(user) : json({ message: "Not authenticated" }, 401);
  if (url.pathname.startsWith("/storage/v1/")) {
    if (request.headers.apikey !== "qa-secret-key") return json({ message: "Forbidden" }, 403);
    if (url.pathname === "/storage/v1/bucket" && request.method === "POST") {
      const options = JSON.parse(body.toString());
      if (options.id !== "integration-secrets" || options.public !== false) return json({ message: "Unexpected bucket" }, 400);
      bucketExists = true; return json({ name: options.id });
    }
    if (url.pathname === "/storage/v1/bucket/integration-secrets") return bucketExists ? json({ id: "integration-secrets", name: "integration-secrets", public: false }) : json({ message: "Bucket not found", statusCode: "404" }, 404);
    if (url.pathname.startsWith("/storage/v1/object/")) {
      const path = url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/|public\/)?/, "");
      if (request.method === "GET") {
        if (!files.has(path)) return json({ message: "Object not found", statusCode: "404" }, 404);
        response.writeHead(200, { "Content-Type": "application/json" }).end(files.get(path)); return;
      }
      files.set(path, body); uploads++; return json({ Key: path });
    }
  }
  if (url.pathname.startsWith("/rest/v1/")) return json([]);
  return json({ message: "Unknown fixture endpoint" }, 404);
});
server.listen(fixturePort, "127.0.0.1", () => {
  const preloader = fileURLToPath(new URL("./rakuten-api-fixture.cjs", import.meta.url)).replaceAll("\\", "/");
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fixturePort}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "qa-public-key", NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-public-key", SUPABASE_SECRET_KEY: "qa-secret-key", SUPABASE_SERVICE_ROLE_KEY: "qa-secret-key", NEXT_PUBLIC_SITE_URL: `http://localhost:${appPort}`, ADMIN_EMAILS: email, RAKUTEN_QA_FIXTURE_URL: `http://127.0.0.1:${fixturePort}`, NODE_OPTIONS: `--require="${preloader}"` };
  console.log(`Local QA: http://localhost:${appPort}/admin/rakuten`);
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(appPort), "-H", "localhost"], { env, stdio: "inherit" });
  const stop = () => { child.kill(); server.close(); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop); child.on("exit", () => server.close());
});
