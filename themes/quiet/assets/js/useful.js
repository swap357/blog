// SPDX-License-Identifier: MIT
const control = document.querySelector('[data-useful]');
if (control) {
  const button = control.querySelector('button');
  const count = control.querySelector('[data-useful-count]');
  const status = control.querySelector('[role="status"]');
  const storageKey = `useful:${control.dataset.article}`;
  let voter = '', useful = false;
  try { voter = localStorage.getItem(storageKey) || ''; } catch {}
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(voter)) voter = '';
  control.hidden = false;

  async function update(value) {
    const url = new URL(control.dataset.endpoint, location.href);
    url.searchParams.set('article', control.dataset.article);
    const headers = voter ? { 'X-Reaction-Key': voter } : {};
    const options = { headers, signal: AbortSignal.timeout(8000) };
    if (typeof value === 'boolean') {
      options.method = 'POST';
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify({ useful: value });
    }
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(response.status === 429 ? 'Please wait a minute, then try again.' : 'Couldn’t save that. Try again.');
    const result = await response.json();
    if (!Number.isSafeInteger(result.count) || result.count < 0 || typeof result.useful !== 'boolean') {
      throw new Error('Reactions are unavailable right now.');
    }
    useful = result.useful;
    count.textContent = result.count;
    count.hidden = false;
    button.setAttribute('aria-pressed', String(useful));
    button.title = useful ? 'Remove your reaction' : 'Mark this article as useful';
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = '';
    if (!voter) {
      voter = crypto.randomUUID();
      try { localStorage.setItem(storageKey, voter); } catch {}
    }
    try {
      await update(!useful);
      status.textContent = useful ? 'Thanks.' : 'Reaction removed.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  update().catch(() => { status.textContent = 'Reactions are unavailable right now.'; })
    .finally(() => { button.disabled = false; });
}
