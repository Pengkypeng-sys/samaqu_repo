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
        <div class="sq-at-header">
          <span class="sq-at-title">💬 Template Pesan</span>
          <span id="sq-tpl-count" class="sq-at-count"></span>
        </div>
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
                  <div class="sq-opt sq-opt-active" data-val="Gojek Instant"><span class="sq-courier-logo gojek">GO</span> Gojek Instant</div>
                  <div class="sq-opt" data-val="J&T Express"><span class="sq-courier-logo jnt">J&T</span> J&T Express</div>
                  <div class="sq-opt" data-val="Lalamove"><span class="sq-courier-logo lalamove">LM</span> Lalamove</div>
                  <div class="sq-opt" data-val="SiCepat"><span class="sq-courier-logo sicepat">SC</span> SiCepat</div>
                  <div class="sq-opt" data-val="JNE"><span class="sq-courier-logo jne">JNE</span> JNE</div>
                  <div class="sq-opt" data-val="Anteraja"><span class="sq-courier-logo anteraja">ANT</span> Anteraja</div>
                  <div class="sq-opt" data-val="Shopee Express"><span class="sq-courier-logo shopee">SPX</span> Shopee Express</div>
                </div>
              </div>
            </div>
            <div class="sq-field">
              <label>Ongkos Kirim (Rp)</label>
              <input id="inv-ongkir" type="number" placeholder="0">
            </div>
          </div>
          <!-- Bank Transfer -->
          <div class="sq-field">
            <label>Transfer Bank (opsional)</label>
            <div id="inv-banks">
              <button class="sq-bank-btn" data-bank="BCA" data-color="#0066AE">
                <span class="sq-bank-logo bca">BCA</span>
              </button>
              <button class="sq-bank-btn" data-bank="BRI" data-color="#0077C0">
                <span class="sq-bank-logo bri">BRI</span>
              </button>
              <button class="sq-bank-btn" data-bank="BNI" data-color="#F37021">
                <span class="sq-bank-logo bni">BNI</span>
              </button>
              <button class="sq-bank-btn" data-bank="Mandiri" data-color="#003D7C">
                <span class="sq-bank-logo mandiri">MND</span>
              </button>
              <button class="sq-bank-btn" data-bank="BSI" data-color="#3D8B37">
                <span class="sq-bank-logo bsi">BSI</span>
              </button>
              <button class="sq-bank-btn" data-bank="DANA" data-color="#108EE9">
                <span class="sq-bank-logo dana">DANA</span>
              </button>
              <button class="sq-bank-btn" data-bank="OVO" data-color="#4C3494">
                <span class="sq-bank-logo ovo">OVO</span>
              </button>
            </div>
            <div id="inv-bank-fields" style="display:none">
              <input id="inv-bank-name" type="text" placeholder="No. Rekening / No. HP" style="margin-top:6px">
              <input id="inv-bank-holder" type="text" placeholder="Atas nama" style="margin-top:6px">
            </div>
          </div>
          <button id="inv-generate">📋 Generate &amp; Kirim ke Chat</button>
        </div>
      </div>

      <!-- ONGKIR -->
      <div id="sq-ongkir" class="sq-page" style="display:none">
        <div class="sq-section-title">🚚 Cek Ongkir</div>
        <div class="sq-ongkir-form">
          <div class="sq-field">
            <label>Kota Asal</label>
            <input id="oq-origin" type="text" placeholder="Cari kota asal..." autocomplete="off">
            <div class="sq-suggest" id="oq-origin-list"></div>
          </div>
          <div class="sq-field">
            <label>Kota Tujuan</label>
            <input id="oq-dest" type="text" placeholder="Cari kota tujuan..." autocomplete="off">
            <div class="sq-suggest" id="oq-dest-list"></div>
          </div>
          <div class="sq-row2">
            <div class="sq-field">
              <label>Berat (gram)</label>
              <input id="oq-weight" type="number" placeholder="1000" value="1000" min="1">
            </div>
            <div class="sq-field">
              <label>Kurir</label>
              <div class="sq-custom-select" id="oq-courier-wrap">
                <div class="sq-select-val" id="oq-courier-val">Semua Kurir ▾</div>
                <div class="sq-select-opts" id="oq-courier-opts" style="display:none">
                  <div class="sq-opt sq-opt-active" data-val="">🚚 Semua Kurir</div>
                  <div class="sq-opt" data-val="jne"><span class="sq-courier-logo jne">JNE</span> JNE</div>
                  <div class="sq-opt" data-val="jnt"><span class="sq-courier-logo jnt">J&T</span> J&T Express</div>
                  <div class="sq-opt" data-val="sicepat"><span class="sq-courier-logo sicepat">SC</span> SiCepat</div>
                  <div class="sq-opt" data-val="anteraja"><span class="sq-courier-logo anteraja">ANT</span> Anteraja</div>
                  <div class="sq-opt" data-val="gosend"><span class="sq-courier-logo gojek">GO</span> Gojek Gosend</div>
                  <div class="sq-opt" data-val="grab_express"><span class="sq-courier-logo grab">GRB</span> Grab Express</div>
                </div>
              </div>
            </div>
          </div>
          <button id="oq-check">🔍 Cek Ongkir</button>
        </div>
        <div id="oq-results"></div>
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

  // Bank selection
  let selectedBank = '';
  panel.querySelectorAll('.sq-bank-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bank = btn.dataset.bank;
      if (selectedBank === bank) {
        selectedBank = '';
        panel.querySelectorAll('.sq-bank-btn').forEach(b => b.classList.remove('sq-bank-active'));
        panel.querySelector('#inv-bank-fields').style.display = 'none';
      } else {
        selectedBank = bank;
        panel.querySelectorAll('.sq-bank-btn').forEach(b => b.classList.remove('sq-bank-active'));
        btn.classList.add('sq-bank-active');
        panel.querySelector('#inv-bank-fields').style.display = 'block';
        panel.querySelector('#inv-bank-name').placeholder = bank === 'DANA' || bank === 'OVO' ? 'No. HP' : 'No. Rekening';
      }
    });
  });

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
      selVal.innerHTML = opt.innerHTML + ' ▾';
      selOpts.style.display = 'none';
    });
  });
  document.addEventListener('click', () => { if (selOpts) selOpts.style.display = 'none'; });

  // Ongkir courier custom select
  const oqVal  = panel.querySelector('#oq-courier-val');
  const oqOpts = panel.querySelector('#oq-courier-opts');
  oqVal.addEventListener('click', e => { e.stopPropagation(); oqOpts.style.display = oqOpts.style.display === 'none' ? 'block' : 'none'; });
  oqOpts.querySelectorAll('.sq-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      oqOpts.querySelectorAll('.sq-opt').forEach(o => o.classList.remove('sq-opt-active'));
      opt.classList.add('sq-opt-active');
      oqVal.innerHTML = opt.innerHTML + ' ▾';
      oqOpts.style.display = 'none';
    });
  });

  // City autocomplete
  setupCitySearch('oq-origin', 'oq-origin-list');
  setupCitySearch('oq-dest', 'oq-dest-list');

  panel.querySelector('#oq-check').addEventListener('click', checkOngkir);

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
    b.innerHTML = `${cat.category} <span class="sq-cat-n">${cat.items.length}</span>`;
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
      d.innerHTML = `
        <div class="sq-item-accent"></div>
        <div class="sq-item-body">
          <div class="sq-item-text">${text}</div>
          <div class="sq-item-hint">Tap untuk kirim ke chat</div>
        </div>
        <div class="sq-item-arrow">›</div>`;
      d.addEventListener('click', () => insertText(text));
      list.appendChild(d);
    });
  });
  const countEl = panel.querySelector('#sq-tpl-count');
  if (countEl) countEl.textContent = found ? `${found} template` : '';
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
  const shipping = panel.querySelector('#inv-shipping-opts .sq-opt-active')?.dataset.val || 'Gojek Instant';
  const bankName   = g('#inv-bank-name')?.value.trim() || '';
  const bankHolder = g('#inv-bank-holder')?.value.trim() || '';
  const fmt = v => new Intl.NumberFormat('id-ID').format(v);
  const total = price * qty + ongkir;
  const activeBank = panel.querySelector('.sq-bank-btn.sq-bank-active')?.dataset.bank || '';

  let text = `🧾 *INVOICE SAMAQU*\nPembeli  : ${buyer}\nProduk   : ${product}\nQty      : ${qty} pcs\nSubtotal : Rp ${fmt(price * qty)}\nKurir    : ${shipping}\nOngkir   : Rp ${fmt(ongkir)}\n*TOTAL   : Rp ${fmt(total)}*`;
  if (activeBank && bankName) {
    text += `\n\n💳 *Pembayaran via ${activeBank}*\nNo. Rek  : ${bankName}`;
    if (bankHolder) text += `\nA/N      : ${bankHolder}`;
  }
  insertText(text);
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

// ── Ongkir ───────────────────────────────────────────────────────────────────
const cityCache = {};

function setupCitySearch(inputId, listId) {
  const input = panel.querySelector(`#${inputId}`);
  const list  = panel.querySelector(`#${listId}`);
  input._areaId = '';
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    input._areaId = '';
    const q = input.value.trim();
    if (q.length < 2) { list.innerHTML = ''; list.style.display = 'none'; return; }
    timer = setTimeout(async () => {
      const stored = await storageGet(['biteship_key']);
      const key = stored['biteship_key'] || '';
      if (!key) { list.innerHTML = '<div class="sq-suggest-item">⚠️ Biteship key belum diisi</div>'; list.style.display = 'block'; return; }
      if (cityCache[q]) { renderCitySuggest(list, input, cityCache[q]); return; }
      try {
        const res = await fetch(`https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(q)}&type=single`, {
          headers: { Authorization: key }
        });
        const data = await res.json();
        cityCache[q] = data.areas || [];
        renderCitySuggest(list, input, cityCache[q]);
      } catch (e) { list.innerHTML = `<div class="sq-suggest-item">❌ ${e.message}</div>`; list.style.display = 'block'; }
    }, 400);
  });
}

function renderCitySuggest(list, input, areas) {
  list.innerHTML = '';
  if (!areas.length) { list.innerHTML = '<div class="sq-suggest-item">Kota tidak ditemukan</div>'; list.style.display = 'block'; return; }
  areas.slice(0, 6).forEach(a => {
    const d = document.createElement('div');
    d.className = 'sq-suggest-item';
    d.textContent = `${a.name}, ${a.administrative_division_level_2_name || ''} (${a.postal_code || ''})`;
    d.addEventListener('click', () => {
      input.value = d.textContent;
      input._areaId = a.id;
      list.innerHTML = ''; list.style.display = 'none';
    });
    list.appendChild(d);
  });
  list.style.display = 'block';
}

async function checkOngkir() {
  const results = panel.querySelector('#oq-results');
  const originInput = panel.querySelector('#oq-origin');
  const destInput   = panel.querySelector('#oq-dest');
  const weight = parseInt(panel.querySelector('#oq-weight').value) || 1000;
  const courier = panel.querySelector('#oq-courier-opts .sq-opt-active')?.dataset.val || '';

  if (!originInput._areaId || !destInput._areaId) {
    results.innerHTML = '<div class="sq-empty-state">⚠️ Pilih kota dari dropdown saran</div>';
    return;
  }

  results.innerHTML = '<div class="sq-empty-state">⏳ Mengecek ongkir...</div>';

  const stored = await storageGet(['biteship_key']);
  const key = stored['biteship_key'] || '';
  if (!key) { results.innerHTML = '<div class="sq-empty-state">⚠️ Biteship API key belum diisi di pengaturan</div>'; return; }

  try {
    const body = {
      origin_area_id: originInput._areaId,
      destination_area_id: destInput._areaId,
      couriers: courier || 'jne,jnt,sicepat,anteraja,gosend,grab_express,wahana,lion',
      items: [{ name: 'Paket', value: 10000, weight, quantity: 1 }]
    };
    const res = await fetch('https://api.biteship.com/v1/rates/couriers', {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.pricing?.length) { results.innerHTML = '<div class="sq-empty-state">Tidak ada layanan tersedia</div>'; return; }
    const fmt = v => new Intl.NumberFormat('id-ID').format(v);
    results.innerHTML = '';
    data.pricing.sort((a, b) => a.price - b.price).forEach(p => {
      const courierEmoji = {'JNE':'📦','J&T':'🚀','SiCepat':'⚡','Anteraja':'🔵','GoSend':'🟢','GrabExpress':'🟡','Wahana':'🔴','Lion':'🦁'};
      const emo = Object.entries(courierEmoji).find(([k]) => p.courier_name.includes(k))?.[1] || '🚚';
      const el = document.createElement('div');
      el.className = 'sq-rate-card';
      el.innerHTML = `
        <div class="sq-rate-top">
          <span class="sq-rate-emo">${emo}</span>
          <span class="sq-rate-courier">${p.courier_name}</span>
          <span class="sq-rate-service">${p.courier_service_name}</span>
        </div>
        <div class="sq-rate-bot">
          <span class="sq-rate-price">Rp ${fmt(p.price)}</span>
          <span class="sq-rate-eta">${p.shipment_duration_range || ''} hari</span>
          <button class="sq-rate-send">Kirim ke Chat</button>
        </div>`;
      el.querySelector('.sq-rate-send').addEventListener('click', () => {
        insertText(`🚚 *Cek Ongkir*\nKurir  : ${p.courier_name} (${p.courier_service_name})\nOngkir : Rp ${fmt(p.price)}\nEstimasi : ${p.shipment_duration_range || '-'} hari`);
      });
      results.appendChild(el);
    });
  } catch (e) {
    results.innerHTML = `<div class="sq-empty-state">❌ ${e.message}</div>`;
  }
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
