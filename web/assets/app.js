/* 英语乐园 · 译林版小学英语  —— 单词 / 语法 / 句子 / 艾宾浩斯背单词 */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const COLORS = ['#ff6b6b', '#ffa94d', '#fcc419', '#51cf66', '#20c997', '#4dabf7', '#748ffc', '#b197fc', '#f783ac', '#ff8787', '#3bc9db', '#94d82d'];
const BOOK_EMO = { '1A': '🧸', '1B': '🥕', '2A': '🐰', '2B': '🐱', '3A': '👋', '3B': '🏫', '4A': '⚽', '4B': '🍳', '5A': '🎨', '5B': '👠', '6A': '🌍', '6B': '🦁', ST1: '🎈', ST2: '🎨', PU1: '⚡', PP1: '🐷' };
const AVATARS = ['🐼', '🐰', '🐱', '🐶', '🦊', '🐯', '🦁', '🐨', '🐸', '🐵', '🦄', '🐧', '🐻', '🐹', '🐳', '🦖'];
const STEPS = [20 * 60e3, 1, 2, 4, 7, 15, 30, 60].map((v, i) => i ? v * 864e5 : v); // 艾宾浩斯：20分钟、1、2、4、7、15、30、60 天
const MASTER = STEPS.length + 1; // 第 8 次间隔（60 天）后再答对即「已掌握」
const LS = { srs: 'kids-srs-v1', set: 'kids-set-v1', dirty: 'kids-dirty' };

const S = {
  index: null, books: {}, grammar: null, user: null,
  srs: JSON.parse(localStorage.getItem(LS.srs) || '{}'),
  set: Object.assign({ book: '1A', sel: [], newPer: 10, types: 'auto', hideZh: false, stars: 0, days: {} }, JSON.parse(localStorage.getItem(LS.set) || '{}')),
};

/* ---------- 数据 ---------- */
async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
async function loadIndex() { if (!S.index) S.index = await getJSON('data/index.json'); return S.index; }
async function loadBook(id) {
  if (!S.books[id]) {
    const b = await getJSON(`data/${id}.json`);
    b.units.forEach(u => u.words.forEach(w => { w.unit = u.id; w.book = b.id; w.key = keyOf(w.en); }));
    S.books[id] = b;
  }
  return S.books[id];
}
async function loadUnit(uid) { const b = await loadBook(uid.split('-')[0]); return [b, b.units.find(u => u.id === uid)]; }
const keyOf = en => en.toLowerCase().replace(/[.!?,]/g, '').replace(/\s+/g, ' ').trim();
const isWord = w => /^[A-Za-z][A-Za-z'\-]*$/.test(w.en.replace(/[.!?]$/, ''));
const lowGrade = bid => /^([12]|ST|PU|PP)/.test(bid);
const isExtra = b => b.cat === 'extra';
const ucol = n => COLORS[(n + 11) % COLORS.length];
const unum = n => n === 0 ? '👋' : n;
const ulab = u => /^PP/.test(u.id) ? `第${u.no}集` : u.no ? 'Unit ' + u.no : 'Hello';

/* ---------- 声音 ---------- */
const player = new Audio(); let stopTimer = null, playingEl = null;
function stopAudio() { player.pause(); clearTimeout(stopTimer); if (playingEl) playingEl.classList.remove('playing'); playingEl = null; speechSynthesis?.cancel(); }
function tts(text, rate = .85, us = false) {
  if (!window.speechSynthesis) return;
  const lg = us ? 'en-US' : 'en-GB', re = new RegExp(lg, 'i');
  const u = new SpeechSynthesisUtterance(text); u.lang = lg; u.rate = rate;
  const vs = speechSynthesis.getVoices(); const v = vs.find(v => re.test(v.lang.replace('_', '-'))) || vs.find(v => /^en/i.test(v.lang)); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
function playWord(w, el) {
  stopAudio(); if (el) { el.classList.add('playing'); playingEl = el; }
  if (w.au) { player.src = `media/au/${w.id}.mp3${w.au > 1 ? '?v=' + w.au : ''}`; player.currentTime = 0; player.play().catch(() => tts(w.en, .85, w.us)); player.onended = () => el && el.classList.remove('playing'); }
  else { tts(w.en, .85, w.us); setTimeout(() => el && el.classList.remove('playing'), 1200); }
}
function playSent(u, s, el) {
  stopAudio(); if (el) { el.classList.add('playing'); playingEl = el; }
  if (u.la && s.t && s.t[1] > s.t[0]) {
    const src = `media/lesson/${u.id}.mp3`;
    const go = () => { player.currentTime = s.t[0] / 1000; player.play().catch(() => tts(s.en)); stopTimer = setTimeout(() => { player.pause(); el && el.classList.remove('playing'); }, s.t[1] - s.t[0] + 150); };
    if (!player.src.endsWith(src)) { player.src = src; player.onloadedmetadata = () => { player.onloadedmetadata = null; go(); }; player.load(); } else go();
    player.onended = null;
  } else { tts(s.en, .85, s.us); setTimeout(() => el && el.classList.remove('playing'), 2000); }
}
const imgOf = w => w.img ? `media/img/${w.im || w.id}.webp` : "";
const picHTML = w => w.img ? `<img loading="lazy" src="${imgOf(w)}" alt="${esc(w.en)}">` : `<span class="ph">${esc(w.en.slice(0, 1).toUpperCase())}</span>`;

/* ---------- 小工具 ---------- */
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200); }
function confetti(n = 26) { const fx = $('#fx'); const em = ['⭐', '🎉', '🌟', '🎈', '✨', '🍭', '💖']; for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.textContent = em[i % em.length]; s.style.left = Math.random() * 100 + 'vw'; s.style.animationDelay = Math.random() * .6 + 's'; fx.appendChild(s); setTimeout(() => s.remove(), 2400); } }
function saveSet() { localStorage.setItem(LS.set, JSON.stringify(S.set)); scheduleSync(); }
function saveSrs() { localStorage.setItem(LS.srs, JSON.stringify(S.srs)); localStorage.setItem(LS.dirty, '1'); scheduleSync(); }
function addStar(n = 1) { S.set.stars = (S.set.stars || 0) + n; const d = today(); S.set.days[d] = (S.set.days[d] || 0) + n; saveSet(); }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/* ---------- 账号与同步 ---------- */
async function api(path, opt = {}) {
  const r = await fetch('api/' + path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) { }
  if (!r.ok) throw new Error(j.detail || '网络开小差了');
  return j;
}
let syncT = null, syncing = false;
function scheduleSync() { if (!S.user) return; clearTimeout(syncT); syncT = setTimeout(sync, 1500); }
async function sync(pull = false) {
  if (!S.user || syncing) return; syncing = true;
  try {
    let res;
    if (pull && !localStorage.getItem(LS.dirty)) res = await api('progress');
    else res = await api('progress', { method: 'PUT', body: { srs: S.srs, settings: S.set } });
    if (res.srs) { S.srs = mergeSrs(S.srs, res.srs); localStorage.setItem(LS.srs, JSON.stringify(S.srs)); }
    if (res.settings && Object.keys(res.settings).length && pull) { S.set = Object.assign(S.set, res.settings); localStorage.setItem(LS.set, JSON.stringify(S.set)); }
    localStorage.removeItem(LS.dirty);
  } catch (e) { console.warn('sync', e); }
  syncing = false;
}
function mergeSrs(a, b) { const o = { ...a }; for (const k in b) if (!o[k] || (b[k].t || 0) >= (o[k].t || 0)) o[k] = b[k]; return o; }
async function initUser() {
  try { const j = await api('me'); S.user = j.user; S.regCode = j.register_code; } catch (e) { S.user = null; }
  updateNav();
  if (S.user) { if (localStorage.getItem(LS.dirty)) await sync(); else await sync(true); }
}
function updateNav() { $('#navAvatar').textContent = S.user ? S.user.avatar : '👤'; $('#navMe').textContent = S.user ? S.user.nickname : '我的'; }

/* ---------- 艾宾浩斯 ---------- */
function rec(k) { return S.srs[k]; }
function srsStats(words) {
  const now = Date.now(); let due = 0, nw = 0, lrn = 0, ok = 0; const seen = new Set();
  for (const w of words) { if (seen.has(w.key)) continue; seen.add(w.key); const r = rec(w.key); if (!r) nw++; else if (r.l >= MASTER) ok++; else { lrn++; if (r.d <= now) due++; } }
  return { due, nw, lrn, ok, total: seen.size };
}
function grade(k, right, w) {
  const r = S.srs[k] || { l: 0, c: 0, w: 0, u: w?.unit };
  const now = Date.now();
  if (right) { r.l = Math.min(MASTER, (r.l || 0) + 1); r.c = (r.c || 0) + 1; r.d = now + (r.l >= MASTER ? 365 * 864e5 : STEPS[r.l - 1]); }
  else { r.l = Math.max(0, (r.l || 0) - 2); r.w = (r.w || 0) + 1; r.d = now + 5 * 60e3; }
  r.t = now; S.srs[k] = r; saveSrs();
}
async function selectedWords() {
  const sel = S.set.sel || [];
  const books = [...new Set(sel.map(u => u.split('-')[0]))];
  await Promise.all(books.map(loadBook));
  const out = [];
  for (const uid of sel) { const b = S.books[uid.split('-')[0]]; const u = b.units.find(x => x.id === uid); if (u) out.push(...u.words); }
  return out;
}

/* ---------- 题目生成 ---------- */
// 题型：pic2word 看图选词 · listen2pic 听音选图 · en2zh 看词选义 · zh2en 看中文选词 · spell 拼单词 · order 连词成句 · listenSent 听句选义 · fill 句子填空
const KIND_NAME = { pic2word: '看图选单词', listen2pic: '听一听，选图片', en2zh: '这是什么意思？', zh2en: '选出英文', spell: '拼一拼单词', order: '连词成句', listenSent: '听句子，选意思', fill: '句子填空' };
function wordKinds(w, pool, low) {
  const imgs = pool.filter(x => x.img && x.key !== w.key);
  const k = [];
  if (w.img && imgs.length >= 2) k.push('pic2word', 'listen2pic', 'listen2pic');
  k.push('en2zh');
  if (!low) { k.push('zh2en'); if (isWord(w) && w.en.length <= 11 && w.en.length >= 2) k.push('spell', 'spell'); }
  return k;
}
function distract(w, pool, n, f = x => x.en) {
  const seen = new Set([f(w).toLowerCase()]); const out = [];
  const near = pool.filter(x => x.unit && x.unit === w.unit), far = pool.filter(x => !(x.unit && x.unit === w.unit));
  for (const x of [...shuffle(near), ...shuffle(far)]) { const v = f(x); if (!v || seen.has(v.toLowerCase())) continue; seen.add(v.toLowerCase()); out.push(x); if (out.length >= n) break; }
  return out;
}
function makeWordQ(w, pool, low, kind) {
  kind = kind || pick(wordKinds(w, pool, low), 1)[0];
  if (kind === 'pic2word' || kind === 'zh2en') { const o = shuffle([w, ...distract(w, pool, 3)]); return { kind, w, opts: o.map(x => ({ t: x.en, ok: x.key === w.key })) }; }
  if (kind === 'listen2pic') { const o = shuffle([w, ...distract(w, pool.filter(x => x.img), 3)]); return { kind, w, opts: o.map(x => ({ img: imgOf(x), t: x.en, ok: x.key === w.key })) }; }
  if (kind === 'en2zh') { const o = shuffle([w, ...distract(w, pool, low ? 2 : 3, x => x.zh)]); return { kind, w, opts: o.map(x => ({ t: x.zh, ok: x.key === w.key, zh: 1 })) }; }
  if (kind === 'spell') { const word = w.en.replace(/[.!?]$/, ''); return { kind, w, answer: word, tiles: shuffle(word.split('')) }; }
}
function usableSents(u) { return (u.sents || []).filter(s => { const n = s.en.split(/\s+/).length; return n >= 2 && n <= 12 && !/[“”"]|\.\.\.|…|\//.test(s.en); }); }
function makeSentQ(u, s, allS, kind) {
  const words = u.words.filter(isWord).map(w => w.en.replace(/[.!?]$/, ''));
  const toks = s.en.split(/\s+/);
  const cand = toks.map((t, i) => [i, t.replace(/[.,!?]/g, '')]).filter(([i, t]) => words.some(x => x.toLowerCase() === t.toLowerCase()) && t.length > 1);
  const ks = ['order', 'listenSent']; if (cand.length) ks.push('fill');
  kind = kind || pick(ks, 1)[0];
  if (kind === 'order') return { kind, u, s, answer: toks.join(' '), tiles: shuffle(toks) };
  if (kind === 'listenSent') { const o = shuffle([s, ...distract(s, allS, 2, x => x.zh)]); return { kind, u, s, opts: o.map(x => ({ t: x.zh, zh: 1, ok: x === s })) }; }
  if (kind === 'fill') {
    const [i, t] = pick(cand, 1)[0]; const others = pick([...new Set(words.filter(x => x.toLowerCase() !== t.toLowerCase()))], 2);
    const blank = toks.map((x, j) => j === i ? x.replace(t, '____') : x).join(' ');
    return { kind, u, s, blank, opts: shuffle([t, ...others]).map(x => ({ t: x, ok: x === t })) };
  }
}

/* ---------- 题目渲染（通用） ---------- */
function renderQ(box, q, onDone) {
  let tried = false; const low = q.w ? lowGrade(q.w.book) : false;
  const sound = () => q.w ? playWord(q.w) : playSent(q.u, q.s);
  let body = `<span class="kind">${KIND_NAME[q.kind]}</span>`;
  if (q.kind === 'pic2word') body += `<img class="qimg" src="${imgOf(q.w)}" alt=""><div><button class="btn ghost sm" data-say>🔊 听一听</button></div>`;
  if (q.kind === 'listen2pic' || q.kind === 'listenSent') body += `<button class="bigspk" data-say>🔊</button>`;
  if (q.kind === 'en2zh') body += `<div class="prompt">${esc(q.w.en)}</div><div class="muted">${esc(q.w.ipa || '')}</div><button class="btn ghost sm" data-say>🔊 听一听</button>`;
  if (q.kind === 'zh2en') body += `<div class="prompt zh">${esc(q.w.zh)}</div>`;
  if (q.kind === 'spell') body += `${q.w.img ? `<img class="qimg" src="${imgOf(q.w)}" alt="">` : ''}<div class="prompt zh">${esc(q.w.zh)}</div><button class="btn ghost sm" data-say>🔊 听一听</button>`;
  if (q.kind === 'order') body += `<div class="prompt zh">${esc(q.s.zh)}</div><button class="btn ghost sm" data-say>🔊 听一听</button>`;
  if (q.kind === 'fill') body += `<div class="prompt">${esc(q.blank)}</div><div class="muted">${esc(q.s.zh)}</div>`;
  if (q.opts) {
    const pic = q.kind === 'listen2pic';
    body += `<div class="opts ${q.opts.length === 3 && !pic ? 'one' : ''}">` + q.opts.map((o, i) => `<button class="opt ${o.zh ? 'zh' : ''} ${pic ? 'pic' : ''}" data-i="${i}">${pic ? (o.img ? `<img src="${o.img}" alt="">` : esc(o.t)) : esc(o.t)}</button>`).join('') + `</div>`;
  } else {
    body += `<div class="answer" data-ans></div><div class="tiles" data-tiles>${q.tiles.map((t, i) => `<button class="tile" data-ti="${i}">${esc(t)}</button>`).join('')}</div><div class="qfoot"><button class="btn ghost sm" data-undo>↩️ 退一步</button><button class="btn sm green" data-check>✅ 检查</button></div>`;
  }
  body += `<div class="feedback" data-fb></div><div class="qfoot" data-next hidden><button class="btn orange">下一题 ➡️</button></div>`;
  box.innerHTML = `<div class="qcard">${body}</div>`;
  const fb = $('[data-fb]', box);
  $$('[data-say]', box).forEach(b => b.onclick = sound);
  if (['listen2pic', 'listenSent', 'pic2word', 'en2zh'].includes(q.kind)) setTimeout(sound, 250);
  const finish = (right) => {
    fb.className = 'feedback ' + (right ? 'ok' : 'no');
    const ans = q.w ? `${q.w.en} = ${q.w.zh}` : `${q.s.en}`;
    fb.innerHTML = right ? pick(['太棒了！⭐', '答对啦！🎉', 'Great! 👍', 'Super! 🌟', 'Well done! 💯'], 1)[0] : `再记一记：${esc(ans)}`;
    if (right) { playDing(); } else { sound(); }
    const nx = $('[data-next]', box); nx.hidden = false; const b = $('button', nx); b.focus();
    let gone = false; b.onclick = () => { if (gone) return; gone = true; onDone(!tried && right); };
    if (right && !tried) setTimeout(() => { if (box.isConnected) b.click(); }, 1200);
  };
  if (q.opts) {
    $$('.opt', box).forEach(btn => btn.onclick = () => {
      const o = q.opts[+btn.dataset.i];
      if (o.ok) { btn.classList.add('right'); $$('.opt', box).forEach(b => b.disabled = true); finish(true); }
      else { tried = true; btn.classList.add('wrong'); btn.disabled = true; fb.className = 'feedback no'; fb.textContent = '再想想哦～'; if (q.kind === 'listen2pic' || q.kind === 'listenSent') sound(); }
    });
  } else {
    const ansEl = $('[data-ans]', box); const picked = [];
    const draw = () => { ansEl.innerHTML = picked.map(i => `<button class="tile" data-pi="${i}">${esc(q.tiles[i])}</button>`).join(''); $$('[data-ti]', box).forEach(t => t.classList.toggle('used', picked.includes(+t.dataset.ti))); $$('[data-pi]', ansEl).forEach(t => t.onclick = () => { picked.splice(picked.indexOf(+t.dataset.pi), 1); draw(); }); };
    $$('[data-ti]', box).forEach(t => t.onclick = () => { picked.push(+t.dataset.ti); draw(); if (picked.length === q.tiles.length) check(); });
    let fails = 0;
    $('[data-undo]', box).onclick = () => { picked.pop(); draw(); };
    const sep = q.kind === 'spell' ? '' : ' ';
    const norm = s => s.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
    const check = () => {
      const got = picked.map(i => q.tiles[i]).join(sep);
      if (norm(got) === norm(q.answer)) { $$('button', box).forEach(b => { if (!b.closest('[data-next]')) b.disabled = true; }); finish(true); }
      else if (picked.length < q.tiles.length) { fb.className = 'feedback no'; fb.textContent = '还没拼完哦～'; }
      else {
        tried = true; fails++;
        if (fails >= 2) { $$('button', box).forEach(b => { if (!b.closest('[data-next]')) b.disabled = true; }); finish(false); fb.innerHTML = `正确答案：<b>${esc(q.answer)}</b>`; }
        else { fb.className = 'feedback no'; fb.textContent = '顺序不对，再试试！'; setTimeout(() => { picked.length = 0; draw(); }, 700); }
      }
    };
    $('[data-check]', box).onclick = check;
  }
}
let ac = null;
function playDing() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime;[660, 880, 1320].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.type = 'triangle'; g.gain.setValueAtTime(.12, t + i * .08); g.gain.exponentialRampToValueAtTime(.001, t + i * .08 + .25); o.connect(g).connect(ac.destination); o.start(t + i * .08); o.stop(t + i * .08 + .3); }); } catch (e) { } }

function runQuiz(box, qs, opts = {}) {
  let i = 0, right = 0;
  const step = () => {
    if (i >= qs.length) return end();
    box.innerHTML = `<div class="quiz"><div class="qtop"><button class="btn ghost sm" data-quit>✖</button><div class="qbar"><span style="width:${i / qs.length * 100}%"></span></div><span class="qstars">⭐ ${right}</span></div><div data-q></div></div>`;
    $('[data-quit]', box).onclick = () => opts.onQuit ? opts.onQuit() : history.back();
    const q = qs[i];
    renderQ($('[data-q]', box), q.q || q, ok => { if (ok) { right++; addStar(); } opts.onAnswer && opts.onAnswer(q, ok); if (!ok && opts.requeue) qs.push(opts.requeue(q)); i++; step(); });
  };
  const end = () => {
    stopAudio(); const pct = right / Math.max(1, qs.length); if (pct >= .6) confetti();
    box.innerHTML = `<div class="panel done"><div class="trophy">${pct >= .9 ? '🏆' : pct >= .6 ? '🥇' : '💪'}</div><h2>${pct >= .9 ? '太厉害了！' : pct >= .6 ? '做得很好！' : '继续加油！'}</h2><p class="muted">一次答对 ${right} / ${qs.length} 题，获得 ${right} 颗星星 ⭐</p><div class="qfoot">${opts.again ? '<button class="btn green" data-again>🔁 再来一次</button>' : ''}<button class="btn ghost" data-back>返回</button></div></div>`;
    $('[data-back]', box).onclick = () => opts.onQuit ? opts.onQuit() : history.back();
    if (opts.again) $('[data-again]', box).onclick = opts.again;
  };
  step();
}

/* ---------- 视图 ---------- */
const app = () => $('#app');
const routes = [];
const route = (re, fn) => routes.push([re, fn]);
async function router() {
  stopAudio();
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?'); const params = new URLSearchParams(qs || '');
  for (const [re, fn] of routes) { const m = path.match(re); if (m) { setNav(path); window.scrollTo(0, 0); try { await fn(m, params); } catch (e) { console.error(e); app().innerHTML = `<div class="empty">😵 出错了：${esc(e.message)}</div>`; } return; } }
  location.hash = '#/';
}
function setNav(p) { const k = p === '/' ? 'home' : p.split('/')[1]; const ex = /^\/(book|unit)\/(ST|PU|PP)/.test(p); const map = { book: ex ? 'extra' : 'books', unit: ex ? 'extra' : 'books' }; $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === (map[k] || k))); }

function bookCard(b, i) { return `<a class="book" href="#/book/${b.id}" style="background:${COLORS[i % COLORS.length]}">${S.set.book === b.id ? '<span class="cur">在学</span>' : ''}<div class="code">${b.id}</div><div class="nm">${b.name}</div><span class="ed">${b.edition}</span><span class="emo">${BOOK_EMO[b.id] || '📘'}</span></a>`; }

route(/^\/$/, async () => {
  const idx = await loadIndex(); const sel = await selectedWords(); const st = srsStats(sel);
  const cur = idx.find(b => b.id === S.set.book) || idx[0]; await loadBook(cur.id);
  const hour = new Date().getHours(); const hi = hour < 11 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  app().innerHTML = `
  <div class="hero"><div class="ava">${S.user ? S.user.avatar : '🦉'}</div><div><h1>${hi}${S.user ? '，' + esc(S.user.nickname) : ''}！</h1><p>已经攒了 <b>${S.set.stars || 0}</b> 颗星星 ⭐ ${st.total ? `· 今天要复习 <b>${st.due}</b> 个词` : '· 去「背单词」选好要背的单元吧'}</p></div>
  <div class="go"><a class="btn green" href="#/review">🧠 背单词</a></div></div>
  <div class="section-title">📖 继续学习 <small>${cur.id} ${cur.name}</small></div>
  <div class="units">${cur.units.map((u, i) => unitCard(u, i)).join('')}</div>
  <div class="section-title">📚 译林版课本 <small>一二年级「一起」，三年级起「三起」</small></div>
  <div class="books">${idx.filter(b => !isExtra(b)).map(bookCard).join('')}</div>
  <div class="section-title">🌈 课外教材 <small>Show and Tell · Power Up · 小猪佩奇</small></div>
  <div class="books">${idx.filter(isExtra).map((b, i) => bookCard(b, i + 6)).join('')}</div>`;
});
function unitCard(u, i) {
  const st = srsStats((S.books[u.id.split('-')[0]]?.units.find(x => x.id === u.id)?.words) || []);
  const pct = st.total ? Math.round(st.ok / st.total * 100) : 0;
  return `<a class="unit" href="#/unit/${u.id}"><div class="no" style="background:${ucol(u.no)}">${unum(u.no)}</div><div style="flex:1;min-width:0"><h3>${esc(u.title.replace(/^Unit \d+\s*/, ''))}</h3><p>${ulab(u)} · ${u.n} 个单词 · ${u.s} 个句子</p>${st.total && (st.ok || st.lrn) ? `<div class="bar"><span style="width:${pct}%"></span></div>` : ''}</div></a>`;
}
route(/^\/books$/, async () => {
  const idx = await loadIndex();
  app().innerHTML = `<div class="section-title">📚 选一本课本 <small>译林版</small></div><div class="books">${idx.filter(b => !isExtra(b)).map(bookCard).join('')}</div>
  <p class="note" style="margin-top:16px">江苏省译林版：一、二年级用「一年级起点」课本，三年级起用「三年级起点」课本（3A–4B、5A、6A 已是 2024 新版，5B、6B 新版尚未出版，暂用现行版）。</p>`;
});
route(/^\/book\/(\w+)$/, async m => {
  const b = await loadBook(m[1]); S.set.book = b.id; saveSet();
  app().innerHTML = `<div class="crumbs">${isExtra(b) ? '<a href="#/extra">🌈 课外</a>' : '<a href="#/books">📚 课本</a>'} › ${b.id} ${b.name}</div>
  <div class="hero"><div class="ava">${BOOK_EMO[b.id]}</div><div><h1>${b.id} · ${b.name}</h1><p>${b.edition} · ${b.units.length} 个单元 · ${b.units.reduce((a, u) => a + u.words.length, 0)} 个单词</p></div>
  <div class="go"><button class="btn green" id="addAll">🧠 加入背单词</button></div></div>
  <div class="units">${b.units.map((u, i) => unitCard({ id: u.id, no: u.no, title: u.title, n: u.words.length, s: u.sents.length }, i)).join('')}</div>`;
  $('#addAll').onclick = () => { const s = new Set(S.set.sel); b.units.forEach(u => s.add(u.id)); S.set.sel = [...s]; saveSet(); toast(`已把 ${b.id} 全部 ${b.units.length} 个单元加入背单词`); };
});
route(/^\/unit\/([\w-]+)$/, async (m, p) => {
  const [b, u] = await loadUnit(m[1]); if (!u) throw new Error('没有这个单元');
  const tab = p.get('tab') || 'words';
  const i = b.units.indexOf(u), prev = b.units[i - 1], next = b.units[i + 1];
  app().innerHTML = `<div class="crumbs">${isExtra(b) ? '<a href="#/extra">🌈 课外</a>' : '<a href="#/books">📚 课本</a>'} › <a href="#/book/${b.id}">${b.name}</a> › ${ulab(u)}</div>
  <div class="hero"><div class="ava" style="background:${ucol(u.no)};color:#fff;font-weight:900;font-size:40px">${unum(u.no)}</div><div><h1>${esc(u.title)}</h1><p>${b.id} ${b.name} · ${u.words.length} 个单词 · ${u.sents.length} 个句子</p></div>
  <div class="go row">${prev ? `<a class="btn ghost sm" href="#/unit/${prev.id}">⬅️</a>` : ''}${next ? `<a class="btn ghost sm" href="#/unit/${next.id}">➡️</a>` : ''}</div></div>
  <div class="tabs">${[['words', '🖼️ 单词卡'], ['flash', '🃏 一张张记'], ['sents', isExtra(b) ? '💬 重点句型' : '💬 课文句子'], ['practice', '🎯 练一练']].map(([k, n]) => `<a class="tab ${k === tab ? 'on' : ''}" href="#/unit/${u.id}?tab=${k}">${n}</a>`).join('')}</div><div id="tabBody"></div>`;
  const tb = $('#tabBody');
  if (tab === 'words') {
    const sm = matchSents(u);
    tb.innerHTML = `<div class="row" style="margin-bottom:12px"><label class="toggle"><input type="checkbox" id="hz" ${S.set.hideZh ? 'checked' : ''}> 遮住中文（点卡片看）</label><span class="spacer"></span><button class="btn sm ghost" id="playAll">▶️ 全部读一遍</button><button class="btn sm green" id="addU">🧠 加入背单词</button></div>
    <div class="words ${S.set.hideZh ? 'hidezh' : ''}" id="wl">${u.words.map((w, i) => { const r = rec(w.key); return `<div class="wcard" data-i="${i}"><div class="pic">${picHTML(w)}</div><span class="spk">🔊</span>${r ? `<span class="lv">${r.l >= MASTER ? '🏅' : '⭐'.repeat(Math.min(3, Math.ceil(r.l / 3)) || 1)}</span>` : ''}<div class="en">${esc(w.en)}</div><div class="ipa">${esc(w.ipa || '')}</div><div class="zh">${esc(w.zh)}</div>${(sm.by[i] || []).map(si => `<div class="ws" data-s="${si}"><span>🔈</span><div><div class="e">${hl(u.sents[si].en, w.en)}</div><div class="z">${esc(u.sents[si].zh)}</div></div></div>`).join('')}</div>`; }).join('')}</div>
    ${sm.rest.length ? `<div class="section-title" style="margin-top:22px">💬 ${sm.rest.length < u.sents.length ? '更多句子' : (isExtra(b) ? (/^PP/.test(b.id) ? '动画原句' : '本单元句子') : '课文句子')} <small>点一下听朗读</small></div><div class="sents ${S.set.hideZh ? 'hidezh' : ''}" id="sl">${sm.rest.map(i => `<div class="sent" data-i="${i}"><span class="pl">🔈</span><div><div class="e">${esc(u.sents[i].en)}</div><div class="z">${esc(u.sents[i].zh)}</div></div></div>`).join('')}</div>` : ''}`;
    $$('.wcard', tb).forEach(c => c.onclick = () => playWord(u.words[+c.dataset.i], c));
    $$('.ws', tb).forEach(el => el.onclick = e => { e.stopPropagation(); playSent(u, u.sents[+el.dataset.s], el); });
    $$('.sent', tb).forEach(el => el.onclick = () => playSent(u, u.sents[+el.dataset.i], el));
    $('#hz').onchange = e => { S.set.hideZh = e.target.checked; saveSet(); $('#wl').classList.toggle('hidezh', S.set.hideZh); $('#sl')?.classList.toggle('hidezh', S.set.hideZh); };
    $('#addU').onclick = () => { if (!S.set.sel.includes(u.id)) S.set.sel.push(u.id); saveSet(); toast('已加入背单词 ✅'); };
    $('#playAll').onclick = async () => { const cards = $$('.wcard', tb); for (let k = 0; k < cards.length; k++) { if (!cards[k].isConnected) return; playWord(u.words[k], cards[k]); cards[k].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); await new Promise(r => setTimeout(r, 1900)); } };
  }
  if (tab === 'flash') {
    let k = 0, show = false;
    const draw = () => { const w = u.words[k]; tb.innerHTML = `<div class="flash"><div class="big"><div class="muted">${k + 1} / ${u.words.length}</div>${w.img ? `<img src="${imgOf(w)}" alt="">` : `<div style="font-size:90px">🔤</div>`}<div class="en">${esc(w.en)}</div><div class="ipa">${esc(w.ipa || '')}</div><div class="zh">${show ? esc(w.zh) : '<button class="btn sm ghost" id="sz">👀 看中文</button>'}</div></div>
      <div class="ctrl"><button class="btn ghost" id="pv" ${k ? '' : 'disabled'}>⬅️ 上一个</button><button class="btn" id="sp">🔊 再听</button><button class="btn orange" id="nx">${k < u.words.length - 1 ? '下一个 ➡️' : '🎯 去练一练'}</button></div></div>`;
      playWord(w); $('#sp').onclick = () => playWord(w); if ($('#sz')) $('#sz').onclick = () => { show = true; draw(); };
      $('#pv').onclick = () => { k--; show = false; draw(); }; $('#nx').onclick = () => { if (k < u.words.length - 1) { k++; show = false; draw(); } else location.hash = `#/unit/${u.id}?tab=practice`; };
    }; draw();
  }
  if (tab === 'sents') {
    tb.innerHTML = u.sents.length ? `<div class="row" style="margin-bottom:12px"><span class="muted">点句子听原声朗读</span><span class="spacer"></span><button class="btn sm ghost" id="pa">▶️ 连续播放</button></div><div class="sents">${u.sents.map((s, i) => `<div class="sent" data-i="${i}"><span class="pl">🔈</span><div><div class="e">${esc(s.en)}</div><div class="z">${esc(s.zh)}</div></div></div>`).join('')}</div>` : '<div class="empty">这个单元没有句子</div>';
    if (isExtra(b) && u.sents.length) tb.insertAdjacentHTML('afterbegin', '<p class="note">这是本单元的重点句型，点一下听朗读。</p>');
    $$('.sent', tb).forEach(el => el.onclick = () => playSent(u, u.sents[+el.dataset.i], el));
    if ($('#pa')) $('#pa').onclick = async () => { const els = $$('.sent', tb); for (let k = 0; k < els.length; k++) { if (!els[k].isConnected) return; const s = u.sents[k]; playSent(u, s, els[k]); els[k].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); await new Promise(r => setTimeout(r, Math.max(1500, (s.t ? s.t[1] - s.t[0] : 2000) + 500))); } };
  }
  if (tab === 'practice') {
    tb.innerHTML = `<div class="grid2"><div class="panel"><h3>🖼️ 单词小测</h3><p class="note">看图选词、听音选图、看词选意思${lowGrade(b.id) ? '' : '、拼单词'}，共 10 题</p><button class="btn green" id="pw">开始 ▶️</button></div>
      <div class="panel"><h3>💬 句子挑战</h3><p class="note">连词成句、听句子选意思、句子填空，共 8 题</p><button class="btn purple" id="ps" ${usableSents(u).length ? '' : 'disabled'}>开始 ▶️</button></div></div>`;
    const back = () => router();
    const startW = () => { const pool = b.units.flatMap(x => x.words); const ws = u.words.length >= 10 ? pick(u.words, 10) : [...shuffle(u.words), ...shuffle([...u.words, ...u.words, ...u.words]).slice(0, 10 - u.words.length)]; runQuiz(tb, ws.map(w => makeWordQ(w, pool, lowGrade(b.id))), { onQuit: back, again: startW }); };
    const startS = () => { const ss = usableSents(u); const all = b.units.flatMap(x => usableSents(x)); const list = ss.length >= 8 ? pick(ss, 8) : [...shuffle(ss), ...pick(ss, 8 - ss.length)]; runQuiz(tb, list.map(s => makeSentQ(u, s, all)), { onQuit: back, again: startS }); };
    $('#pw').onclick = startW; $('#ps').onclick = startS;
  }
});



/* 国际音标 */
function exPlay(e, el) { stopAudio(); if (el) { el.classList.add('playing'); playingEl = el; } if (e.au) { player.src = `media/au/${e.au}.mp3`; player.play().catch(() => tts(e.en)); player.onended = () => el && el.classList.remove('playing'); } else { tts(e.en, .8); setTimeout(() => el && el.classList.remove('playing'), 1200); } }
function phoPlay(x, el) { stopAudio(); if (el) { el.classList.add('playing'); playingEl = el; } if (!x.au) return; player.src = `media/ipa/${x.au}`; player.play().catch(() => {}); player.onended = () => el && el.classList.remove('playing'); }
const ipaHL = (ipa, s) => { ipa = ipa || ''; const k = ipa.indexOf(s); return k < 0 ? esc(ipa) : esc(ipa.slice(0, k)) + '<b>' + esc(s) + '</b>' + esc(ipa.slice(k + s.length)); };
const IPA_G = [['单元音', [['长元音', /^单元音·长/], ['短元音', /^单元音·短/]], '#ff6b6b'], ['双元音', [['', /^双元音/]], '#ffa94d'], ['辅音', [['清辅音', /^辅音·清/], ['浊辅音', /^辅音·(浊|鼻音|舌侧|半元音)/]], '#4dabf7']];
route(/^\/ipa$/, async (p, q) => {
  const D = await getJSON('data/ipa.json'); const tab = q.get('tab') || 'learn';
  app().innerHTML = `<div class="hero"><div class="ava">🔤</div><div><h1>国际音标</h1><p>48 个英式音标：20 个元音 + 28 个辅音。点卡片听音标和例词。</p></div></div>
  <div class="tabs">${[['learn', '📖 认音标'], ['quiz', '🎯 音标小测']].map(([k, n]) => `<a class="tab ${k === tab ? 'on' : ''}" href="#/ipa?tab=${k}">${n}</a>`).join('')}</div><div id="ib"></div>`;
  const ib = $('#ib');
  if (tab === 'learn') {
    ib.innerHTML = IPA_G.map(([g, subs, col]) => { const card = ([x, i]) => `<div class="ipa-c" data-i="${i}" style="--c:${col}"><div class="sym">/${esc(x.s)}/</div><div class="g">${esc(/鼻音|舌侧|半元音/.test(x.g) ? x.g.replace(/^.*·/, '') : g === '双元音' ? '双元音' : x.g.replace(/^.*·/, '').replace(/^(清|浊)$/, '$1辅音').replace(/^(长|短)$/, '$1元音'))}</div><div class="exs">${x.ex.map(e => esc(e.en)).join(' · ')}</div></div>`;
      const parts = subs.map(([sn, re]) => [sn, D.map((x, i) => [x, i]).filter(([x]) => re.test(x.g))]); const tot = parts.reduce((s, p) => s + p[1].length, 0);
      return `<div class="section-title">${g} <small>${tot} 个</small></div>` + parts.map(([sn, L]) => `${sn ? `<div class="subt" style="--c:${col}">${sn} <small>${L.length} 个</small></div>` : ''}<div class="ipas">${L.map(card).join('')}</div>`).join(''); }).join('') + '<p class="note" style="margin-top:14px">音标录音为英式发音，取自 GitHub 项目 NZESupB/PhoneticsTV 整理的音源，仅供家庭学习。</p>';
    $$('.ipa-c', ib).forEach(c => c.onclick = () => open(+c.dataset.i));
  }
  function open(i) {
    const x = D[i]; const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="mbox"><button class="btn ghost sm mx">✖</button><div class="sym big psnd" title="听音标">/${esc(x.s)}/ <span class="sp">🔊</span></div><div class="muted">${esc(x.g)}</div><p class="tipx">👄 ${esc(x.tip)}</p><div class="iex">${x.ex.map((e, k) => `<div class="ie" data-k="${k}">${e.img ? `<img src="media/img/${e.img}.webp" alt="">` : '<div class="ph">🔤</div>'}<div class="en">${esc(e.en)}</div><div class="ipa">${ipaHL(e.ipa, x.s)}</div></div>`).join('')}</div>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn ghost sm" id="pv" ${i ? '' : 'disabled'}>⬅️</button><button class="btn sm" id="pp">🔊 听音标</button><button class="btn sm orange" id="pa">▶️ 音标+例词</button><button class="btn ghost sm" id="nx" ${i < D.length - 1 ? '' : 'disabled'}>➡️</button></div></div>`;
    document.body.appendChild(m); const close = () => { stopAudio(); m.remove(); };
    m.onclick = e => { if (e.target === m) close(); }; $('.mx', m).onclick = close;
    $$('.ie', m).forEach(el => el.onclick = () => exPlay(x.ex[+el.dataset.k], el));
    $('.psnd', m).onclick = e => phoPlay(x, e.currentTarget); $('#pp', m).onclick = () => phoPlay(x, $('.psnd', m));
    $('#pa', m).onclick = async () => { phoPlay(x, $('.psnd', m)); await new Promise(r => setTimeout(r, 1800)); const els = $$('.ie', m); for (let k = 0; k < els.length; k++) { if (!els[k].isConnected) return; exPlay(x.ex[k], els[k]); await new Promise(r => setTimeout(r, 1500)); } };
    $('#pv', m).onclick = () => { close(); open(i - 1); }; $('#nx', m).onclick = () => { close(); open(i + 1); };
    phoPlay(x, $('.psnd', m));
  }
  if (tab === 'quiz') {
    const all = D.flatMap((x, i) => x.ex.filter(e => e.ipa).map(e => ({ e, i })));
    const qs = shuffle(all).slice(0, 10).map(({ e, i }) => {
      const r = Math.random();
      if (r < .34 && D[i].au) { const wrong = shuffle(D.map((x, k) => k).filter(k => k !== i)).slice(0, 2); return { kind: '👂 听音标，选出它', prompt: '<div style="font-size:60px">🎧</div>', pho: D[i], opts: shuffle([{ t: '/' + D[i].s + '/', ok: 1 }, ...wrong.map(k => ({ t: '/' + D[k].s + '/', p: D[k] }))]), say: e }; }
      if (r < .67) { const others = shuffle(all.filter(o => o.e.en !== e.en && o.e.ipa !== e.ipa)).slice(0, 2); return { kind: '👀 看音标，选单词', prompt: `<div class="sym">${esc(e.ipa)}</div>`, say: e, opts: shuffle([{ t: e.en, ok: 1, e }, ...others.map(o => ({ t: o.e.en, e: o.e }))]) }; }
      const wrong = shuffle(D.map((x, k) => k).filter(k => k !== i && !(e.ipa || '').includes(D[k].s))).slice(0, 2);
      return { kind: '👂 听单词，找出它含有的音标', prompt: `<div class="en" style="font-size:34px;font-weight:900">${esc(e.en)}</div><div class="muted">${'?'}</div>`, say: e, sym: 1, opts: shuffle([{ t: '/' + D[i].s + '/', ok: 1 }, ...wrong.map(k => ({ t: '/' + D[k].s + '/' }))]) };
    });
    let n = 0, right = 0;
    const step = () => {
      if (n >= qs.length) { ib.innerHTML = `<div class="qcard" style="text-align:center"><div style="font-size:64px">${right >= 8 ? '🏆' : right >= 5 ? '🎉' : '💪'}</div><h2>答对 ${right} / ${qs.length}</h2><div class="row" style="justify-content:center"><a class="btn orange" href="#/ipa?tab=quiz&r=${Date.now()}">再来一组</a><a class="btn ghost" href="#/ipa">回去认音标</a></div></div>`; return; }
      const it = qs[n]; let tried = false;
      ib.innerHTML = `<div class="quiz"><div class="qtop"><div class="qbar"><span style="width:${n / qs.length * 100}%"></span></div><span class="qstars">⭐ ${right}</span></div><div class="qcard"><span class="kind">${it.kind}</span><div class="prompt">${it.sym ? it.prompt.replace('<div class="muted">?</div>', '') : it.prompt}</div><button class="btn ghost sm" id="sp">🔊 听一听</button><div class="opts one">${it.opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div class="feedback" id="fb"></div><div class="qfoot" id="nx" hidden><button class="btn orange">下一题 ➡️</button></div></div></div>`;
      $('#sp').onclick = () => it.pho ? phoPlay(it.pho) : exPlay(it.say); if (it.pho) phoPlay(it.pho); else if (it.sym) exPlay(it.say);
      $$('.opt', ib).forEach(b => b.onclick = () => { const o = it.opts[+b.dataset.k];
        if (o.ok) { b.classList.add('right'); $$('.opt', ib).forEach(x => x.disabled = true); $('#fb').className = 'feedback ok'; $('#fb').textContent = (tried ? '对啦！' : '答对啦！⭐') + ' ' + (it.pho ? '/' + it.pho.s + '/ 例词 ' + it.say.en : it.say.en + ' ' + (it.say.ipa || '')); playDing(); if (!tried) { right++; addStar(); } if (it.pho) phoPlay(it.pho); else exPlay(it.say); $('#nx').hidden = false; $('#nx button').onclick = () => { n++; step(); }; }
        else { tried = true; b.classList.add('wrong'); b.disabled = true; if (o.e) exPlay(o.e); else if (o.p) phoPlay(o.p); } });
    };
    step();
  }
});

/* 句子归到单词下 */
const normS = t => ' ' + t.toLowerCase().replace(/[’‘]/g, "'").replace(/(\w)-(\w)/g, '$1$2').replace(/\.\.\.|…/g, ' ').replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
function wordRe(en) {
  const p = normS(en).trim(); if (!p) return null;
  const parts = p.split(' ').map(x => x.replace(/'/g, "'?"));
  const last = parts.pop(); const tail = `${last}(?:s|es|'s|d|ed|ing)?`;
  const y = /y$/.test(last) ? `|${last.slice(0, -1)}ies` : '';
  return new RegExp(` ${parts.length ? parts.join(' ') + ' ' : ''}(?:${tail}${y}) `);
}
const STOP = new Set(['is', 'a', 'an', 'the', 'i', 'you', 'it', 'this', 'that', 'my', 'your', 'and', 'to', 'in', 'on', 'are', 'am', 'he', 'she', 'we', 'they', 'what', "it's", 'yes', 'no', 'not', 'do']);
function matchSents(u) {
  const by = {}, used = new Set(), S2 = u.sents.map(s => normS(s.en));
  const order = u.words.map((w, i) => [i, normS(w.en).trim()]).sort((x, y) => y[1].length - x[1].length);
  const hits = order.map(([i, p]) => { const re = wordRe(u.words[i].en); return [i, re && p ? S2.map((s, k) => re.test(s) ? k : -1).filter(k => k >= 0) : [], STOP.has(p)]; });
  for (const pass of [0, 1]) for (const [i, ks, stop] of hits) { if (stop !== !!pass) continue; for (const k of ks) { if ((by[i] || []).length >= 2) break; if (used.has(k)) continue; (by[i] = by[i] || []).push(k); used.add(k); } }
  for (const [i, ks, stop] of hits) if (!(by[i] || []).length && ks.length && !stop) (by[i] = [ks[0]]);
  return { by, rest: u.sents.map((_, k) => k).filter(k => !used.has(k)) };
}
function hl(sent, en) {
  const p = en.replace(/\.\.\.|…|[!！?？.,，]/g, '').trim(); if (!p) return esc(sent);
  const re = new RegExp(`(^|[^A-Za-z])(${p.split(/\s+/).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s,-]+')}(?:s|es|'s|d|ed|ing)?)(?![A-Za-z])`, 'i');
  const m = sent.match(re); if (!m) return esc(sent);
  const at = m.index + m[1].length; return esc(sent.slice(0, at)) + '<b>' + esc(m[2]) + '</b>' + esc(sent.slice(at + m[2].length));
}

/* 课外教材 */
route(/^\/extra$/, async () => {
  const idx = await loadIndex(); const ex = idx.filter(isExtra);
  app().innerHTML = `<div class="section-title">🌈 课外教材 <small>按单元学单词、听句型、做练习，也能加入背单词</small></div><div class="books">${ex.map((b, i) => bookCard(b, i + 6)).join('')}</div>
  <p class="note" style="margin-top:16px">Show and Tell 1、2 为牛津第 2 版，用美音朗读；Power Up 1 为剑桥 2018 第 1 版，用英音。单词和重点句型按出版社的教学目录整理；Power Up 有真人发音的词沿用课本录音，其余用设备自带的语音朗读。</p>`;
});

/* 语法 */
route(/^\/grammar$/, async () => {
  S.grammar = S.grammar || await getJSON('data/grammar.json');
  app().innerHTML = `<div class="section-title">🧩 小学语法乐园 <small>按学到的年级排好啦，先看讲解再闯关</small></div><div class="glist">${S.grammar.map(g => `<a class="gitem" href="#/grammar/${g.id}"><span class="ic">${g.icon}</span><div><h3>${esc(g.title)}</h3><p>${esc(g.grade)} · ${esc(g.units)}</p></div></a>`).join('')}</div>`;
});
route(/^\/grammar\/([\w-]+)$/, async m => {
  S.grammar = S.grammar || await getJSON('data/grammar.json'); const g = S.grammar.find(x => x.id === m[1]); if (!g) throw new Error('没有这个语法');
  const show = () => {
    app().innerHTML = `<div class="crumbs"><a href="#/grammar">🧩 语法</a> › ${esc(g.title)}</div><div class="panel gdetail"><div class="row"><span style="font-size:52px">${g.icon}</span><div><h2>${esc(g.title)}</h2><div class="muted">${esc(g.grade)} · ${esc(g.units)}</div></div></div>
    <div class="formula">${esc(g.formula)}</div><ul>${g.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul><h3 style="margin-top:14px">🔊 听例句</h3>${g.examples.map((e, i) => `<div class="ex" data-i="${i}">🔈 <div><b>${esc(e[0])}</b><br><span>${esc(e[1])}</span></div></div>`).join('')}
    <div class="qfoot"><button class="btn green" id="gq">🎯 闯关练习（${g.quiz.length} 题）</button></div></div>`;
    $$('.ex').forEach(el => el.onclick = () => { stopAudio(); tts(g.examples[+el.dataset.i][0]); });
    $('#gq').onclick = start;
  };
  const start = () => {
    const qs = shuffle(g.quiz).map(it => ({ kind: 'gram', it }));
    let i = 0, right = 0; const box = app();
    const step = () => {
      if (i >= qs.length) { const pct = right / qs.length; if (pct >= .6) confetti(); box.innerHTML = `<div class="panel done"><div class="trophy">${pct >= .9 ? '🏆' : pct >= .6 ? '🥇' : '💪'}</div><h2>${pct >= .9 ? '语法小达人！' : pct >= .6 ? '很不错！' : '再看看讲解吧'}</h2><p class="muted">一次答对 ${right} / ${qs.length} 题</p><div class="qfoot"><button class="btn green" id="ag">🔁 再来</button><button class="btn ghost" id="bk">看讲解</button></div></div>`; $('#ag').onclick = start; $('#bk').onclick = show; return; }
      const it = qs[i].it; let tried = false;
      const opts = shuffle(it.o.map((t, k) => ({ t, ok: k === it.a })));
      box.innerHTML = `<div class="quiz"><div class="qtop"><button class="btn ghost sm" id="qq">✖</button><div class="qbar"><span style="width:${i / qs.length * 100}%"></span></div><span class="qstars">⭐ ${right}</span></div><div class="qcard"><span class="kind">${g.icon} ${esc(g.title)}</span><div class="prompt" style="font-size:24px">${esc(it.q)}</div><div class="opts ${opts.length === 3 ? 'one' : ''}">${opts.map((o, k) => `<button class="opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div class="feedback" id="fb"></div><div class="qfoot" id="nx" hidden><button class="btn orange">下一题 ➡️</button></div></div></div>`;
      $('#qq').onclick = show;
      $$('.opt').forEach(b => b.onclick = () => { const o = opts[+b.dataset.k]; if (o.ok) { b.classList.add('right'); $$('.opt').forEach(x => x.disabled = true); $('#fb').className = 'feedback ok'; $('#fb').textContent = tried ? '对啦，记住它！' : '答对啦！⭐'; playDing(); if (!tried) { right++; addStar(); } const sent = it.q.includes('___') ? it.q.replace('___', o.t) : ''; if (/^[A-Za-z]/.test(sent)) tts(sent.replace(/（.*?）|\(.*?\)/g, '')); $('#nx').hidden = false; $('#nx button').onclick = () => { i++; step(); }; } else { tried = true; b.classList.add('wrong'); b.disabled = true; $('#fb').className = 'feedback no'; $('#fb').textContent = '再想想哦～'; } });
    };
    step();
  };
  show();
});

/* 练句子：选单元做句子挑战 */
route(/^\/practice$/, async (m, p) => {
  const idx = await loadIndex(); const bid = p.get('b') || S.set.book; const b = await loadBook(bid);
  app().innerHTML = `<div class="section-title">🎯 练句子 <small>选单元，做连词成句、听句选义、句子填空</small></div>
  <div class="chips" style="margin-bottom:14px">${idx.map(x => `<a class="chip ${x.id === bid ? 'on' : ''}" href="#/practice?b=${x.id}">${x.id}</a>`).join('')}</div>
  <div class="units">${b.units.map(u => `<a class="unit" href="#/unit/${u.id}?tab=practice"><div class="no" style="background:${ucol(u.no)}">${unum(u.no)}</div><div><h3>${esc(u.title.replace(/^Unit \d+\s*/, ''))}</h3><p>${usableSents(u).length} 个可练句子</p></div></a>`).join('')}</div>
  <div class="panel" style="margin-top:16px"><h3>🔀 整本书混合挑战</h3><p class="note">从 ${b.id} 全部单元随机抽 10 道句子题</p><button class="btn purple" id="mix">开始 ▶️</button></div>`;
  $('#mix').onclick = () => { const all = b.units.flatMap(u => usableSents(u).map(s => [u, s])); const allS = all.map(x => x[1]); const box = app(); const go = () => runQuiz(box, pick(all, 10).map(([u, s]) => makeSentQ(u, s, allS)), { onQuit: () => router(), again: go }); go(); };
});

/* 背单词 */
route(/^\/review$/, async () => {
  const idx = await loadIndex(); const sel = new Set(S.set.sel); const words = await selectedWords(); const st = srsStats(words);
  app().innerHTML = `<div class="section-title">🧠 艾宾浩斯背单词 <small>按遗忘曲线安排复习：20 分钟 → 1 → 2 → 4 → 7 → 15 → 30 → 60 天</small></div>
  <div class="grid2"><div class="panel"><div class="stats"><div class="stat due"><b>${st.due}</b><span>今天要复习</span></div><div class="stat new"><b>${st.nw}</b><span>还没学</span></div><div class="stat lrn"><b>${st.lrn}</b><span>学习中</span></div><div class="stat ok"><b>${st.ok}</b><span>已掌握 🏅</span></div></div>
    <div style="margin-top:14px" class="row"><b>每次新学</b>${[5, 10, 15, 20].map(n => `<button class="chip ${S.set.newPer === n ? 'on' : ''}" data-np="${n}">${n} 个</button>`).join('')}</div>
    <div style="margin-top:10px" class="row"><b>题型</b>${[['auto', '按年级自动'], ['easy', '只选择题'], ['all', '含拼写']].map(([k, n]) => `<button class="chip ${S.set.types === k ? 'on' : ''}" data-ty="${k}">${n}</button>`).join('')}</div>
    <div class="qfoot" style="justify-content:flex-start"><button class="btn green" id="go" ${st.total ? '' : 'disabled'}>▶️ 开始（复习 ${Math.min(st.due, 50)} + 新学 ${Math.min(st.nw, S.set.newPer)}）</button></div>
    <p class="note">${S.user ? `☁️ 已登录 ${esc(S.user.nickname)}，进度自动保存到云端，换设备也能接着背。` : '💡 现在进度只存在这台设备上。<a href="#/me"><b>注册/登录</b></a>后可以云端保存、换设备接着背。'}</p>
    <div class="cal" title="最近 28 天的星星">${[...Array(28)].map((_, i) => { const d = new Date(Date.now() - (27 - i) * 864e5); const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; const v = S.set.days[k] || 0; return `<i class="${v >= 30 ? 'l3' : v >= 10 ? 'l2' : v ? 'l1' : ''}" title="${k}：${v} ⭐"></i>`; }).join('')}</div></div>
  <div class="panel picker"><div class="row" style="margin-bottom:10px"><h3>📋 选词：按年级 / 单元</h3><span class="spacer"></span><span class="muted" id="selCnt">已选 ${sel.size} 个单元 · ${st.total} 词</span></div>
    ${idx.map(b => { const n = b.units.filter(u => sel.has(u.id)).length; return `<div class="bk ${b.id === S.set.book ? 'open' : ''}" data-b="${b.id}"><div class="bk-h"><span>${BOOK_EMO[b.id]} ${b.id} ${b.name}</span><span class="cnt">${n ? `已选 ${n}/${b.units.length}` : ''}</span><span>▾</span></div><div class="bk-b"><span class="ck ${n === b.units.length ? 'on' : ''}" data-all="${b.id}">全选本册</span>${b.units.map(u => `<span class="ck ${sel.has(u.id) ? 'on' : ''}" data-u="${u.id}">${/^PP/.test(u.id) ? u.no + '集' : u.no ? 'U' + u.no : 'Hello'} ${esc(u.title.replace(/^Unit \d+\s*/, '').slice(0, 16))} · ${u.n}</span>`).join('')}</div></div>`; }).join('')}
    <div class="row"><button class="btn sm ghost" id="clr">清空选择</button></div></div></div>`;
  $$('[data-np]').forEach(b => b.onclick = () => { S.set.newPer = +b.dataset.np; saveSet(); router(); });
  $$('[data-ty]').forEach(b => b.onclick = () => { S.set.types = b.dataset.ty; saveSet(); router(); });
  $$('.bk-h').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));
  const save = () => { S.set.sel = [...sel]; saveSet(); };
  $$('[data-u]').forEach(c => c.onclick = () => { const id = c.dataset.u; sel.has(id) ? sel.delete(id) : sel.add(id); save(); refresh(); });
  $$('[data-all]').forEach(c => c.onclick = () => { const b = idx.find(x => x.id === c.dataset.all); const all = b.units.every(u => sel.has(u.id)); b.units.forEach(u => all ? sel.delete(u.id) : sel.add(u.id)); save(); refresh(); });
  $('#clr').onclick = () => { sel.clear(); save(); refresh(); };
  const refresh = () => { const open = $$('.bk.open').map(e => e.dataset.b); router().then(() => $$('.bk').forEach(e => e.classList.toggle('open', open.includes(e.dataset.b)))); };
  $('#go').onclick = () => startReview(words);
});
function startReview(words) {
  const now = Date.now(); const uniq = []; const seen = new Set(); for (const w of words) if (!seen.has(w.key)) { seen.add(w.key); uniq.push(w); }
  const due = uniq.filter(w => rec(w.key) && rec(w.key).l < MASTER && rec(w.key).d <= now).sort((a, b) => rec(a.key).d - rec(b.key).d).slice(0, 50);
  const fresh = uniq.filter(w => !rec(w.key)).slice(0, S.set.newPer);
  if (!due.length && !fresh.length) { toast('今天的都背完啦！🎉 明天再来～'); return; }
  const box = app();
  // 新词先看卡片
  const learn = (k, done) => {
    if (k >= fresh.length) return done();
    const w = fresh[k];
    box.innerHTML = `<div class="flash"><div class="crumbs">🆕 认识新单词 ${k + 1} / ${fresh.length}</div><div class="big">${w.img ? `<img src="${imgOf(w)}" alt="">` : `<div style="font-size:90px">🔤</div>`}<div class="en">${esc(w.en)}</div><div class="ipa">${esc(w.ipa || '')}</div><div class="zh">${esc(w.zh)}</div><div class="muted" style="margin-top:6px">${w.book} · ${w.unit.split('-')[1]}</div></div><div class="ctrl"><button class="btn" id="sp">🔊 再听</button><button class="btn orange" id="nx">记住了 ➡️</button></div></div>`;
    playWord(w); $('#sp').onclick = () => playWord(w); $('#nx').onclick = () => learn(k + 1, done);
  };
  const pool = uniq.length >= 6 ? uniq : uniq.concat(Object.values(S.books).flatMap(b => b.units.flatMap(u => u.words)));
  const kindFor = w => { if (S.set.types === 'easy') return pick(wordKinds(w, pool, true), 1)[0]; if (S.set.types === 'all') return pick(wordKinds(w, pool, false), 1)[0]; return undefined; };
  const mk = w => ({ w, q: makeWordQ(w, pool, S.set.types === 'auto' ? lowGrade(w.book) : S.set.types === 'easy', kindFor(w)) });
  const list = shuffle([...due, ...fresh]).map(mk);
  const once = new Set();
  learn(0, () => runQuiz(box, list, {
    onAnswer: (it, ok) => { if (!once.has(it.w.key)) { once.add(it.w.key); grade(it.w.key, ok, it.w); } },
    requeue: it => mk(it.w),
    onQuit: () => { sync(); location.hash = '#/review'; router(); },
  }));
}

/* 我的 */
route(/^\/me$/, async () => {
  if (S.user) {
    let av = S.user.avatar;
    app().innerHTML = `<div class="hero"><div class="ava">${S.user.avatar}</div><div><h1>${esc(S.user.nickname)}</h1><p>账号：${esc(S.user.username)} · ⭐ ${S.set.stars || 0} 颗星星</p></div><div class="go"><button class="btn ghost sm" id="lo">退出登录</button></div></div>
    <div class="grid2"><div class="panel"><h3>✏️ 修改资料</h3><div class="form" style="margin-top:10px"><label>昵称<input id="nk" value="${esc(S.user.nickname)}" maxlength="20"></label><div><b>头像</b><div class="avatars" style="margin-top:6px">${AVATARS.map(a => `<button class="${a === av ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div></div>
      <label>原密码（改密码才填）<input id="op" type="password" autocomplete="current-password"></label><label>新密码<input id="np" type="password" autocomplete="new-password"></label><button class="btn green" id="sv">保存</button></div></div>
    <div class="panel"><h3>☁️ 进度</h3><p class="note">背单词进度会自动同步到云端。也可以导出一份备份。</p><div class="row"><button class="btn sm" id="sy">立即同步</button><button class="btn sm ghost" id="ex">导出备份</button><label class="btn sm ghost">导入备份<input type="file" id="im" accept=".json" hidden></label></div></div></div>`;
    $$('[data-a]').forEach(b => b.onclick = () => { av = b.dataset.a; $$('[data-a]').forEach(x => x.classList.toggle('on', x === b)); });
    $('#sv').onclick = async () => { try { await api('profile', { method: 'POST', body: { nickname: $('#nk').value, avatar: av, old_password: $('#op').value, new_password: $('#np').value } }); S.user.nickname = $('#nk').value || S.user.nickname; S.user.avatar = av; updateNav(); toast('保存好啦 ✅'); router(); } catch (e) { toast(e.message); } };
    $('#lo').onclick = async () => { await sync(); await api('logout', { method: 'POST' }); S.user = null; updateNav(); toast('已退出，本机进度还在'); router(); };
    $('#sy').onclick = async () => { localStorage.setItem(LS.dirty, '1'); await sync(); toast('同步完成 ☁️'); };
  } else {
    let mode = 'login', av = '🐼';
    const draw = () => {
      app().innerHTML = `<div class="grid2"><div class="panel"><div class="tabs"><button class="tab ${mode === 'login' ? 'on' : ''}" data-m="login">登录</button><button class="tab ${mode === 'reg' ? 'on' : ''}" data-m="reg">注册新账号</button></div>
      <div class="form"><label>用户名<input id="un" autocomplete="username" maxlength="20" placeholder="字母、数字或中文"></label><label>密码<input id="pw" type="password" autocomplete="${mode === 'reg' ? 'new-password' : 'current-password'}" placeholder="至少 4 位"></label>
      ${mode === 'reg' ? `<label>小朋友的昵称<input id="nk" maxlength="20" placeholder="比如：小明"></label>${S.regCode ? '<label>邀请码<input id="cd"></label>' : ''}<div><b>选个头像</b><div class="avatars" style="margin-top:6px">${AVATARS.map(a => `<button class="${a === av ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div></div>` : ''}
      <button class="btn green" id="ok">${mode === 'reg' ? '注册并登录' : '登录'}</button></div></div>
      <div class="panel"><h3>为什么要注册？</h3><p class="note">不注册也能学。注册后，背单词的进度、星星和选好的单元都会保存到云端，在 iPad、手机、电脑上登录同一个账号就能接着背。每个小朋友建一个账号就好。</p></div></div>`;
      $$('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
      $$('[data-a]').forEach(b => b.onclick = () => { av = b.dataset.a; $$('[data-a]').forEach(x => x.classList.toggle('on', x === b)); });
      $('#ok').onclick = async () => {
        try {
          const body = { username: $('#un').value.trim(), password: $('#pw').value };
          if (mode === 'reg') Object.assign(body, { nickname: $('#nk').value.trim(), avatar: av, code: $('#cd')?.value });
          const j = await api(mode === 'reg' ? 'register' : 'login', { method: 'POST', body });
          S.user = j.user; updateNav();
          localStorage.setItem(LS.dirty, '1'); await sync(); await sync(true);
          toast(mode === 'reg' ? '注册成功，欢迎！🎉' : '欢迎回来！'); location.hash = '#/';
        } catch (e) { toast(e.message); }
      };
    };
    draw();
  }
  if ($('#ex')) $('#ex').onclick = () => { const blob = new Blob([JSON.stringify({ srs: S.srs, settings: S.set }, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `英语乐园进度-${today()}.json`; a.click(); };
  if ($('#im')) $('#im').onchange = async e => { try { const j = JSON.parse(await e.target.files[0].text()); S.srs = mergeSrs(S.srs, j.srs || {}); saveSrs(); toast('导入成功'); } catch (er) { toast('文件不对哦'); } };
});

window.addEventListener('hashchange', router);
(async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  await initUser(); router();
  speechSynthesis?.getVoices();
})();
