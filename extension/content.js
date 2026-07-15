// SAMAQU — inject panel ke WhatsApp Web

const STORAGE_KEY_URL   = 'samaqu_api_url';
const STORAGE_KEY_TOKEN = 'samaqu_token';

let panel     = null;
let templates = [];   // [{ category, templates: [{id, text}] }]

// ── Inject tombol + panel ────────────────────────────────────────────────────
function injectUI() {
  if (document.getElementById('samaqu-btn')) return;

  // Tombol trigger
  const btn = document.createElement('div');
  btn.id = 'samaqu-btn';
  btn.title = 'SAMAQU Template';
  btn.innerHTML = `<span>SQ</span>`;
  btn.addEventListener('click', togglePanel);
  document.body.appendChild(btn);

  // Panel utama
  panel = document.createElement('div');
  panel.id = 'samaqu-panel';
  panel.innerHTML = `
    <div id="sq-header">
      <span id="sq-title">📋 SAMAQU</span>
      <input id="sq-search" type="text" placeholder="Cari template...">
      <button id="sq-close">✕</button>
    </div>
    <div id="sq-tabs"></div>
    <div id="sq-list"></div>
    <div id="sq-status"></div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#sq-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  panel.querySelector('#sq-search').addEventListener('input', e => {
    renderList(e.target.value.toLowerCase());
  });

  loadTemplates();
}

// ── Toggle panel ─────────────────────────────────────────────────────────────
function togglePanel() {
  if (!panel) return;
  const visible = panel.style.display === 'flex';
  panel.style.display = visible ? 'none' : 'flex';
  if (!visible) loadTemplates();
}

// ── Load templates dari backend ───────────────────────────────────────────────
async function loadTemplates() {
  const status = panel.querySelector('#sq-status');
  status.textContent = 'Memuat...';

  const stored = await chrome.storage.local.get([STORAGE_KEY_URL, STORAGE_KEY_TOKEN]);
  const apiUrl = stored[STORAGE_KEY_URL] || '';

  if (!apiUrl) {
    status.textContent = '⚠️ API URL belum diisi — klik ikon SQ di toolbar';
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/templates`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // data: [{id, name, templates:[{id,text}]}] atau [{category:{name},templates:[]}]
    templates = normalizeData(data);
    status.textContent = '';
    renderTabs();
    renderList('');
  } catch (e) {
    status.textContent = `❌ Gagal: ${e.message}`;
  }
}

function normalizeData(raw) {
  // Support both shapes from backend
  return raw.map(item => ({
    category: item.name || item.category?.name || 'Lainnya',
    templates: (item.templates || []).map(t => ({
      id:   t.id,
      text: t.content || t.text || ''
    }))
  }));
}

// ── Render tabs kategori ──────────────────────────────────────────────────────
let activeCategory = null;

function renderTabs() {
  const tabs = panel.querySelector('#sq-tabs');
  tabs.innerHTML = '';
  templates.forEach((cat, i) => {
    const tab = document.createElement('button');
    tab.className = 'sq-tab' + (i === 0 ? ' sq-tab-active' : '');
    tab.textContent = cat.category;
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.sq-tab').forEach(t => t.classList.remove('sq-tab-active'));
      tab.classList.add('sq-tab-active');
      activeCategory = cat.category;
      renderList(panel.querySelector('#sq-search').value.toLowerCase());
    });
    tabs.appendChild(tab);
  });
  if (templates.length > 0) activeCategory = templates[0].category;
}

// ── Render list template ──────────────────────────────────────────────────────
function renderList(query) {
  const list = panel.querySelector('#sq-list');
  list.innerHTML = '';

  const cats = activeCategory
    ? templates.filter(c => c.category === activeCategory)
    : templates;

  let found = 0;
  cats.forEach(cat => {
    cat.templates
      .filter(t => !query || t.text.toLowerCase().includes(query))
      .forEach(t => {
        found++;
        const item = document.createElement('div');
        item.className = 'sq-item';
        item.textContent = t.text;
        item.addEventListener('click', () => insertText(t.text));
        list.appendChild(item);
      });
  });

  if (found === 0) {
    const empty = document.createElement('div');
    empty.className = 'sq-empty';
    empty.textContent = query ? 'Template tidak ditemukan' : 'Belum ada template';
    list.appendChild(empty);
  }
}

// ── Insert teks ke WA Web input ───────────────────────────────────────────────
function insertText(text) {
  // WA Web pakai contenteditable div, bukan <input>
  const input = document.querySelector('[contenteditable="true"][data-tab="10"]')
             || document.querySelector('footer [contenteditable="true"]')
             || document.querySelector('[contenteditable="true"]');

  if (!input) {
    alert('Klik dulu di kolom chat WhatsApp sebelum memilih template');
    return;
  }

  input.focus();
  // Sisipkan teks dengan execCommand supaya WA mengenali perubahan
  document.execCommand('insertText', false, text);

  // Tutup panel setelah insert
  panel.style.display = 'none';
}

// ── Tunggu WA Web selesai load ────────────────────────────────────────────────
const observer = new MutationObserver(() => {
  if (document.querySelector('footer') || document.querySelector('[data-tab="10"]')) {
    injectUI();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Coba langsung juga (kalau sudah load)
if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
