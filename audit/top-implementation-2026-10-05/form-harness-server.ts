// Isolated browser QA: the actual settings route/repository and form use in-memory storage.
// No production environment, login, Storage request, or application authentication bypass.
import { createServer } from "node:http";
import { mock } from "node:test";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import { build } from "esbuild";

const root = resolve(__dirname, "../..");
const objects = new Map<string, string>();
const client = { storage: {
  getBucket: async () => ({ data: { id: "site-settings", public: false }, error: null }),
  from: (bucket: string) => ({
    download: async (path: string) => objects.has(`${bucket}/${path}`)
      ? { data: new Blob([objects.get(`${bucket}/${path}`)!]), error: null }
      : { data: null, error: { message: "Object not found" } },
    upload: async (path: string, payload: Buffer) => { objects.set(`${bucket}/${path}`, payload.toString("utf8")); return { error: null }; },
  }),
} };
mock.module("server-only", { defaultExport: {} });
mock.module(pathToFileURL(join(root, "lib/supabase/server.ts")), { namedExports: { getSupabaseAdminClient: () => client, getSupabaseReadClient: () => client } });
mock.module(pathToFileURL(join(root, "lib/supabase/auth-server.ts")), { namedExports: { getAdminAccess: async () => ({ ok: true, user: { id: "local-qa" } }) } });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

async function main() {
  const route = await import(pathToFileURL(join(root, "app/api/admin/homepage-settings/route.ts")).href);
  const repository = await import(pathToFileURL(join(root, "lib/homepage-settings.ts")).href);
  const bundle = await build({ entryPoints: [join(__dirname, "form-harness.tsx")], bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", alias: { "next/link": join(__dirname, "link-shim.tsx") }, define: { "process.env.NODE_ENV": '"production"' } });
  const cssDir = join(root, ".next/static/css");
  const css = (await Promise.all((await readdir(cssDir)).filter((file) => file.endsWith(".css")).map((file) => readFile(join(cssDir, file), "utf8")))).join("\n");
  createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url!, "http://127.0.0.1:3100").pathname;
      response.setHeader("Cache-Control", "no-store");
      if (pathname === "/form.js") { response.setHeader("Content-Type", "application/javascript"); response.end(bundle.outputFiles[0].contents); return; }
      if (pathname === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); return; }
      if (pathname.startsWith("/_next/static/media/")) {
        const name = pathname.split("/").at(-1)!;
        if (!/^[\w.-]+$/.test(name)) { response.statusCode = 400; response.end(); return; }
        response.setHeader("Content-Type", "font/woff2"); response.end(await readFile(join(root, ".next/static/media", name))); return;
      }
      if (pathname === "/api/admin/homepage-settings") {
        const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
        const result = request.method === "PUT" ? await route.PUT(new Request("http://127.0.0.1:3100/api/admin/homepage-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: Buffer.concat(chunks).toString("utf8") })) : await route.GET();
        response.statusCode = result.status; response.setHeader("Content-Type", "application/json"); response.end(await result.text()); return;
      }
      const settings = await repository.getHomepageSettings();
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>TOPページ設定 ローカルQA</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script id="settings" type="application/json">${JSON.stringify(settings.guideCards).replaceAll("<", "\\u003c")}</script><script src="/form.js"></script></body></html>`);
    } catch { response.statusCode = 500; response.end("Local QA error"); }
  }).listen(3100, "127.0.0.1", () => process.stdout.write("Isolated form QA ready: http://127.0.0.1:3100/admin/homepage\n"));
}
void main();
