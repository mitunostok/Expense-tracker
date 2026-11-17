'use strict';
/* Hisab — a simple expense tracker. All data lives in this device's localStorage. */
(() => {
  const KEY = 'hisab-data-v1';
  const THEME_KEY = 'hisab-theme';

  const EXPENSE_CATS = [
    ['Food & Dining', '🍔'], ['Groceries', '🛒'], ['Transport', '🚌'], ['Rent', '🏠'],
    ['Bills & Utilities', '💡'], ['Mobile & Internet', '📱'], ['Shopping', '🛍️'], ['Health', '💊'],
    ['Education', '📚'], ['Entertainment', '🎬'], ['Travel', '✈️'], ['Personal Care', '💇'],
    ['Gifts & Donations', '🎁'], ['Family', '👪'], ['EMI / Loan', '🏦'], ['Other', '📦'],
  ];
  const INCOME_CATS = [
    ['Salary', '💼'], ['Freelance', '💻'], ['Business', '🏪'], ['Bonus', '🎉'],
    ['Gift', '🎁'], ['Interest', '📈'], ['Refund', '↩️'], ['Other', '💰'],
  ];
  const EMOJIS = '🍔 🍕 ☕ 🍺 🛒 🥦 🚌 🚕 ⛽ 🚗 🏍️ 🏠 💡 💧 🔥 📱 🌐 📺 🛍️ 👕 👟 💊 🏥 📚 🎓 🎬 🎮 🎵 ✈️ 🏖️ 💇 💄 🎁 👪 👶 🐶 🏦 💳 🧾 🔧 🏋️ ⚽ 🙏 📦 💼 💻 🏪 🎉 📈 ↩️ 💰 🪙 🤝 🏡 🧹 👛 🐷'.split(' ');

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => dateStr(new Date());
  const monthOf = (s) => s.slice(0, 7);
  const thisMonth = () => monthOf(todayStr());
  function addMonth(m, k) {
    let [y, mo] = m.split('-').map(Number);
    mo += k;
    while (mo > 12) { mo -= 12; y++; }
    while (mo < 1) { mo += 12; y--; }
    return `${y}-${pad(mo)}`;
  }
  function daysIn(m) { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate(); }
  function monthLabel(m, short) {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', short ? { month: 'short' } : { month: 'long', year: 'numeric' });
  }
  function dayLabel(s) {
    if (s === todayStr()) return 'Today';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (s === dateStr(y)) return 'Yesterday';
    const [Y, M, D] = s.split('-').map(Number);
    return new Date(Y, M - 1, D).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
  const fmt = (n) => (n < 0 ? '−' : '') + '₹' + nf.format(Math.abs(round2(n)));
  function fmtShort(n) {
    const a = Math.abs(n);
    if (a >= 1e7) return '₹' + +(n / 1e7).toFixed(1) + 'Cr';
    if (a >= 1e5) return '₹' + +(n / 1e5).toFixed(1) + 'L';
    if (a >= 1e3) return '₹' + +(n / 1e3).toFixed(1) + 'k';
    return '₹' + Math.round(n);
  }

  /* ---------- data ---------- */
  function defaultData() {
    return {
      version: 1,
      wallets: [
        { id: 'w_salary', name: 'Salary', icon: '🏦', opening: 0 },
        { id: 'w_pocket', name: 'Pocket', icon: '👛', opening: 0 },
      ],
      categories: [
        ...EXPENSE_CATS.map(([name, icon], i) => ({ id: 'ce' + i, name, icon, type: 'expense' })),
        ...INCOME_CATS.map(([name, icon], i) => ({ id: 'ci' + i, name, icon, type: 'income' })),
      ],
      transactions: [],
      budgets: {},
      recurring: [],
      prefs: { expenseWallet: 'w_pocket', incomeWallet: 'w_salary' },
      lastBackup: null,
    };
  }
  function migrate(d) {
    const base = defaultData();
    if (!d || typeof d !== 'object') return base;
    for (const k of ['wallets', 'categories', 'transactions', 'recurring']) if (!Array.isArray(d[k])) d[k] = base[k];
    if (!d.budgets || typeof d.budgets !== 'object') d.budgets = {};
    if (!d.prefs || typeof d.prefs !== 'object') d.prefs = base.prefs;
    if (!d.wallets.length) d.wallets = base.wallets;
    d.transactions = d.transactions.filter((t) => t && t.id && t.date && t.amount > 0);
    d.version = 1;
    return d;
  }
  let storageOk = true;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { storageOk = false; }
    return defaultData();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; }
    catch (e) { storageOk = false; toast('Could not save. Storage may be full or blocked.'); }
  }
  let db = load();

  const cat = (id) => db.categories.find((c) => c.id === id);
  const wal = (id) => db.wallets.find((w) => w.id === id);
  const visibleCats = (type) => db.categories.filter((c) => c.type === type && !c.hidden);
  const visibleWallets = () => db.wallets.filter((w) => !w.hidden);
  const walName = (id) => wal(id)?.name || 'Deleted wallet';

  /* ---------- calculations ---------- */
  const txInMonth = (m) => db.transactions.filter((t) => monthOf(t.date) === m);
  const sortTx = (list) => [...list].sort((a, b) => (b.date.localeCompare(a.date)) || ((b.created || 0) - (a.created || 0)));
  function balance(wid) {
    let b = Number(wal(wid)?.opening) || 0;
    for (const t of db.transactions) {
      if (t.type === 'income' && t.walletId === wid) b += t.amount;
      else if (t.type === 'expense' && t.walletId === wid) b -= t.amount;
      else if (t.type === 'transfer') {
        if (t.walletId === wid) b -= t.amount;
        if (t.toWalletId === wid) b += t.amount;
      }
    }
    return round2(b);
  }
  function monthTotals(m) {
    let inc = 0, exp = 0;
    for (const t of txInMonth(m)) {
      if (t.type === 'income') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    }
    return { inc: round2(inc), exp: round2(exp) };
  }
  function sumBy(m, type, key) {
    const out = {};
    for (const t of txInMonth(m)) if (t.type === type) out[t[key]] = round2((out[t[key]] || 0) + t.amount);
    return out;
  }
  function budgetRows(m) {
    const spent = sumBy(m, 'expense', 'categoryId');
    return db.categories
      .filter((c) => c.type === 'expense' && db.budgets[c.id] > 0)
      .map((c) => { const b = db.budgets[c.id], s = spent[c.id] || 0; return { c, b, s, pct: (s / b) * 100 }; })
      .sort((a, b) => b.pct - a.pct);
  }

  /* ---------- repeating entries ---------- */
  function runRecurring() {
    const today = todayStr(), cm = monthOf(today), td = Number(today.slice(8));
    let added = 0;
    for (const r of db.recurring) {
      if (r.paused) continue;
      let m = addMonth(r.lastMonth, 1);
      let guard = 0;
      while (m <= cm && guard++ < 120) {
        const day = Math.min(r.day, daysIn(m));
        if (m === cm && td < day) break;
        db.transactions.push({
          id: uid(), type: r.type, amount: r.amount, categoryId: r.categoryId || null,
          walletId: r.walletId, toWalletId: r.toWalletId || null,
          date: `${m}-${pad(day)}`, note: r.note || '', recurringId: r.id, created: Date.now(),
        });
        r.lastMonth = m;
        added++;
        m = addMonth(m, 1);
      }
    }
    if (added) { save(); toast(`Added ${added} repeating ${added > 1 ? 'entries' : 'entry'}`); }
    return added;
  }

  /* ---------- UI state ---------- */
  const ui = { tab: 'home', month: thisMonth(), hist: { type: 'all', wallet: 'all', cat: null, q: '' }, statsType: 'expense', trendSel: null };

  function monthBar() {
    const atNow = ui.month >= thisMonth();
    return `<div class="monthbar">
      <button class="icon-btn" data-act="month" data-k="-1" aria-label="Previous month">‹</button>
      <span>${monthLabel(ui.month)}</span>
      <button class="icon-btn" data-act="month" data-k="1" aria-label="Next month" ${atNow ? 'disabled' : ''}>›</button>
    </div>`;
  }
  const empty = (msg) => `<div class="empty">${msg}</div>`;

  function txRow(t) {
    let icon, title, sub, cls = '', sign = '';
    if (t.type === 'transfer') {
      icon = '⇄'; title = `${walName(t.walletId)} → ${walName(t.toWalletId)}`; sub = 'Moved money';
      cls = 'muted';
    } else {
      const c = cat(t.categoryId);
      icon = c?.icon || '❔'; title = c?.name || 'Unknown'; sub = walName(t.walletId);
      if (t.type === 'income') { cls = 'pos'; sign = '+'; } else sign = '−';
    }
    if (t.note) sub += ' · ' + t.note;
    return `<button class="tx" data-act="edit" data-id="${t.id}">
      <span class="tx-icon" aria-hidden="true">${esc(icon)}</span>
      <span class="tx-main"><span class="tx-title">${esc(title)}</span><span class="tx-sub">${esc(sub)}${t.recurringId ? ' · 🔁' : ''}</span></span>
      <span class="tx-amt ${cls}">${sign}${fmt(t.amount)}</span>
    </button>`;
  }

  function budgetRowHtml(r) {
    const st = r.pct >= 100 ? 'over' : r.pct >= 80 ? 'warn' : 'ok';
    const left = r.b - r.s;
    const status = st === 'over'
      ? `<span class="over">⛔ Over by ${fmt(-left)}</span>`
      : st === 'warn' ? `<span>⚠️ ${fmt(left)} left</span>` : `<span>✓ ${fmt(left)} left</span>`;
    return `<div class="budget">
      <div class="budget-top"><span class="rank-name">${esc(r.c.icon)} ${esc(r.c.name)}</span><span class="rank-val">${fmt(r.s)} <small>of ${fmt(r.b)}</small></span></div>
      <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(r.pct, 100))}" aria-label="${esc(r.c.name)} budget used">
        <div class="fill ${st}" style="width:${Math.min(r.pct, 100)}%"></div></div>
      <div class="budget-status">${status}<span>${Math.round(r.pct)}%</span></div>
    </div>`;
  }

  /* ---------- views ---------- */
  function viewHome() {
    const wallets = visibleWallets();
    const total = wallets.reduce((s, w) => s + balance(w.id), 0);
    const { inc, exp } = monthTotals(ui.month);
    const alerts = budgetRows(ui.month).filter((r) => r.pct >= 80);
    const recent = sortTx(txInMonth(ui.month)).slice(0, 6);
    const fresh = db.transactions.length === 0;
    return `
      ${!storageOk ? `<div class="warn-note">⚠️ This browser is blocking storage, so entries will not be saved. Try opening the app normally (not in a private window).</div>` : ''}
      <section class="card hero">
        <div class="label">Total money left</div>
        <div class="hero-num ${total < 0 ? 'neg' : ''}">${fmt(total)}</div>
        <div class="wallets">${wallets.map((w) => {
          const b = balance(w.id);
          return `<button class="wallet" data-act="wallet-hist" data-id="${w.id}">
            <span class="w-icon" aria-hidden="true">${esc(w.icon)}</span><span class="w-name">${esc(w.name)}</span>
            <span class="w-bal ${b < 0 ? 'neg' : ''}">${fmt(b)}</span></button>`;
        }).join('')}</div>
        <button class="btn ghost" data-act="new" data-type="transfer">⇄ Move money between wallets</button>
      </section>
      ${fresh ? `<section class="card">
        <h3>Welcome! Let's get started</h3>
        <p class="note">Add your salary as income first. If you already have money in a wallet, set it as a starting balance.</p>
        <div class="actions"><button class="btn primary" data-act="new" data-type="income" data-cat="ci0">💼 Add salary</button>
        <button class="btn" data-act="wallets">Starting balances</button></div>
      </section>` : ''}
      ${monthBar()}
      <section class="summary">
        <div class="stat"><div class="label">Income</div><div class="num pos">${fmt(inc)}</div></div>
        <div class="stat"><div class="label">Spent</div><div class="num">${fmt(exp)}</div></div>
        <div class="stat"><div class="label">Saved</div><div class="num ${inc - exp < 0 ? 'neg' : ''}">${fmt(inc - exp)}</div></div>
      </section>
      ${alerts.length ? `<section class="card"><div class="card-head"><h3>Budget alerts</h3><button class="link" data-act="tab" data-tab="budgets">All budgets</button></div>${alerts.map(budgetRowHtml).join('')}</section>` : ''}
      <section class="card">
        <div class="card-head"><h3>Recent</h3>${recent.length ? '<button class="link" data-act="tab" data-tab="hist">See all</button>' : ''}</div>
        ${recent.length ? recent.map(txRow).join('') : empty('No entries this month yet. Tap + to add one.')}
      </section>`;
  }

  function histList() {
    const h = ui.hist;
    let list = txInMonth(ui.month);
    if (h.type !== 'all') list = list.filter((t) => t.type === h.type);
    if (h.wallet !== 'all') list = list.filter((t) => t.walletId === h.wallet || t.toWalletId === h.wallet);
    if (h.cat) list = list.filter((t) => t.categoryId === h.cat);
    const q = h.q.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => [t.note, cat(t.categoryId)?.name, walName(t.walletId), t.toWalletId && walName(t.toWalletId), String(t.amount)]
        .some((s) => s && String(s).toLowerCase().includes(q)));
    }
    if (!list.length) return empty(q || h.type !== 'all' || h.wallet !== 'all' || h.cat ? 'Nothing matches these filters.' : 'No entries in this month.');
    const groups = new Map();
    for (const t of sortTx(list)) { if (!groups.has(t.date)) groups.set(t.date, []); groups.get(t.date).push(t); }
    let html = '';
    for (const [d, items] of groups) {
      const spent = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      html += `<div class="day-head"><span>${dayLabel(d)}</span><span>${spent ? 'Spent ' + fmt(spent) : ''}</span></div>
        <section class="card">${items.map(txRow).join('')}</section>`;
    }
    return html;
  }
  function viewHist() {
    const h = ui.hist;
    const seg = [['all', 'All'], ['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Moves']];
    const c = h.cat && cat(h.cat);
    return `${monthBar()}
      <div class="filters">
        <div class="seg" role="group" aria-label="Type">${seg.map(([k, l]) => `<button data-act="hist-type" data-k="${k}" aria-pressed="${h.type === k}">${l}</button>`).join('')}</div>
        <div class="filter-row">
          <select class="input" id="hist-wallet" aria-label="Wallet">
            <option value="all">All wallets</option>
            ${db.wallets.map((w) => `<option value="${w.id}" ${h.wallet === w.id ? 'selected' : ''}>${esc(w.icon + ' ' + w.name)}</option>`).join('')}
          </select>
          <input class="input" id="hist-q" type="search" placeholder="Search notes, categories…" value="${esc(h.q)}" aria-label="Search">
        </div>
        ${c ? `<button class="chip-filter" data-act="clear-cat">${esc(c.icon + ' ' + c.name)} ✕</button>` : ''}
      </div>
      <div id="hist-list">${histList()}</div>`;
  }

  function niceMax(v) {
    if (v <= 0) return 100;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const s of [1, 2, 2.5, 5, 10]) if (s * p >= v) return s * p;
    return 10 * p;
  }
  function barPath(x, y, w, h) {
    if (h <= 0) return '';
    const r = Math.min(4, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }
  function trendSvg() {
    const months = [...Array(6)].map((_, i) => addMonth(ui.month, i - 5));
    const data = months.map((m) => ({ m, ...monthTotals(m) }));
    const top = niceMax(Math.max(...data.flatMap((d) => [d.inc, d.exp])));
    const W = 340, H = 170, pl = 40, pr = 4, pt = 8, pb = 22;
    const ch = H - pt - pb, cw = W - pl - pr, gw = cw / 6, bw = Math.min(16, (gw - 12) / 2);
    const y = (v) => pt + ch - (v / top) * ch;
    const sel = ui.trendSel || ui.month;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Income and spending, last 6 months">`;
    for (const v of [top / 2, top]) s += `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-t" x="${pl - 6}" y="${y(v) + 3}" text-anchor="end">${fmtShort(v)}</text>`;
    data.forEach((d, i) => {
      const gx = pl + gw * i, cx = gx + gw / 2;
      s += `<rect class="hit trend-hit ${d.m === sel ? 'sel' : ''}" data-m="${d.m}" x="${gx + 2}" y="${pt}" width="${gw - 4}" height="${ch}" rx="6"/>`;
      s += `<path class="b1" d="${barPath(cx - bw - 1, y(d.inc), bw, ch + pt - y(d.inc))}" pointer-events="none"/>`;
      s += `<path class="b2" d="${barPath(cx + 1, y(d.exp), bw, ch + pt - y(d.exp))}" pointer-events="none"/>`;
      s += `<text class="axis-t ${d.m === sel ? 'sel' : ''}" x="${cx}" y="${H - 6}" text-anchor="middle" pointer-events="none">${monthLabel(d.m, true)}</text>`;
    });
    s += `<line class="base" x1="${pl}" x2="${W - pr}" y1="${pt + ch}" y2="${pt + ch}"/></svg>`;
    return s;
  }
  function trendDetail(m) {
    const { inc, exp } = monthTotals(m);
    return `<span>${monthLabel(m)}</span><span>Income <b>${fmt(inc)}</b></span><span>Spent <b>${fmt(exp)}</b></span>`;
  }
  function viewStats() {
    const type = ui.statsType;
    const by = sumBy(ui.month, type, 'categoryId');
    const rows = Object.entries(by).map(([id, v]) => ({ id, v, c: cat(id) })).sort((a, b) => b.v - a.v);
    const total = rows.reduce((s, r) => s + r.v, 0);
    const max = rows[0]?.v || 1;
    const pct = (v) => { const p = (v / total) * 100; return p < 1 ? '<1' : Math.round(p); };
    const byWallet = Object.entries(sumBy(ui.month, type, 'walletId')).sort((a, b) => b[1] - a[1]);
    return `${monthBar()}
      <div class="seg" role="group" aria-label="Report type">
        <button data-act="stats-type" data-k="expense" aria-pressed="${type === 'expense'}">Spending</button>
        <button data-act="stats-type" data-k="income" aria-pressed="${type === 'income'}">Income</button>
      </div>
      <section class="card">
        <div class="label">${type === 'expense' ? 'Total spent' : 'Total income'} in ${monthLabel(ui.month)}</div>
        <div class="big-num">${fmt(total)}</div>
        <div style="margin-top:8px">
        ${rows.length ? rows.map((r) => `<button class="rank" data-act="cat-hist" data-id="${r.id}">
            <div class="rank-top"><span class="rank-name">${esc(r.c?.icon || '❔')} ${esc(r.c?.name || 'Unknown')}</span><span class="rank-val">${fmt(r.v)}<small>${pct(r.v)}%</small></span></div>
            <div class="track"><div class="fill" style="width:${(r.v / max) * 100}%"></div></div></button>`).join('')
          : empty(type === 'expense' ? 'No spending recorded this month.' : 'No income recorded this month.')}
        </div>
      </section>
      ${byWallet.length > 1 ? `<section class="card"><h3>${type === 'expense' ? 'Paid from' : 'Received in'}</h3>
        ${byWallet.map(([id, v]) => `<div class="rank"><div class="rank-top"><span class="rank-name">${esc((wal(id)?.icon || '') + ' ' + walName(id))}</span><span class="rank-val">${fmt(v)}<small>${pct(v)}%</small></span></div>
          <div class="track"><div class="fill" style="width:${(v / byWallet[0][1]) * 100}%"></div></div></div>`).join('')}</section>` : ''}
      <section class="card trend">
        <h3>Last 6 months</h3>
        <div class="legend"><span><i style="background:var(--series-1)"></i>Income</span><span><i style="background:var(--series-2)"></i>Spent</span></div>
        ${trendSvg()}
        <div class="trend-detail" id="trend-detail">${trendDetail(ui.trendSel || ui.month)}</div>
      </section>`;
  }

  function viewBudgets() {
    const rows = budgetRows(ui.month);
    const totalB = rows.reduce((s, r) => s + r.b, 0);
    const totalS = rows.reduce((s, r) => s + r.s, 0);
    const { exp } = monthTotals(ui.month);
    const outside = round2(exp - totalS);
    return `${monthBar()}
      ${rows.length ? `<section class="card">
          ${budgetRowHtml({ c: { icon: '🎯', name: 'All budgets' }, b: totalB, s: totalS, pct: (totalS / totalB) * 100 })}
          ${outside > 0 ? `<div class="note">Plus ${fmt(outside)} spent in categories without a budget.</div>` : ''}
        </section>
        <section class="card">${rows.map(budgetRowHtml).join('')}</section>`
      : `<section class="card"><h3>No budgets yet</h3><p class="note">Set a monthly limit for any category, like ₹3,000 for Food. Each bar turns yellow at 80% and red when you go over.</p></section>`}
      <button class="btn primary block" data-act="set-budgets">${rows.length ? 'Edit budgets' : 'Set budgets'}</button>
      <p class="note" style="text-align:center">Budgets repeat every month.</p>`;
  }

  function viewMore() {
    const theme = localGet(THEME_KEY) || 'system';
    const lb = db.lastBackup;
    const days = lb ? Math.floor((Date.now() - lb) / 864e5) : null;
    const remind = db.transactions.length > 0 && (days === null || days > 30);
    return `
      <section class="card">
        <button class="list-btn" data-act="cats"><span class="tx-icon">🏷️</span><span class="grow">Categories<br><small>Add your own or edit existing ones</small></span><span class="chev">›</span></button>
        <button class="list-btn" data-act="wallets"><span class="tx-icon">👛</span><span class="grow">Wallets<br><small>Salary, Pocket, and starting balances</small></span><span class="chev">›</span></button>
        <button class="list-btn" data-act="recurring"><span class="tx-icon">🔁</span><span class="grow">Repeating entries<br><small>${db.recurring.length} active</small></span><span class="chev">›</span></button>
      </section>
      <section class="card">
        <h3 style="margin-bottom:8px">Appearance</h3>
        <div class="seg" role="group" aria-label="Theme">
          ${[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => `<button data-act="theme" data-k="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}
        </div>
      </section>
      <section class="card">
        <h3>Backup</h3>
        <p class="note">Your data is stored only on this device. If you clear the browser or change phones, it's gone, so save a backup file now and then.
          ${lb ? `Last backup: ${new Date(lb).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.` : 'You have not made a backup yet.'}</p>
        ${remind ? '<div class="warn-note" style="margin-bottom:10px">💾 Time for a backup.</div>' : ''}
        <div class="actions" style="flex-wrap:wrap">
          <button class="btn primary" data-act="export">Save backup</button>
          <button class="btn" data-act="import">Restore</button>
          <button class="btn" data-act="csv">Export CSV</button>
        </div>
      </section>
      <section class="card">
        <button class="btn danger block" data-act="reset">Erase all data</button>
      </section>
      <p class="note" style="text-align:center">Hisab · works offline · no account needed</p>`;
  }

  const TITLES = { home: '', hist: 'History', stats: 'Reports', budgets: 'Budgets', more: 'Settings' };
  const VIEWS = { home: viewHome, hist: viewHist, stats: viewStats, budgets: viewBudgets, more: viewMore };
  function render() {
    $('#view').innerHTML = VIEWS[ui.tab]();
    $('#topbar-title').textContent = TITLES[ui.tab];
    $$('.tabbar button').forEach((b) => { b.removeAttribute('aria-current'); if (b.dataset.tab === ui.tab) b.setAttribute('aria-current', 'page'); });
    $('#fab').hidden = ui.tab === 'more';
    if (ui.tab === 'hist') bindHist();
  }
  function bindHist() {
    $('#hist-wallet').addEventListener('change', (e) => { ui.hist.wallet = e.target.value; $('#hist-list').innerHTML = histList(); });
    $('#hist-q').addEventListener('input', (e) => { ui.hist.q = e.target.value; $('#hist-list').innerHTML = histList(); });
  }
  function go(tab) { ui.tab = tab; render(); window.scrollTo(0, 0); }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
    t.hidden = false;
    if (action) t.querySelector('button').onclick = () => { t.hidden = true; action.fn(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, action ? 5000 : 2200);
  }

  /* ---------- sheet ---------- */
  let sheetCleanup = null;
  function openSheet(title, body, onMount) {
    const root = $('#sheet');
    root.innerHTML = `<div class="sheet-backdrop" data-close></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">✕</button></div>
        <div class="sheet-body">${body}</div></div>`;
    root.hidden = false;
    document.body.classList.add('noscroll');
    const sheet = $('.sheet', root);
    root.onclick = (e) => { if (e.target.closest('[data-close]')) closeSheet(); };
    sheetCleanup = onMount ? onMount(sheet) : null;
  }
  function closeSheet() {
    const root = $('#sheet');
    root.hidden = true; root.innerHTML = ''; root.onclick = null;
    document.body.classList.remove('noscroll');
    if (typeof sheetCleanup === 'function') sheetCleanup();
    sheetCleanup = null;
  }

  /* ---------- add / edit entry ---------- */
  function openTxForm(opts = {}) {
    const editing = opts.id ? db.transactions.find((t) => t.id === opts.id) : null;
    const type = editing?.type || opts.type || 'expense';
    const f = editing ? { ...editing, amount: String(editing.amount) } : {
      type,
      amount: '',
      categoryId: opts.categoryId || null,
      walletId: null,
      toWalletId: null,
      date: ui.month === thisMonth() ? todayStr() : `${ui.month}-01`,
      note: '',
      repeat: false,
    };
    let showNewCat = false, newCatIcon = '📦';
    function defaults() {
      const ws = visibleWallets();
      const pick = (id) => (ws.find((w) => w.id === id) ? id : ws[0]?.id);
      if (f.type === 'transfer') {
        if (!f.walletId || !wal(f.walletId)) f.walletId = pick('w_salary');
        if (!f.toWalletId || f.toWalletId === f.walletId) f.toWalletId = ws.find((w) => w.id !== f.walletId)?.id || null;
      } else {
        if (!f.walletId || !wal(f.walletId)) f.walletId = pick(f.type === 'expense' ? db.prefs.expenseWallet : db.prefs.incomeWallet);
        if (f.categoryId && cat(f.categoryId)?.type !== f.type) f.categoryId = null;
      }
    }
    function walletChips(field, selected, exclude) {
      return `<div class="chips">${visibleWallets().filter((w) => w.id !== exclude).map((w) =>
        `<button type="button" class="chip" data-f="${field}" data-id="${w.id}" aria-pressed="${selected === w.id}">${esc(w.icon)} ${esc(w.name)} <small>${fmt(balance(w.id))}</small></button>`).join('')}</div>`;
    }
    function body() {
      defaults();
      const isT = f.type === 'transfer';
      const cats = visibleCats(f.type);
      if (editing && f.categoryId && cat(f.categoryId)?.hidden) cats.push(cat(f.categoryId));
      return `
        <div class="seg" role="group" aria-label="Entry type">
          ${[['expense', 'Expense'], ['income', 'Income'], ['transfer', 'Move money']].map(([k, l]) => `<button type="button" data-f="type" data-k="${k}" aria-pressed="${f.type === k}">${l}</button>`).join('')}
        </div>
        <label class="amount-field"><span>₹</span><input id="f-amount" inputmode="decimal" autocomplete="off" placeholder="0" value="${esc(f.amount)}" aria-label="Amount"></label>
        ${isT ? `
          <div class="note">Use this when you take cash out of your salary, or move money between any two wallets. It is not counted as spending.</div>
          <div class="field-label">From</div>${walletChips('from', f.walletId)}
          <div class="field-label">To</div>${walletChips('to', f.toWalletId, f.walletId)}
        ` : `
          <div class="field-label">Category</div>
          <div class="cat-grid">
            ${cats.map((c) => `<button type="button" class="cat-chip" data-f="cat" data-id="${c.id}" aria-pressed="${f.categoryId === c.id}"><span style="font-size:22px;color:inherit" aria-hidden="true">${esc(c.icon)}</span><span>${esc(c.name)}</span></button>`).join('')}
            <button type="button" class="cat-chip add" data-f="newcat" aria-expanded="${showNewCat}"><span style="font-size:22px;color:inherit" aria-hidden="true">＋</span><span>New</span></button>
          </div>
          ${showNewCat ? `<div class="newcat">
            <input class="input" id="nc-name" maxlength="24" placeholder="New category name" aria-label="New category name">
            <div class="emoji-row">${EMOJIS.map((e) => `<button type="button" data-f="nc-emoji" data-e="${e}" aria-pressed="${e === newCatIcon}">${e}</button>`).join('')}</div>
            <button type="button" class="btn primary" data-f="nc-save">Add category</button>
          </div>` : ''}
          <div class="field-label">${f.type === 'expense' ? 'Paid from' : 'Received in'}</div>
          ${walletChips('wallet', f.walletId)}
        `}
        <div class="row2">
          <label class="field">Date<input class="input" type="date" id="f-date" value="${esc(f.date)}"></label>
          <label class="field">Note<input class="input" id="f-note" maxlength="80" placeholder="Optional" value="${esc(f.note)}"></label>
        </div>
        ${!editing ? `<label class="check"><input type="checkbox" id="f-repeat" ${f.repeat ? 'checked' : ''}> Repeat every month on this date</label>` : ''}
        <div class="err" id="f-err"></div>
        <div class="actions">
          ${editing ? '<button type="button" class="btn danger" data-f="delete">Delete</button>' : ''}
          <button type="button" class="btn primary" data-f="save">Save</button>
        </div>`;
    }
    function sync(sheet) {
      const a = $('#f-amount', sheet); if (a) f.amount = a.value;
      const d = $('#f-date', sheet); if (d) f.date = d.value;
      const n = $('#f-note', sheet); if (n) f.note = n.value;
      const r = $('#f-repeat', sheet); if (r) f.repeat = r.checked;
    }
    const title = editing ? 'Edit entry' : 'New entry';
    openSheet(title, body(), (sheet) => {
      const sb = $('.sheet-body', sheet);
      const rerender = (focusSel) => { sync(sheet); sb.innerHTML = body(); if (focusSel) $(focusSel, sb)?.focus(); };
      if (!editing) setTimeout(() => $('#f-amount', sb)?.focus(), 50);
      sb.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('#f-amount, #f-note')) { e.preventDefault(); sb.querySelector('[data-f="save"]').click(); } });
      sb.addEventListener('click', (e) => {
        const b = e.target.closest('[data-f]');
        if (!b) return;
        const act = b.dataset.f;
        if (act === 'type') { sync(sheet); f.type = b.dataset.k; showNewCat = false; rerender(); }
        else if (act === 'cat') { sync(sheet); f.categoryId = b.dataset.id; showNewCat = false; rerender(); }
        else if (act === 'wallet' || act === 'from') { sync(sheet); f.walletId = b.dataset.id; rerender(); }
        else if (act === 'to') { sync(sheet); f.toWalletId = b.dataset.id; rerender(); }
        else if (act === 'newcat') { sync(sheet); showNewCat = !showNewCat; rerender(showNewCat ? '#nc-name' : null); }
        else if (act === 'nc-emoji') {
          newCatIcon = b.dataset.e;
          $$('[data-f="nc-emoji"]', sb).forEach((x) => x.setAttribute('aria-pressed', x === b));
        } else if (act === 'nc-save') {
          const name = $('#nc-name', sb).value.trim();
          if (!name) { $('#nc-name', sb).focus(); return; }
          const c = { id: 'c' + uid(), name, icon: newCatIcon, type: f.type };
          db.categories.push(c); save();
          sync(sheet); f.categoryId = c.id; showNewCat = false; rerender();
        } else if (act === 'delete') {
          const idx = db.transactions.findIndex((t) => t.id === editing.id);
          const [removed] = db.transactions.splice(idx, 1);
          save(); closeSheet(); render();
          toast('Entry deleted', { label: 'Undo', fn: () => { db.transactions.push(removed); save(); render(); } });
        } else if (act === 'save') {
          sync(sheet);
          const err = $('#f-err', sb);
          const amount = round2(String(f.amount).replace(/[,₹\s]/g, ''));
          if (!(amount > 0)) { err.textContent = 'Enter an amount greater than 0.'; $('#f-amount', sb).focus(); return; }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) { err.textContent = 'Pick a date.'; return; }
          if (f.type !== 'transfer' && !f.categoryId) { err.textContent = 'Pick a category.'; return; }
          if (!f.walletId) { err.textContent = 'Pick a wallet.'; return; }
          if (f.type === 'transfer' && (!f.toWalletId || f.toWalletId === f.walletId)) { err.textContent = 'You need two different wallets. Add one in Settings → Wallets.'; return; }
          const t = {
            id: editing?.id || uid(), type: f.type, amount, date: f.date, note: f.note.trim(),
            categoryId: f.type === 'transfer' ? null : f.categoryId,
            walletId: f.walletId, toWalletId: f.type === 'transfer' ? f.toWalletId : null,
            created: editing?.created || Date.now(),
          };
          if (editing?.recurringId) t.recurringId = editing.recurringId;
          if (editing) db.transactions[db.transactions.findIndex((x) => x.id === editing.id)] = t;
          else db.transactions.push(t);
          if (!editing && f.repeat) {
            const r = { id: 'r' + uid(), type: t.type, amount, categoryId: t.categoryId, walletId: t.walletId, toWalletId: t.toWalletId, note: t.note, day: Number(t.date.slice(8)), lastMonth: monthOf(t.date) };
            db.recurring.push(r); t.recurringId = r.id;
          }
          if (t.type === 'expense') db.prefs.expenseWallet = t.walletId;
          if (t.type === 'income') db.prefs.incomeWallet = t.walletId;
          save();
          if (!editing && f.repeat) runRecurring();
          closeSheet();
          if (monthOf(t.date) <= thisMonth()) ui.month = monthOf(t.date);
          render();
          toast(editing ? 'Updated' : 'Saved');
        }
      });
    });
  }

  /* ---------- budgets ---------- */
  function openBudgets() {
    const cats = visibleCats('expense');
    const avg = (id) => {
      let s = 0; for (let i = 1; i <= 3; i++) s += sumBy(addMonth(thisMonth(), -i), 'expense', 'categoryId')[id] || 0;
      return round2(s / 3);
    };
    openSheet('Monthly budgets', `
      <p class="note">Leave a box empty for no budget. The small number is your average monthly spend over the last 3 months.</p>
      <div>${cats.map((c) => { const a = avg(c.id); return `<label class="budget-input"><span>${esc(c.icon)} ${esc(c.name)}${a ? `<br><small>avg ${fmt(a)}</small>` : ''}</span>
        <input class="input" inputmode="decimal" data-cat="${c.id}" placeholder="No limit" value="${db.budgets[c.id] || ''}"></label>`; }).join('')}</div>
      <button class="btn primary block" data-save>Save budgets</button>`, (sheet) => {
      $('[data-save]', sheet).onclick = () => {
        for (const inp of $$('[data-cat]', sheet)) {
          const v = round2(inp.value.replace(/[,₹\s]/g, ''));
          if (v > 0) db.budgets[inp.dataset.cat] = v; else delete db.budgets[inp.dataset.cat];
        }
        save(); closeSheet(); render(); toast('Budgets saved');
      };
    });
  }

  /* ---------- categories ---------- */
  function openCats(type = 'expense') {
    const used = (id) => db.transactions.some((t) => t.categoryId === id) || db.recurring.some((r) => r.categoryId === id);
    openSheet('Categories', `
      <div class="seg" role="group" aria-label="Category type">
        <button data-t="expense" aria-pressed="${type === 'expense'}">Expense</button>
        <button data-t="income" aria-pressed="${type === 'income'}">Income</button>
      </div>
      <div>${visibleCats(type).map((c) => `<button class="list-btn" data-edit="${c.id}"><span class="tx-icon">${esc(c.icon)}</span><span class="grow">${esc(c.name)}</span><span class="chev">Edit ›</span></button>`).join('')}</div>
      <button class="btn primary block" data-add>＋ Add ${type} category</button>`, (sheet) => {
      sheet.addEventListener('click', (e) => {
        const t = e.target.closest('[data-t]'); if (t) return openCats(t.dataset.t);
        const ed = e.target.closest('[data-edit]'); if (ed) return editCat(cat(ed.dataset.edit));
        if (e.target.closest('[data-add]')) return editCat({ id: null, name: '', icon: '📦', type });
      });
    });
    function editCat(c) {
      let icon = c.icon;
      const custom = !EMOJIS.includes(icon);
      openSheet(c.id ? 'Edit category' : 'New category', `
        <label class="field">Name<input class="input" id="c-name" maxlength="24" value="${esc(c.name)}"></label>
        <div class="field-label">Icon</div>
        <div class="emoji-row">${(custom ? [icon, ...EMOJIS] : EMOJIS).map((e) => `<button type="button" data-e="${esc(e)}" aria-pressed="${e === icon}">${esc(e)}</button>`).join('')}</div>
        <label class="field">Or type any emoji<input class="input" id="c-emoji" maxlength="4" placeholder="e.g. 🍩"></label>
        <div class="err" id="c-err"></div>
        <div class="actions">
          ${c.id ? '<button class="btn danger" data-del>Delete</button>' : '<button class="btn" data-back>Cancel</button>'}
          <button class="btn primary" data-save>Save</button>
        </div>`, (sheet) => {
        if (!c.id) setTimeout(() => $('#c-name', sheet).focus(), 50);
        sheet.addEventListener('click', (e) => {
          const em = e.target.closest('[data-e]');
          if (em) { icon = em.dataset.e; $('#c-emoji', sheet).value = ''; $$('[data-e]', sheet).forEach((x) => x.setAttribute('aria-pressed', x === em)); return; }
          if (e.target.closest('[data-back]')) return openCats(c.type);
          if (e.target.closest('[data-del]')) {
            if (!confirm(`Delete "${c.name}"? Past entries keep their category, but it won't show up for new entries.`)) return;
            if (used(c.id)) cat(c.id).hidden = true; else db.categories = db.categories.filter((x) => x.id !== c.id);
            delete db.budgets[c.id];
            save(); render(); return openCats(c.type);
          }
          if (e.target.closest('[data-save]')) {
            const name = $('#c-name', sheet).value.trim();
            const typed = $('#c-emoji', sheet).value.trim();
            if (!name) { $('#c-err', sheet).textContent = 'Give the category a name.'; return; }
            if (c.id) Object.assign(cat(c.id), { name, icon: typed || icon });
            else db.categories.push({ id: 'c' + uid(), name, icon: typed || icon, type: c.type });
            save(); render(); openCats(c.type); toast('Category saved');
          }
        });
      });
    }
  }

  /* ---------- wallets ---------- */
  function openWallets() {
    openSheet('Wallets', `
      <p class="note">A wallet is a place your money sits. "Salary" is your bank/salary account; "Pocket" is cash in hand. Add more if you like (e.g. Savings, UPI).</p>
      <div>${visibleWallets().map((w) => `<button class="list-btn" data-edit="${w.id}"><span class="tx-icon">${esc(w.icon)}</span><span class="grow">${esc(w.name)}<br><small>Balance ${fmt(balance(w.id))}${w.opening ? ` · started with ${fmt(w.opening)}` : ''}</small></span><span class="chev">Edit ›</span></button>`).join('')}</div>
      <button class="btn primary block" data-add>＋ Add wallet</button>`, (sheet) => {
      sheet.addEventListener('click', (e) => {
        const ed = e.target.closest('[data-edit]'); if (ed) return editWallet(wal(ed.dataset.edit));
        if (e.target.closest('[data-add]')) editWallet({ id: null, name: '', icon: '💳', opening: 0 });
      });
    });
    function editWallet(w) {
      let icon = w.icon;
      const icons = ['🏦', '👛', '💳', '🐷', '📱', '💰', '🪙', '🏠'];
      if (!icons.includes(icon)) icons.unshift(icon);
      openSheet(w.id ? 'Edit wallet' : 'New wallet', `
        <label class="field">Name<input class="input" id="w-name" maxlength="20" value="${esc(w.name)}"></label>
        <div class="field-label">Icon</div>
        <div class="emoji-row">${icons.map((e) => `<button type="button" data-e="${e}" aria-pressed="${e === icon}">${e}</button>`).join('')}</div>
        <label class="field">Starting balance<input class="input" id="w-open" inputmode="decimal" placeholder="0" value="${w.opening || ''}"></label>
        <p class="note" style="margin:-6px 0 0">Money that was already in this wallet before you started using the app.</p>
        <div class="err" id="w-err"></div>
        <div class="actions">
          ${w.id ? '<button class="btn danger" data-del>Delete</button>' : '<button class="btn" data-back>Cancel</button>'}
          <button class="btn primary" data-save>Save</button>
        </div>`, (sheet) => {
        sheet.addEventListener('click', (e) => {
          const em = e.target.closest('[data-e]');
          if (em) { icon = em.dataset.e; $$('[data-e]', sheet).forEach((x) => x.setAttribute('aria-pressed', x === em)); return; }
          if (e.target.closest('[data-back]')) return openWallets();
          if (e.target.closest('[data-del]')) {
            if (visibleWallets().length <= 1) { $('#w-err', sheet).textContent = 'You need at least one wallet.'; return; }
            const used = db.transactions.some((t) => t.walletId === w.id || t.toWalletId === w.id);
            if (!confirm(`Delete wallet "${w.name}"?${used ? ' Past entries stay in your history.' : ''}`)) return;
            if (used) wal(w.id).hidden = true; else db.wallets = db.wallets.filter((x) => x.id !== w.id);
            db.recurring = db.recurring.filter((r) => r.walletId !== w.id && r.toWalletId !== w.id);
            save(); render(); return openWallets();
          }
          if (e.target.closest('[data-save]')) {
            const name = $('#w-name', sheet).value.trim();
            const opening = round2($('#w-open', sheet).value.replace(/[,₹\s]/g, ''));
            if (!name) { $('#w-err', sheet).textContent = 'Give the wallet a name.'; return; }
            if (w.id) Object.assign(wal(w.id), { name, icon, opening });
            else db.wallets.push({ id: 'w' + uid(), name, icon, opening });
            save(); render(); openWallets(); toast('Wallet saved');
          }
        });
      });
    }
  }

  /* ---------- repeating ---------- */
  function openRecurring() {
    const desc = (r) => r.type === 'transfer' ? `⇄ ${walName(r.walletId)} → ${walName(r.toWalletId)}` : `${cat(r.categoryId)?.icon || ''} ${cat(r.categoryId)?.name || 'Unknown'}`;
    openSheet('Repeating entries', `
      <p class="note">These get added automatically every month. To create one, tick "Repeat every month" when adding an entry.</p>
      <div>${db.recurring.length ? db.recurring.map((r) => `<div class="list-btn"><span class="grow"><b>${esc(desc(r))}</b> · ${fmt(r.amount)}<br>
        <small>${r.type === 'income' ? 'Income' : r.type === 'expense' ? 'Expense' : 'Move'} · on day ${r.day} of every month${r.note ? ' · ' + esc(r.note) : ''}</small></span>
        <button class="btn danger" data-stop="${r.id}">Stop</button></div>`).join('') : empty('No repeating entries yet.')}</div>`, (sheet) => {
      sheet.addEventListener('click', (e) => {
        const s = e.target.closest('[data-stop]');
        if (!s) return;
        if (!confirm('Stop repeating this entry? Entries already added stay in your history.')) return;
        db.recurring = db.recurring.filter((r) => r.id !== s.dataset.stop);
        save(); render(); openRecurring();
      });
    });
  }

  /* ---------- backup ---------- */
  function download(name, text, mime) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function exportJson() {
    db.lastBackup = Date.now(); save();
    download(`hisab-backup-${todayStr()}.json`, JSON.stringify(db, null, 2), 'application/json');
    render(); toast('Backup file saved');
  }
  function exportCsv() {
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = [['Date', 'Type', 'Category', 'From wallet', 'To wallet', 'Amount', 'Note']];
    for (const t of sortTx(db.transactions)) {
      rows.push([t.date, t.type, t.type === 'transfer' ? '' : cat(t.categoryId)?.name || '', walName(t.walletId), t.toWalletId ? walName(t.toWalletId) : '', t.amount, t.note || '']);
    }
    download(`hisab-${todayStr()}.csv`, '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n'), 'text/csv');
  }
  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.categories)) throw new Error('bad');
        if (!confirm(`Restore this backup with ${data.transactions.length} entries? This replaces everything currently in the app.`)) return;
        db = migrate(data); save(); runRecurring(); render(); toast('Backup restored');
      } catch (e) { toast("That file isn't a Hisab backup."); }
    };
    reader.readAsText(file);
  }

  /* ---------- theme ---------- */
  function localGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function localSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function applyTheme() {
    const t = localGet(THEME_KEY);
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    const bg = getComputedStyle(document.body).backgroundColor;
    $('meta[name="theme-color"]').setAttribute('content', bg);
  }

  /* ---------- global events ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.closest('#sheet')) return;
    const a = b.dataset.act;
    switch (a) {
      case 'tab': go(b.dataset.tab); break;
      case 'month': ui.month = addMonth(ui.month, Number(b.dataset.k)); ui.trendSel = null; render(); break;
      case 'new': openTxForm({ type: b.dataset.type, categoryId: b.dataset.cat }); break;
      case 'edit': openTxForm({ id: b.dataset.id }); break;
      case 'wallet-hist': ui.hist = { type: 'all', wallet: b.dataset.id, cat: null, q: '' }; go('hist'); break;
      case 'cat-hist': ui.hist = { type: ui.statsType, wallet: 'all', cat: b.dataset.id, q: '' }; go('hist'); break;
      case 'clear-cat': ui.hist.cat = null; render(); break;
      case 'hist-type': ui.hist.type = b.dataset.k; render(); break;
      case 'stats-type': ui.statsType = b.dataset.k; render(); break;
      case 'set-budgets': openBudgets(); break;
      case 'cats': openCats(); break;
      case 'wallets': openWallets(); break;
      case 'recurring': openRecurring(); break;
      case 'theme': localSet(THEME_KEY, b.dataset.k === 'system' ? null : b.dataset.k); applyTheme(); render(); break;
      case 'export': exportJson(); break;
      case 'csv': exportCsv(); break;
      case 'import': $('#import-file').click(); break;
      case 'reset':
        if (confirm('Erase ALL entries, categories, budgets and wallets? This cannot be undone.') && confirm('Are you sure? Consider saving a backup first.')) {
          db = defaultData(); save(); ui.month = thisMonth(); render(); toast('All data erased');
        }
        break;
    }
  });
  function selectTrend(m) {
    ui.trendSel = m;
    $$('.trend-hit').forEach((r) => r.classList.toggle('sel', r.dataset.m === m));
    $$('.trend .axis-t[text-anchor="middle"]').forEach((t, i) => t.classList.toggle('sel', $$('.trend-hit')[i]?.dataset.m === m));
    const d = $('#trend-detail'); if (d) d.innerHTML = trendDetail(m);
  }
  document.addEventListener('pointerover', (e) => { const h = e.target.closest?.('.trend-hit'); if (h) selectTrend(h.dataset.m); });
  document.addEventListener('click', (e) => { const h = e.target.closest?.('.trend-hit'); if (h) selectTrend(h.dataset.m); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  $('#import-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ''; });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && runRecurring()) render();
  });

  /* ---------- start ---------- */
  applyTheme();
  runRecurring();
  render();
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
