// SAMAQU Extension — full featured panel

const KEY_URL   = 'samaqu_api_url';
const KEY_TOKEN = 'samaqu_token';

let panel      = null;
let templates  = [];
let activeTab  = 'autotext';
let activeCat  = null;

// ── Inject UI ────────────────────────────────────────────────────────────────
function injectUI() {
  if (document.getElementById('samaqu-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'samaqu-btn';
  btn.innerHTML = 'SQ';
  btn.title = 'SAMAQU';
  btn.addEventListener('click', togglePanel);
  document.body.appendChild(btn);

  panel = document.createElement('div');
  panel.id = 'samaqu-panel';
  panel.innerHTML = `
    <div id="sq-header">
      <span id="sq-logo">⌨️ SAMAQU</span>
      <button id="sq-close" title="Tutup">✕</button>
    </div>

    <!-- AUTO TEXT -->
    <div id="sq-autotext" class="sq-page">
      <div id="sq-search-wrap">
        <input id="sq-search" type="text" placeholder="🔍  Cari template...">
      </div>
      <div id="sq-tabs"></div>
      <div id="sq-list"></div>
    </div>

    <!-- INVOICE -->
    <div id="sq-invoice" class="sq-page" style="display:none">
      <div id="sq-inv-form">
        <div class="sq-row">
          <div class="sq-field"><label>Pembeli</label><input id="inv-buyer" placeholder="Nama pembeli"></div>
          <div class="sq-field"><label>Produk</label><input id="inv-product" placeholder="Nama produk"></div>
        </div>
        <div class="sq-row">
          <div class="sq-field"><label>Qty</label><input id="inv-qty" type="number" placeholder="1" value="1"></div>
          <div class="sq-field"><label>Harga (Rp)</label><input id="inv-price" type="number" placeholder="0"></div>
        </div>
        <div class="sq-row">
          <div class="sq-field">
            <label>Jasa Kirim</label>
            <select id="inv-shipping">
              <option>Gojek Instant</option>
              <option>J&amp;T Express</option>
              <option>Lalamove</option>
              <option>SiCepat</option>
              <option>JNE</option>
              <option>Anteraja</option>
              <option>Shopee Express</option>
            </select>
          </div>
          <div class="sq-field"><label>Ongkir (Rp)</label><input id="inv-ongkir" type="number" placeholder="0"></div>
        </div>
        <button id="inv-generate">📋 Generate &amp; Kirim ke Chat</button>
      </div>
    </div>

    <!-- PENDING -->
    <div id="sq-pending" class="sq-page" style="display:none">
      <div id="sq-pending-list"></div>
      <div id="sq-pending-empty" style="display:none">Tidak ada order pending 🎉</div>
    </div>

    <!-- EMOJI -->
    <div id="sq-emoji" class="sq-page" style="display:none">
      <div id="sq-emoji-tabs"></div>
      <div id="sq-emoji-grid"></div>
    </div>

    <!-- BOTTOM NAV -->
    <div id="sq-nav">
      <button class="sq-nav-btn sq-nav-active" data-tab="autotext">📋<span>Auto Text</span></button>
      <button class="sq-nav-btn" data-tab="invoice">🧾<span>Invoice</span></button>
      <button class="sq-nav-btn" data-tab="pending">⏳<span>Pending</span></button>
      <button class="sq-nav-btn" data-tab="emoji">😊<span>Emoji</span></button>
    </div>

    <div id="sq-status"></div>
  `;
  document.body.appendChild(panel);

  // Close
  panel.querySelector('#sq-close').addEventListener('click', () => panel.style.display = 'none');

  // Nav tabs
  panel.querySelectorAll('.sq-nav-btn').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  // Search
  panel.querySelector('#sq-search').addEventListener('input', e => renderList(e.target.value.toLowerCase()));

  // Invoice generate
  panel.querySelector('#inv-generate').addEventListener('click', generateInvoice);

  loadTemplates();
  setupEmoji();
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  panel.querySelectorAll('.sq-page').forEach(p => p.style.display = 'none');
  panel.querySelectorAll('.sq-nav-btn').forEach(b => b.classList.remove('sq-nav-active'));
  panel.querySelector(`#sq-${tab}`).style.display = 'flex';
  panel.querySelector(`[data-tab="${tab}"]`).classList.add('sq-nav-active');
  if (tab === 'pending') loadPending();
}

// ── Toggle panel ──────────────────────────────────────────────────────────────
function togglePanel() {
  if (!panel) return;
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  if (panel.style.display === 'flex') loadTemplates();
}

// ── Templates ─────────────────────────────────────────────────────────────────
async function loadTemplates() {
  const status = panel.querySelector('#sq-status');
  const stored = await chrome.storage.local.get([KEY_URL]);
  const apiUrl = stored[KEY_URL] || '';
  if (!apiUrl) { status.textContent = '⚠️ API URL belum diisi'; return; }
  try {
    const res = await fetch(`${apiUrl}/templates`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    templates = data.map(item => ({
      category: item.name || item.category?.name || 'Lainnya',
      items: (item.templates || []).map(t => t.content || t.text || '')
    }));
    status.textContent = '';
    renderTabs();
    renderList('');
  } catch (e) {
    status.textContent = `❌ ${e.message}`;
  }
}

function renderTabs() {
  const tabs = panel.querySelector('#sq-tabs');
  tabs.innerHTML = '';
  templates.forEach((cat, i) => {
    const t = document.createElement('button');
    t.className = 'sq-cat' + (i === 0 ? ' sq-cat-active' : '');
    t.textContent = cat.category;
    t.addEventListener('click', () => {
      tabs.querySelectorAll('.sq-cat').forEach(x => x.classList.remove('sq-cat-active'));
      t.classList.add('sq-cat-active');
      activeCat = cat.category;
      renderList(panel.querySelector('#sq-search').value.toLowerCase());
    });
    tabs.appendChild(t);
  });
  if (templates.length) activeCat = templates[0].category;
}

function renderList(query) {
  const list = panel.querySelector('#sq-list');
  list.innerHTML = '';
  const cats = activeCat ? templates.filter(c => c.category === activeCat) : templates;
  let found = 0;
  cats.forEach(cat => {
    cat.items.filter(t => !query || t.toLowerCase().includes(query)).forEach(text => {
      found++;
      const item = document.createElement('div');
      item.className = 'sq-item';
      item.textContent = text;
      item.addEventListener('click', () => { insertText(text); });
      list.appendChild(item);
    });
  });
  if (!found) {
    const e = document.createElement('div');
    e.className = 'sq-empty';
    e.textContent = query ? 'Tidak ditemukan' : 'Belum ada template';
    list.appendChild(e);
  }
}

// ── Invoice ───────────────────────────────────────────────────────────────────
function generateInvoice() {
  const buyer    = panel.querySelector('#inv-buyer').value.trim() || '-';
  const product  = panel.querySelector('#inv-product').value.trim() || '-';
  const qty      = parseInt(panel.querySelector('#inv-qty').value) || 1;
  const price    = parseFloat(panel.querySelector('#inv-price').value) || 0;
  const ongkir   = parseFloat(panel.querySelector('#inv-ongkir').value) || 0;
  const shipping = panel.querySelector('#inv-shipping').value;
  const fmt = v => new Intl.NumberFormat('id-ID').format(v);
  const total = price * qty + ongkir;
  const text = `🧾 *INVOICE SAMAQU*
Pembeli  : ${buyer}
Produk   : ${product}
Qty      : ${qty} pcs
Subtotal : Rp ${fmt(price * qty)}
Kurir    : ${shipping}
Ongkir   : Rp ${fmt(ongkir)}
*TOTAL   : Rp ${fmt(total)}*`;
  insertText(text);
}

// ── Pending orders ────────────────────────────────────────────────────────────
async function loadPending() {
  const listEl = panel.querySelector('#sq-pending-list');
  const emptyEl = panel.querySelector('#sq-pending-empty');
  listEl.innerHTML = '<div class="sq-empty">Memuat...</div>';
  emptyEl.style.display = 'none';

  const stored = await chrome.storage.local.get([KEY_URL, KEY_TOKEN]);
  const apiUrl = stored[KEY_URL] || '';
  const token  = stored[KEY_TOKEN] || '';
  if (!apiUrl || !token) {
    listEl.innerHTML = '<div class="sq-empty">⚠️ Isi API URL & JWT Token di pengaturan</div>';
    return;
  }
  try {
    const res = await fetch(`${apiUrl}/orders`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const orders = (await res.json()).filter(o => o.status?.toLowerCase() === 'pending');
    listEl.innerHTML = '';
    if (!orders.length) { emptyEl.style.display = 'block'; return; }
    orders.forEach(order => {
      const el = document.createElement('div');
      el.className = 'sq-pending-item';
      el.innerHTML = `<div class="sq-pending-name">${order.buyerName || 'Pembeli'} <span class="sq-badge">Pending</span></div>
        <div class="sq-pending-sub">Order #${order.id}</div>
        <button class="sq-pending-btn">Minta Bukti Transfer</button>`;
      el.querySelector('.sq-pending-btn').addEventListener('click', () => {
        const name = order.buyerName || 'Kakak';
        insertText(`Halo ${name} 😊\n\nPesanan #${order.id} sudah kami terima ya kak.\nMohon kirimkan bukti pembayaran ke sini agar pesanan segera kami proses.\n\nTerima kasih! 🙏`);
      });
      listEl.appendChild(el);
    });
  } catch (e) {
    listEl.innerHTML = `<div class="sq-empty">❌ ${e.message}</div>`;
  }
}

// ── Emoji ─────────────────────────────────────────────────────────────────────
const EMOJI_CATS = {
  '😊': ['😊','😍','😂','🤣','😁','😄','🥰','😘','🤗','🤩','😎','🥳','😜','😝','😛','🤑','😏','😒','🙄','😔','😢','😭','😤','😠','🤬','🤯','😳','😱','😰','🤔','😶','😐','😬','🙃','😴','😵','🥴','🤢','🤧','😷','😈','👿','💀','👻','😺','😸','😹','😻'],
  '👋': ['👋','🤚','✋','👌','✌️','🤞','🤟','👈','👉','👆','👇','👍','👎','✊','👊','👏','🙌','🤝','🙏','💪','🤳','💅'],
  '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
  '🎉': ['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🎵','🎶','✨','🌟','💫','⭐','🌈','🎆','🎇'],
  '💼': ['💰','💵','💸','💳','📈','📉','📊','💼','📦','📋','📌','✂️','📎','✏️','📝','📱','💻','🖥️','📧','📨','🔔'],
  '🛍️': ['🛍️','🛒','📦','🚚','🏪','🏷️','💎','💍','👑','👗','👘','👙','👚','👛','👜','👝','🎒','👟','👠','👡','✅','🆗','🆕'],
  '🍎': ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🍍','🥭','🥝','🍅','🥑','🥦','🌽','🍔','🍟','🍕','🍜','🍣','🍱','🍿','☕','🧃','🥤'],
  '🏠': ['🏠','🏡','🏢','🏪','🏬','🚗','🚕','✈️','🚂','🚢','🌍','🌏','🗺️','🏖️','⛰️','🌄','🌃','🏙️'],
};

function setupEmoji() {
  const tabsEl = panel.querySelector('#sq-emoji-tabs');
  const gridEl = panel.querySelector('#sq-emoji-grid');
  let first = true;
  Object.entries(EMOJI_CATS).forEach(([icon, emojis]) => {
    const tab = document.createElement('button');
    tab.className = 'sq-etab' + (first ? ' sq-etab-active' : '');
    tab.textContent = icon;
    tab.addEventListener('click', () => {
      tabsEl.querySelectorAll('.sq-etab').forEach(t => t.classList.remove('sq-etab-active'));
      tab.classList.add('sq-etab-active');
      renderEmoji(emojis);
    });
    tabsEl.appendChild(tab);
    if (first) { renderEmoji(emojis); first = false; }
  });
}

function renderEmoji(emojis) {
  const grid = panel.querySelector('#sq-emoji-grid');
  grid.innerHTML = '';
  emojis.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'sq-emoji';
    btn.textContent = e;
    btn.addEventListener('click', () => insertText(e));
    grid.appendChild(btn);
  });
}

// ── Insert text ke WA ─────────────────────────────────────────────────────────
function insertText(text) {
  const input = document.querySelector('[contenteditable="true"][data-tab="10"]')
             || document.querySelector('footer [contenteditable="true"]')
             || document.querySelector('[contenteditable="true"]');
  if (!input) { alert('Klik dulu di kolom chat WhatsApp'); return; }
  input.focus();
  document.execCommand('insertText', false, text);
  panel.style.display = 'none';
}

// ── Wait for WA to load ───────────────────────────────────────────────────────
const observer = new MutationObserver(() => {
  if (document.querySelector('footer') || document.querySelector('[data-tab="10"]')) injectUI();
});
observer.observe(document.body, { childList: true, subtree: true });
if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
