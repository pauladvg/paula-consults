/* Paula de Vega — site behaviour (plain JavaScript, no libraries).
   1. Old one-page links  2. Accordions (Consulting)  3. Contact form  4. Typewriter line
   Each part only runs on pages that have the matching elements. */

/* Contact form: messages are sent through Formspree (same form as the previous site). */
const FORM_ENDPOINT = 'https://formspree.io/f/mkjokkzn';

(() => {
  /* ---------- 1. Old one-page links (pauladevega.com/#packages etc.) ---------- */
  const REDIRECTS = {
    packages: '/consulting/#pricing',
    pricing: '/consulting/#pricing',
    work: '/consulting/#work',
    contact: '/contact/?topic=consulting',
    legal: '/legal/',
    privacy: '/legal/#privacy',
  };
  if (document.body.dataset.section === 'home') {
    const key = (window.location.hash || '').replace(/^#/, '');
    if (REDIRECTS[key]) window.location.replace(REDIRECTS[key]);
  }

  /* ---------- 2. Accordions ---------- */
  function setOpen(item, btn, open) {
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  // Main sections (Work, Packages & pricing): each opens independently.
  document.querySelectorAll('.pdv-acc').forEach(item => {
    const btn = item.querySelector(':scope > .pdv-acc-h .pdv-acc-btn');
    if (btn) btn.addEventListener('click', () => setOpen(item, btn, !item.classList.contains('is-open')));
  });
  // Projects inside Work: one open at a time.
  const projects = Array.from(document.querySelectorAll('.pdv-proj'));
  projects.forEach(item => {
    const btn = item.querySelector('.pdv-proj-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      projects.forEach(p => setOpen(p, p.querySelector('.pdv-proj-btn'), false));
      setOpen(item, btn, willOpen);
    });
  });
  // Product page cards: "See what I did" opens the card's projects; it becomes "Show less".
  document.querySelectorAll('.pdv-card-toggle').forEach(btn => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const label = btn.querySelector('.pdv-card-label');
    const grid = btn.closest('.pdv-cards');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.classList.toggle('is-open', open);
      if (panel) panel.classList.toggle('is-open', open);
      if (label) label.textContent = open ? 'Show less' : 'See what I did';
      if (grid) grid.classList.toggle('is-any-open', !!grid.querySelector('.pdv-card-toggle[aria-expanded="true"]'));
    });
  });
  // /consulting/#work or #pricing opens that section and scrolls to it.
  function openFromHash() {
    const id = decodeURIComponent((window.location.hash || '').replace(/^#/, ''));
    const item = id && document.getElementById(id);
    if (!item || !item.classList.contains('pdv-acc')) return;
    setOpen(item, item.querySelector('.pdv-acc-btn'), true);
    setTimeout(() => window.scrollTo({ top: item.getBoundingClientRect().top + window.scrollY - 24, behavior: 'smooth' }), 80);
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* ---------- 3. Contact form ---------- */
  const form = document.querySelector('.pdv-oform');
  if (form) {
    const TOPICS = { consulting: 'Consulting', product: 'Product', other: 'Something else' };
    const norm = s => {
      s = String(s || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
      if (s === 'other' || s === 'something-else' || s === 'else') return 'other';
      return TOPICS[s] ? s : '';
    };
    const $ = sel => form.querySelector(sel);
    const fields = { name: $('[name="name"]'), email: $('[name="email"]'), topic: $('[name="topic"]'),
      company: $('[name="company"]'), message: $('[name="message"]'), consent: $('[name="consent"]'), hp: $('[name="website"]') };
    const sendBtn = $('.pdv-send3');
    const sendText = $('.pdv-send3-text');
    const errorBox = $('.pdv-oerror');
    const sentBox = document.querySelector('.pdv-sent');
    const intro = document.querySelector('.pdv-contact-intro');

    // Topic: preselect from ?topic=..., colour the page, keep the URL in sync.
    function applyTopic(t) {
      if (t) document.documentElement.setAttribute('data-pdv-topic', t);
      else document.documentElement.removeAttribute('data-pdv-topic');
      fields.topic.classList.toggle('is-empty', !t);
      sendBtn.classList.toggle('has-topic', ['consulting', 'product'].includes(t));
    }
    const fromUrl = norm(new URLSearchParams(window.location.search).get('topic'));
    if (fromUrl) fields.topic.value = fromUrl;
    applyTopic(fields.topic.value);
    fields.topic.addEventListener('change', () => {
      applyTopic(fields.topic.value);
      const u = new URL(window.location.href);
      u.searchParams.set('topic', fields.topic.value);
      window.history.replaceState(window.history.state, '', u.toString());
    });

    // Validation
    const REQUIRED = ['name', 'email', 'topic', 'message', 'consent'];
    const isMissing = {
      name: () => !fields.name.value.trim(),
      email: () => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim()),
      topic: () => !fields.topic.value,
      message: () => !fields.message.value.trim(),
      consent: () => !fields.consent.checked,
    };
    function showMissing(k, on) {
      const box = document.getElementById('pdv-f-' + k);
      const msg = box && box.querySelector('.pdv-omsg');
      if (box) box.classList.toggle('is-missing', on);
      if (msg) {
        msg.hidden = !on;
        if (k === 'email') msg.textContent = fields.email.value.trim() ? 'Please enter a valid email' : 'Please fill this in';
      }
    }
    let tried = false;
    REQUIRED.forEach(k => {
      const ev = k === 'consent' || k === 'topic' ? 'change' : 'input';
      fields[k].addEventListener(ev, () => { if (tried) showMissing(k, isMissing[k]()); errorBox.hidden = true; });
    });

    let sending = false;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending) return;
      tried = true;
      const missing = REQUIRED.filter(k => isMissing[k]());
      REQUIRED.forEach(k => showMissing(k, missing.includes(k)));
      if (missing.length) {
        const first = fields[missing[0]];
        first.focus();
        first.closest('.pdv-ofield').scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      const name = fields.name.value.trim();
      const firstName = name.split(/\s+/)[0];
      const done = () => {
        form.hidden = true;
        if (intro) intro.hidden = true;
        sentBox.querySelector('.pdv-sent-name').textContent = firstName;
        sentBox.hidden = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      if (fields.hp.value) { done(); return; } // spam bot filled the hidden field

      sending = true;
      errorBox.hidden = true;
      sendBtn.classList.add('is-sending');
      sendText.textContent = 'Sending...';
      try {
        const label = TOPICS[fields.topic.value];
        const data = new FormData();
        data.append('_subject', '[' + label + '] New message from ' + name);
        data.append('topic', label);
        data.append('name', name);
        data.append('email', fields.email.value.trim());
        data.append('company', fields.company.value.trim());
        data.append('message', fields.message.value.trim());
        data.append('privacy_consent', 'yes');
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Formspree request failed with status ' + res.status);
        done();
      } catch (err) {
        errorBox.hidden = false;
      } finally {
        sending = false;
        sendBtn.classList.remove('is-sending');
        sendText.textContent = 'Send';
      }
    });
  }

  /* ---------- 4. Typewriter line: <p data-typewriter>Your sentence.</p> ----------
     The full sentence stays readable for screen readers and search engines; the animated copy is
     aria-hidden and fully laid out from the start, so nothing moves while it types.
     It types for everyone (typing isn't on-screen movement); for visitors who asked their device
     for less motion, the cursor just doesn't blink. It types again when a page is restored with Back. */
  const START = 600, STEP = 95, PAUSE = 500;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const typers = [];
  document.querySelectorAll('[data-typewriter]').forEach(el => {
    const segs = [];
    el.childNodes.forEach(n => {
      const t = (n.textContent || '').replace(/\s+/g, ' ');
      if (t) segs.push({ t, strong: n.nodeType === 1 && /^(STRONG|B)$/.test(n.nodeName) });
    });
    if (segs.length) { segs[0].t = segs[0].t.replace(/^\s+/, ''); segs[segs.length - 1].t = segs[segs.length - 1].t.replace(/\s+$/, ''); }
    const text = segs.map(sg => sg.t).join('');
    if (!text) return;
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'pdv-sr';
    sr.textContent = text;
    const vis = document.createElement('span');
    vis.className = 'pdv-tw';
    vis.setAttribute('aria-hidden', 'true');
    const start = document.createElement('span');
    start.className = 'pdv-tw-start';
    vis.appendChild(start);
    const chars = [];
    segs.forEach(sg => Array.from(sg.t).forEach(ch => {
      const c = document.createElement('span');
      c.className = 'pdv-tw-c' + (sg.strong ? ' pdv-tw-strong' : '');
      c.textContent = ch;
      vis.appendChild(c);
      chars.push(c);
    }));
    el.append(sr, vis);
    if (reduce) el.classList.add('is-static');
    let firstStop = text.indexOf('.');
    while (firstStop >= 0 && text[firstStop + 1] === '.') firstStop++;
    let caret = start, timer = null;
    const moveCaret = to => { caret.classList.remove('is-caret'); to.classList.add('is-caret'); caret = to; };
    const run = () => {
      clearTimeout(timer);
      chars.forEach(c => c.classList.remove('is-on'));
      moveCaret(start);
      let i = 0;
      const tick = () => {
        chars[i].classList.add('is-on');
        moveCaret(chars[i]);
        i++;
        if (i < chars.length) timer = setTimeout(tick, (i - 1 === firstStop) ? STEP + PAUSE : STEP);
      };
      timer = setTimeout(tick, START);
    };
    typers.push(run);
    run();
  });
  window.addEventListener('pageshow', e => { if (e.persisted) typers.forEach(run => run()); });
})();
