// Exercises only the local API. Never creates reactions on the published blog.
async (sharedPage) => {
  const browser = sharedPage.context().browser();
  const contexts = [];
  const pages = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const article = 'http://127.0.0.1:1313/writing/thinking-machines/';
  async function reader() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    contexts.push(context);
    await context.route('https://giscus.app/**', route => route.abort());
    const page = await context.newPage();
    pages.push(page);
    await page.goto(article);
    assert(await page.locator('[data-useful]').getAttribute('data-endpoint') === 'http://127.0.0.1:8787/api/useful',
      'test must point to the local API');
    await ready(page);
    return page;
  }
  async function ready(page) {
    await page.waitForFunction(() => !document.querySelector('[data-useful] button').disabled);
    assert(await page.locator('[data-useful-count]').isVisible(), 'shared count unavailable');
  }
  async function state(page, count, pressed) {
    await ready(page);
    assert(await page.locator('[data-useful-count]').innerText() === String(count), 'incorrect shared count');
    assert(await page.locator('[data-useful] button').getAttribute('aria-pressed') === String(pressed), 'incorrect personal state');
  }
  try {
    const first = await reader();
    const baseline = Number(await first.locator('[data-useful-count]').innerText());
    await first.locator('[data-useful] button').click();
    await state(first, baseline + 1, true);
    await first.reload();
    await state(first, baseline + 1, true);
    const second = await reader();
    await state(second, baseline + 1, false);
    await second.locator('[data-useful] button').click();
    await state(second, baseline + 2, true);
    await first.reload();
    await state(first, baseline + 2, true);
    await first.locator('[data-useful] button').click();
    await state(first, baseline + 1, false);

    await first.route('http://127.0.0.1:8787/api/useful?*', route =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:1313' }, body: '{}' })
        : route.continue());
    await first.locator('[data-useful] button').click();
    await state(first, baseline + 1, false);
    assert((await first.locator('[data-useful] [role="status"]').innerText()).includes('Try again'),
      'failed save should be explicit');
    await first.unroute('http://127.0.0.1:8787/api/useful?*');
    await first.locator('[data-useful] button').click();
    await state(first, baseline + 2, true);

    for (const width of [1440, 390, 320]) {
      await first.setViewportSize({ width, height: 844 });
      assert(await first.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `horizontal overflow at ${width}px`);
    }
    return { passed: true, reloadPersistence: true, sharedAcrossReaders: true, undo: true, failureRecovery: true };
  } finally {
    // Remove only this test's own reactions, even if an assertion failed.
    for (const page of pages) {
      await page.evaluate(async () => {
        const control = document.querySelector('[data-useful]');
        const voter = localStorage.getItem(`useful:${control.dataset.article}`);
        if (!voter) return;
        const url = new URL(control.dataset.endpoint);
        url.searchParams.set('article', control.dataset.article);
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Reaction-Key': voter },
          body: JSON.stringify({ useful: false }) });
      }).catch(() => {});
    }
    for (const context of contexts) await context.close();
  }
}
