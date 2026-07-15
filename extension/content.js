// SAMAQU Extension — full featured panel

const KEY_URL   = 'samaqu_api_url';
const KEY_TOKEN = 'samaqu_token';

let panel     = null;
let templates = [];
let activeCat = null;

// Wrapper aman untuk chrome.storage (hindari "context invalidated" error)
async function storageGet(keys) {
  try { return await chrome.storage.local.get(keys); }
  catch (_) { return {}; }
}

function injectUI() {
  if (document.getElementById('samaqu-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'samaqu-btn';
  btn.innerHTML = '<span>SQ</span>';
  btn.title = 'SAMAQU';
  btn.addEventListener('click', togglePanel);
  document.body.appendChild(btn);

  panel = document.createElement('div');
  panel.id = 'samaqu-panel';
  panel.innerHTML = `
    <div id="sq-header">
      <div id="sq-header-left">
        <div id="sq-avatar">SQ</div>
        <div>
          <div id="sq-logo">SAMAQU</div>
          <div id="sq-sub">Template CS Assistant</div>
        </div>
      </div>
      <button id="sq-close">✕</button>
    </div>

    <div id="sq-body">
      <!-- AUTO TEXT -->
      <div id="sq-autotext" class="sq-page">
        <div class="sq-search-wrap">
          <span class="sq-search-icon">🔍</span>
          <input id="sq-search" type="text" placeholder="Cari template...">
        </div>
        <div id="sq-cats"></div>
        <div id="sq-list"></div>
        <div id="sq-status"></div>
      </div>

      <!-- INVOICE -->
      <div id="sq-invoice" class="sq-page" style="display:none">
        <div class="sq-section-title">🧾 Buat Invoice</div>
        <div class="sq-form">
          <div class="sq-row2">
            <div class="sq-field">
              <label>Nama Pembeli</label>
              <input id="inv-buyer" type="text" placeholder="Contoh: Budi Santoso">
            </div>
            <div class="sq-field">
              <label>Nama Produk</label>
              <input id="inv-product" type="text" placeholder="Contoh: Kaos Polos">
            </div>
          </div>
          <div class="sq-row2">
            <div class="sq-field">
              <label>Qty</label>
              <input id="inv-qty" type="number" placeholder="1" value="1" min="1">
            </div>
            <div class="sq-field">
              <label>Harga Satuan (Rp)</label>
              <input id="inv-price" type="number" placeholder="0">
            </div>
          </div>
          <div class="sq-row2">
            <div class="sq-field">
              <label>Jasa Pengiriman</label>
              <div class="sq-custom-select" id="inv-shipping-wrap">
                <div class="sq-select-val" id="inv-shipping-val">Gojek Instant ▾</div>
                <div class="sq-select-opts" id="inv-shipping-opts" style="display:none">
                  <div class="sq-opt sq-opt-active" data-val="Gojek Instant">Gojek Instant</div>
                  <div class="sq-opt" data-val="J&T Express">J&T Express</div>
                  <div class="sq-opt" data-val="Lalamove">Lalamove</div>
                  <div class="sq-opt" data-val="SiCepat">SiCepat</div>
                  <div class="sq-opt" data-val="JNE">JNE</div>
                  <div class="sq-opt" data-val="Anteraja">Anteraja</div>
                  <div class="sq-opt" data-val="Shopee Express">Shopee Express</div>
                </div>
              </div>
            </div>
            <div class="sq-field">
              <label>Ongkos Kirim (Rp)</label>
              <input id="inv-ongkir" type="number" placeholder="0">
            </div>
          </div>
          <button id="inv-generate">📋 Generate &amp; Kirim ke Chat</button>
        </div>
      </div>

      <!-- ONGKIR -->
      <div id="sq-ongkir" class="sq-page sq-center" style="display:none">
        <div class="sq-dev-icon">🚧</div>
        <div class="sq-dev-title">Sedang Tahap Development</div>
        <div class="sq-dev-desc">Fitur Cek Ongkir akan segera hadir.<br>Terima kasih atas kesabarannya 🙏</div>
      </div>

      <!-- PENDING -->
      <div id="sq-pending" class="sq-page" style="display:none">
        <div class="sq-section-title">⏳ Order Pending</div>
        <div id="sq-pending-list"></div>
        <div id="sq-pending-empty" style="display:none" class="sq-empty-state">Tidak ada order pending 🎉</div>
      </div>

      <!-- EMOJI -->
      <div id="sq-emoji" class="sq-page" style="display:none">
        <div id="sq-emoji-tabs"></div>
        <div id="sq-emoji-grid"></div>
      </div>
    </div>

    <!-- BOTTOM NAV -->
    <div id="sq-nav">
      <button class="sq-nav-btn sq-nav-active" data-tab="autotext">
        <span class="sq-nav-icon">📋</span>
        <span class="sq-nav-lbl">Auto Text</span>
      </button>
      <button class="sq-nav-btn" data-tab="invoice">
        <span class="sq-nav-icon">🧾</span>
        <span class="sq-nav-lbl">Invoice</span>
      </button>
      <button class="sq-nav-btn" data-tab="ongkir">
        <span class="sq-nav-icon">🚚</span>
        <span class="sq-nav-lbl">Ongkir</span>
      </button>
      <button class="sq-nav-btn" data-tab="pending">
        <span class="sq-nav-icon">⏳</span>
        <span class="sq-nav-lbl">Pending</span>
      </button>
      <button class="sq-nav-btn" data-tab="emoji">
        <span class="sq-nav-icon">😊</span>
        <span class="sq-nav-lbl">Emoji</span>
      </button>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#sq-close').addEventListener('click', () => panel.style.display = 'none');
  panel.querySelectorAll('.sq-nav-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  panel.querySelector('#sq-search').addEventListener('input', e => renderList(e.target.value.toLowerCase()));
  panel.querySelector('#inv-generate').addEventListener('click', generateInvoice);

  // Custom select for shipping
  const selVal  = panel.querySelector('#inv-shipping-val');
  const selOpts = panel.querySelector('#inv-shipping-opts');
  selVal.addEventListener('click', e => {
    e.stopPropagation();
    selOpts.style.display = selOpts.style.display === 'none' ? 'block' : 'none';
  });
  selOpts.querySelectorAll('.sq-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      selOpts.querySelectorAll('.sq-opt').forEach(o => o.classList.remove('sq-opt-active'));
      opt.classList.add('sq-opt-active');
      selVal.textContent = opt.dataset.val + ' ▾';
      selOpts.style.display = 'none';
    });
  });
  document.addEventListener('click', () => { if (selOpts) selOpts.style.display = 'none'; });

  loadTemplates();
  setupEmoji();
}

function switchTab(tab) {
  panel.querySelectorAll('.sq-page').forEach(p => p.style.display = 'none');
  panel.querySelectorAll('.sq-nav-btn').forEach(b => b.classList.remove('sq-nav-active'));
  panel.querySelector(`#sq-${tab}`).style.display = tab === 'autotext' ? 'flex' : (tab === 'ongkir' || tab === 'emoji' ? 'flex' : 'flex');
  panel.querySelector(`[data-tab="${tab}"]`).classList.add('sq-nav-active');
  if (tab === 'pending') loadPending();
}

function togglePanel() {
  if (!panel) return;
  const show = panel.style.display !== 'flex';
  panel.style.display = show ? 'flex' : 'none';
  if (show) loadTemplates();
}

async function loadTemplates() {
  const status = panel.querySelector('#sq-status');
  const stored = await storageGet([KEY_URL]);
  const apiUrl = stored[KEY_URL] || '';
  if (!apiUrl) { status.textContent = '⚠️ API URL belum diisi — klik ikon SQ di toolbar Chrome'; return; }
  status.textContent = '';
  try {
    const res = await fetch(`${apiUrl}/templates`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    templates = data.map(item => ({
      category: item.name || item.category?.name || 'Lainnya',
      items: (item.templates || []).map(t => t.content || t.text || '')
    }));
    renderCats();
    renderList('');
  } catch (e) {
    status.textContent = `❌ Gagal memuat: ${e.message}`;
  }
}

function renderCats() {
  const el = panel.querySelector('#sq-cats');
  el.innerHTML = '';
  templates.forEach((cat, i) => {
    const b = document.createElement('button');
    b.className = 'sq-cat' + (i === 0 ? ' sq-cat-active' : '');
    b.textContent = cat.category;
    b.addEventListener('click', () => {
      el.querySelectorAll('.sq-cat').forEach(x => x.classList.remove('sq-cat-active'));
      b.classList.add('sq-cat-active');
      activeCat = cat.category;
      renderList(panel.querySelector('#sq-search').value.toLowerCase());
    });
    el.appendChild(b);
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
      const d = document.createElement('div');
      d.className = 'sq-item';
      d.textContent = text;
      d.addEventListener('click', () => insertText(text));
      list.appendChild(d);
    });
  });
  if (!found) {
    const d = document.createElement('div');
    d.className = 'sq-empty-state';
    d.textContent = query ? '😕 Template tidak ditemukan' : 'Belum ada template';
    list.appendChild(d);
  }
}

function generateInvoice() {
  const g = id => panel.querySelector(id);
  const buyer    = g('#inv-buyer').value.trim() || '-';
  const product  = g('#inv-product').value.trim() || '-';
  const qty      = parseInt(g('#inv-qty').value) || 1;
  const price    = parseFloat(g('#inv-price').value) || 0;
  const ongkir   = parseFloat(g('#inv-ongkir').value) || 0;
  const shipping = (panel.querySelector('.sq-opt-active')?.dataset.val) || 'Gojek Instant';
  const fmt = v => new Intl.NumberFormat('id-ID').format(v);
  const total = price * qty + ongkir;
  insertText(`🧾 *INVOICE SAMAQU*\nPembeli  : ${buyer}\nProduk   : ${product}\nQty      : ${qty} pcs\nSubtotal : Rp ${fmt(price * qty)}\nKurir    : ${shipping}\nOngkir   : Rp ${fmt(ongkir)}\n*TOTAL   : Rp ${fmt(total)}*`);
}

async function loadPending() {
  const listEl  = panel.querySelector('#sq-pending-list');
  const emptyEl = panel.querySelector('#sq-pending-empty');
  listEl.innerHTML = '<div class="sq-empty-state">⏳ Memuat order...</div>';
  emptyEl.style.display = 'none';
  const stored = await storageGet([KEY_URL, KEY_TOKEN]);
  const apiUrl = stored[KEY_URL] || '';
  const token  = stored[KEY_TOKEN] || '';
  if (!apiUrl || !token) {
    listEl.innerHTML = '<div class="sq-empty-state">⚠️ Isi API URL &amp; JWT Token di pengaturan (klik ikon SQ)</div>';
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
      el.className = 'sq-order-card';
      el.innerHTML = `
        <div class="sq-order-top">
          <span class="sq-order-name">${order.buyerName || 'Pembeli'}</span>
          <span class="sq-badge">Pending</span>
        </div>
        <div class="sq-order-id">Order #${order.id}</div>
        <button class="sq-order-btn">💬 Minta Bukti Transfer</button>`;
      el.querySelector('.sq-order-btn').addEventListener('click', () => {
        const name = order.buyerName || 'Kakak';
        insertText(`Halo ${name} 😊\n\nPesanan #${order.id} sudah kami terima ya kak.\nMohon kirimkan bukti pembayaran ke sini agar pesanan segera kami proses.\n\nTerima kasih! 🙏`);
      });
      listEl.appendChild(el);
    });
  } catch (e) {
    listEl.innerHTML = `<div class="sq-empty-state">❌ ${e.message}</div>`;
  }
}

const EMOJI_CATS = {
  '😊 Ekspresi': ['😊','😍','😂','🤣','😁','😄','🥰','😘','🤗','🤩','😎','🥳','😜','😝','😛','🤑','😏','😒','🙄','😔','😢','😭','😤','😠','🤬','🤯','😳','😱','😰','🤔','😶','😐','😬','🙃','😴','😵','🥴','🤢','🤧','😷','😈','💀','👻'],
  '👋 Gestur':   ['👋','🤚','✋','👌','✌️','🤞','🤟','👈','👉','👆','👇','👍','👎','✊','👊','👏','🙌','🤝','🙏','💪','💅'],
  '❤️ Hati':     ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'],
  '🎉 Selebrasi':['🎉','🎊','🎈','🎁','🎀','🏆','🥇','🥈','🥉','🎵','🎶','✨','🌟','💫','⭐','🌈','🎆','🎇'],
  '💼 Bisnis':   ['💰','💵','💸','💳','📈','📉','📊','💼','📦','📋','📌','✂️','📎','✏️','📝','📱','💻','📧','🔔'],
  '🛍️ Belanja':  ['🛍️','🛒','📦','🚚','🏪','🏷️','💎','💍','👑','👗','👚','👛','👜','👝','🎒','👟','✅','🆗','🆕'],
  '🍎 Makanan':  ['🍎','🍊','🍋','🍇','🍓','🍒','🍍','🥭','🥝','🍅','🥑','🥦','🌽','🍔','🍟','🍕','🍜','🍣','🍱','🍿','☕','🥤'],
  '🏠 Tempat':   ['🏠','🏡','🏢','🏪','🏬','🚗','🚕','✈️','🚂','🚢','🌍','🌏','🗺️','🏖️','⛰️','🌃','🏙️'],
};

function setupEmoji() {
  const tabsEl = panel.querySelector('#sq-emoji-tabs');
  let first = true;
  Object.entries(EMOJI_CATS).forEach(([label, emojis]) => {
    const icon = label.split(' ')[0];
    const tab = document.createElement('button');
    tab.className = 'sq-etab' + (first ? ' sq-etab-active' : '');
    tab.textContent = icon;
    tab.title = label;
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
    const b = document.createElement('button');
    b.className = 'sq-emoji';
    b.textContent = e;
    b.addEventListener('click', () => insertText(e));
    grid.appendChild(b);
  });
}

function insertText(text) {
  const input = document.querySelector('[contenteditable="true"][data-tab="10"]')
             || document.querySelector('footer [contenteditable="true"]')
             || document.querySelector('[contenteditable="true"]');
  if (!input) { alert('Klik dulu di kolom chat WhatsApp sebelum memilih template'); return; }
  input.focus();
  document.execCommand('insertText', false, text);
  panel.style.display = 'none';
}

const obs = new MutationObserver(() => {
  if (document.querySelector('footer') || document.querySelector('[data-tab="10"]')) injectUI();
});
obs.observe(document.body, { childList: true, subtree: true });
if (document.readyState === 'complete') injectUI();
else window.addEventListener('load', injectUI);
