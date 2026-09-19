// Read-only live integration check; never signs in or posts a comment.
async (sharedPage) => {
  const context = await sharedPage.context().browser().newContext();
  const page = await context.newPage();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const results = [];
  const revision = Date.now();
  try {
    await page.goto(`https://autoscaler.sh/?giscus-check=${revision}`);
    assert(await page.locator('script[src="https://giscus.app/client.js"]').count() === 0,
      'homepage loads Giscus');
    const article = await page.locator('.post-title a').first().getAttribute('href');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`https://autoscaler.sh${article}?giscus-check=${revision}`);
      await page.locator('.article-comments').scrollIntoViewIfNeeded();
      const iframe = page.locator('iframe.giscus-frame');
      await iframe.waitFor({ timeout: 15000 });
      assert(await iframe.getAttribute('loading') === 'lazy', 'comments are not lazy-loaded');
      const frame = await (await iframe.elementHandle()).contentFrame();
      await frame.getByRole('link', { name: 'Sign in with GitHub' }).waitFor({ timeout: 20000 });
      const text = await frame.locator('body').innerText();
      assert(!/not installed|configuration error|an error occurred/i.test(text), 'Giscus setup error');
      const signIn = frame.getByRole('link', { name: 'Sign in with GitHub' });
      assert(await signIn.isEnabled(), 'GitHub sign-in unavailable');
      const theme = await frame.evaluate(() => {
        const main = getComputedStyle(document.querySelector('main'));
        return {
          paper: main.getPropertyValue('--color-canvas-default').trim(),
          ink: main.getPropertyValue('--color-fg-default').trim(),
          moss: main.getPropertyValue('--color-accent-fg').trim(),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      assert(theme.paper === '#f8f7f3' && theme.ink === '#303630' && theme.moss === '#4d6454',
        `custom theme did not load: ${JSON.stringify(theme)}`);
      assert(theme.overflow <= 1, `comments overflow at ${width}px`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1),
        `article overflows at ${width}px`);
      assert(await page.locator('.discussion-link a').isVisible(), 'fallback link is hidden');
      results.push({ width, theme, signInAvailable: true });
    }
    return { passed: true, article, postedComments: 0, results };
  } finally {
    await context.close();
  }
}
