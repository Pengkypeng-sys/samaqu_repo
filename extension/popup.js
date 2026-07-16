const KEY_URL      = 'samaqu_api_url';
const KEY_TOKEN    = 'samaqu_token';
const KEY_BITESHIP = 'biteship_key';
const CURRENT_EXT_VERSION = '1.0.0';

chrome.storage.local.get([KEY_URL, KEY_TOKEN, KEY_BITESHIP], data => {
  document.getElementById('apiUrl').value   = data[KEY_URL] || '';
  document.getElementById('token').value    = data[KEY_TOKEN] || '';
  document.getElementById('verLine').textContent = `Extension v${CURRENT_EXT_VERSION}`;

  // Check for update
  const apiUrl = (data[KEY_URL] || '').replace(/\/$/, '');
  if (apiUrl) checkUpdate(apiUrl);
});

document.getElementById('save').addEventListener('click', () => {
  const url   = document.getElementById('apiUrl').value.trim().replace(/\/$/, '');
  const token = document.getElementById('token').value.trim();
  chrome.storage.local.set({ [KEY_URL]: url, [KEY_TOKEN]: token }, () => {
    const msg = document.getElementById('msg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
    if (url) checkUpdate(url);
  });
});

async function checkUpdate(apiUrl) {
  try {
    const res = await fetch(`${apiUrl}/config`);
    if (!res.ok) return;
    const cfg = await res.json();

    const serverVer  = cfg['ext_version'] || '';
    const extUrl     = cfg['ext_url'] || '';
    const changelog  = cfg['ext_changelog'] || '';

    // Also sync biteship key from server if not set locally
    if (cfg['biteship_key']) {
      chrome.storage.local.get([KEY_BITESHIP], d => {
        if (!d[KEY_BITESHIP]) {
          chrome.storage.local.set({ [KEY_BITESHIP]: cfg['biteship_key'] });
        }
      });
    }

    if (serverVer && serverVer !== CURRENT_EXT_VERSION && extUrl) {
      const banner = document.getElementById('updateBanner');
      document.getElementById('updateTitle').textContent = `📦 Update Tersedia — v${serverVer}`;
      document.getElementById('updateChangelog').textContent = changelog || 'Versi baru tersedia.';
      document.getElementById('updateLink').href = extUrl;
      banner.style.display = 'block';
    }
  } catch (_) {}
}
