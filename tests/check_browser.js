// Pass this file to Playwright's browser_run_code_unsafe. No npm install needed.
async (sharedPage) => {
  const base = 'http://127.0.0.1:1313/';
  const context = await sharedPage.context().browser().newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  page.setDefaultTimeout(4000);
  const failures = [];
  const metrics = [];
  const requests = [];
  const checkedLinks = new Set();
  const addresses = new Map();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  page.on('pageerror', error => failures.push(`page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => failures.push(`request failed: ${request.url()}`));
  page.on('response', response => {
    if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`);
    requests.push(response.url());
  });

  async function visit(url, scale = 1) {
    const response = await page.goto(url, { waitUntil: 'load' });
    assert(response && response.ok(), `could not load ${url}`);
    if (scale !== 1) {
      // Model text-only enlargement; snapshot first so nested text is not multiplied twice.
      await page.evaluate(multiplier => {
        const sizes = [...document.querySelectorAll('body, body *')]
          .map(element => [element, parseFloat(getComputedStyle(element).fontSize)]);
        for (const [element, size] of sizes) element.style.fontSize = `${size * multiplier}px`;
      }, scale);
    }
  }

  async function address(href, source = base) {
    const key = `${source}\n${href}`;
    if (!addresses.has(key)) {
      addresses.set(key, await page.evaluate(({ href, source }) => {
        const url = new URL(href, source);
        return { href: url.href, origin: url.origin, pathname: url.pathname, hash: url.hash };
      }, { href, source }));
    }
    return addresses.get(key);
  }

  async function localHTML(href) {
    const url = await address(href);
    return url.origin === (await address(base)).origin && !url.hash &&
      (url.pathname.endsWith('/') || url.pathname.endsWith('.html'));
  }

  async function clickLink(selector, href, source, scale) {
    await visit(source, scale);
    const anchor = page.locator(selector);
    const index = await anchor.evaluateAll((links, target) =>
      links.findIndex(link => link.getAttribute('href') === target), href);
    assert(index !== -1, `link disappeared: ${source} → ${href}`);
    const expected = (await address(href, source)).href;
    await anchor.nth(index).click();
    await page.waitForURL(expected);
    assert(await page.locator('main h1').count() === 1, `no destination heading: ${expected}`);
    checkedLinks.add(`${(await address(source)).pathname} → ${(await address(expected)).pathname}`);
  }

  async function waitForDOM(predicate, argument, message) {
    // Browser animation-frame polling may be suspended with JavaScript disabled.
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await page.evaluate(predicate, argument)) return;
      await page.waitForTimeout(50);
    }
    const position = await page.evaluate(() => ({
      x: scrollX, y: scrollY, viewport: innerHeight,
      height: document.documentElement.scrollHeight,
      codeScroll: [...document.querySelectorAll('pre')].map(element => element.scrollLeft),
    }));
    throw new Error(`${message}: ${JSON.stringify(position)}`);
  }

  async function scrollPage() {
    await page.mouse.move(10, 100);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.mouse.wheel(0, height * 2);
    await waitForDOM(() =>
      window.scrollY >= document.documentElement.scrollHeight - innerHeight - 3,
      undefined, 'mouse wheel did not reach the bottom');
    const bottom = await page.evaluate(() => {
      const footer = document.querySelector('.site-footer').getBoundingClientRect();
      return { y: scrollY, visible: footer.top < innerHeight && footer.bottom > 0, x: scrollX };
    });
    assert(bottom.visible, 'footer is unreachable by vertical scrolling');
    assert(bottom.x === 0, 'vertical scrolling moved the page sideways');
    await page.mouse.wheel(0, -height * 2);
    await waitForDOM(() => scrollY <= 1, undefined, 'mouse wheel did not return to the top');
    return { height, bottom: bottom.y };
  }

  async function checkArticle(width) {
    const toc = page.locator('#TableOfContents');
    if (await toc.count()) {
      const anchors = toc.locator('a[href^="#"]');
      const count = await anchors.count();
      assert(count >= 2, 'article contents does not contain useful navigation');
      if (width <= 390) {
        const overlap = await page.evaluate(() => {
          const contents = document.querySelector('#TableOfContents').getBoundingClientRect();
          const prose = document.querySelector('article .prose').getBoundingClientRect();
          return contents.left < prose.right && contents.right > prose.left &&
            contents.top < prose.bottom && contents.bottom > prose.top;
        });
        assert(!overlap, 'mobile contents overlaps article text');
      }
      for (const index of new Set([0, count - 1])) {
        const previous = page.url();
        const href = await anchors.nth(index).getAttribute('href');
        await anchors.nth(index).click();
        await page.waitForURL((await address(href, previous)).href);
        const position = await page.evaluate(id => {
          const rect = document.getElementById(id).getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, viewport: innerHeight };
        }, decodeURIComponent(href.slice(1)));
        assert(position.top >= -1 && position.top < position.viewport,
          `heading did not scroll into view: ${href}`);
        await page.goBack();
        await page.waitForURL(previous);
      }
    }
    const codeIndex = await page.locator('pre').evaluateAll(blocks =>
      blocks.findIndex(block => block.scrollWidth > block.clientWidth + 2));
    if (codeIndex !== -1) {
      const code = page.locator('pre').nth(codeIndex);
      await code.evaluate(element => element.scrollIntoView({ block: 'center' }));
      await waitForDOM(index => {
        const rect = document.querySelectorAll('pre')[index].getBoundingClientRect();
        return rect.top >= 0 && rect.top < innerHeight;
      }, codeIndex, 'code block did not become visible');
      await code.focus();
      await page.keyboard.press('ArrowRight');
      await waitForDOM(index => document.querySelectorAll('pre')[index].scrollLeft > 0,
        codeIndex, 'ArrowRight did not scroll the code block');
      await code.evaluate(element => { element.scrollLeft = 0; });
      const bounds = await code.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + Math.min(bounds.height / 2, 20));
      await page.mouse.wheel(300, 0);
      await waitForDOM(index => document.querySelectorAll('pre')[index].scrollLeft > 0,
        codeIndex, 'horizontal wheel did not scroll the code block');
      assert(await page.evaluate(() => scrollX === 0), 'code scrolling moved the whole page sideways');
    }
    return { toc: await toc.count(), codeScroll: codeIndex !== -1 };
  }

  try {
    // Crawl visible HTML links so added internal pages join the regression suite.
    const queue = [base, (await address('404.html')).href];
    const routes = new Set();
    while (queue.length) {
      const url = queue.shift();
      if (routes.has(url)) continue;
      routes.add(url);
      await visit(url);
      const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
      for (const link of links) {
        if (await localHTML(link) && !routes.has(link)) queue.push(link);
      }
    }
    for (const route of ['writing/', 'projects/', 'about/']) {
      assert(routes.has((await address(route)).href), `${route} is unreachable through internal links`);
    }

    let expectedNavigation;
    let expectedDesign;
    let tocChecks = 0;
    let codeChecks = 0;
    for (const [width, height, scale] of [[1440, 1000, 1], [390, 844, 1], [320, 740, 1], [390, 844, 2]]) {
      await page.setViewportSize({ width, height });
      for (const url of routes) {
        try {
          await visit(url, scale);
          const state = await page.evaluate(() => {
            const body = getComputedStyle(document.body);
            const html = getComputedStyle(document.documentElement);
            return {
              navigation: [...document.querySelectorAll('nav[aria-label="Main navigation"] a')]
                .map(anchor => anchor.getAttribute('href')),
              design: [html.backgroundColor, body.color, body.fontFamily],
              overflow: document.documentElement.scrollWidth - innerWidth,
              scripts: [...document.scripts].map(script => ({
                src: script.getAttribute('src'), defer: script.defer, integrity: script.integrity,
              })),
              faas: location.pathname === '/writing/fitting-functions-on-one-server/',
              reactionVisible: !!document.querySelector('[data-useful]:not([hidden])'),
            };
          });
          expectedNavigation ??= JSON.stringify(state.navigation);
          expectedDesign ??= JSON.stringify(state.design);
          assert(state.navigation.length > 0, 'main navigation missing');
          assert(JSON.stringify(state.navigation) === expectedNavigation, 'main navigation differs between pages');
          assert(JSON.stringify(state.design) === expectedDesign, 'palette or body type differs between pages');
          assert(state.overflow <= 1, `horizontal page overflow: ${state.overflow}px`);
          assert(state.scripts.every(script => script.src === 'https://giscus.app/client.js' || /^\/js\/useful\.min\.[a-f0-9]+\.js$/.test(script.src)),
            'page includes an unexpected script');
          if (state.faas) {
            assert(await page.locator('#openfaas-chart, #response-chart').count() === 2,
              'chart markup is missing');
            assert(await page.locator('#response-static').isVisible(), 'response-time graphic is not visible without JavaScript');
            assert(await page.locator('#response-static').evaluate(image => image.complete && image.naturalWidth > 0 && image.src.endsWith('/response-time.svg')),
              'response-time SVG did not load');
            assert(await page.locator('.faas-visual select, #response-hint, .reveal').count() === 0,
              'article exposes unusable chart controls or presentation markup without JavaScript');
          }
          assert(!state.reactionVisible, 'reaction control requires JavaScript and should be hidden');
          const scrolling = await scrollPage();
          const article = await checkArticle(width);
          tocChecks += article.toc;
          codeChecks += Number(article.codeScroll);
          metrics.push([(await address(url)).pathname, width, scale, scrolling.height, scrolling.bottom]);

          // Exercise every adjacent-article link, including the first/last boundaries.
          const adjacent = await page.locator('nav[aria-label="Adjacent articles"] a')
            .evaluateAll(links => links.map(link => link.getAttribute('href')));
          for (const href of adjacent) {
            await clickLink('nav[aria-label="Adjacent articles"] a', href, url, scale);
          }
        } catch (error) {
          failures.push(`${(await address(url)).pathname} at ${width}px / ${scale * 100}% text: ${error.message}`);
          throw new Error(failures.join('\n'));
        }
      }

      // Shared header/footer navigation gets real clicks at each viewport and text scale.
      await visit(base, scale);
      const sharedLinks = await page.locator('.site-header a, .site-footer a')
        .evaluateAll(links => links.map(link => link.getAttribute('href')));
      for (const href of new Set(sharedLinks)) {
        const destination = await address(href);
        if (await localHTML(destination.href)) {
          const source = destination.href === base ? (await address('writing/')).href : base;
          await clickLink('.site-header a, .site-footer a', href, source, scale);
        } else if (destination.origin === (await address(base)).origin) {
          const response = await context.request.get(destination.href);
          assert(response.ok(), `shared resource unavailable: ${destination.href}`);
        }
      }
    }
    for (const url of requests) {
      assert((await address(url)).origin === (await address(base)).origin, `unexpected external request: ${url}`);
    }
    if (failures.length) throw new Error(failures.join('\n'));
    return {
      passed: true,
      javaScriptEnabled: false,
      routes: routes.size,
      renderedChecks: metrics.length,
      clickedLinks: [...checkedLinks],
      contentsChecks: tocChecks,
      codeScrollChecks: codeChecks,
      columns: ['route', 'viewportWidth', 'textScale', 'documentHeight', 'scrolledToY'],
      metrics,
    };
  } finally {
    await context.close();
  }
}
