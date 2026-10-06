// Loaded only by the local QA launcher, outside application/deployment code.
if (process.env.RAKUTEN_QA_FIXTURE_URL) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    return originalFetch(url.hostname === "openapi.rakuten.co.jp" ? `${process.env.RAKUTEN_QA_FIXTURE_URL}/rakuten` : input, init);
  };
}
