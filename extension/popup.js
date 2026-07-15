const KEY_URL      = 'samaqu_api_url';
const KEY_TOKEN    = 'samaqu_token';
const KEY_BITESHIP = 'biteship_key';

chrome.storage.local.get([KEY_URL, KEY_TOKEN, KEY_BITESHIP], data => {
  document.getElementById('apiUrl').value  = data[KEY_URL] || '';
  document.getElementById('token').value   = data[KEY_TOKEN] || '';
  document.getElementById('biteship').value = data[KEY_BITESHIP] || '';
});

document.getElementById('save').addEventListener('click', () => {
  const url      = document.getElementById('apiUrl').value.trim().replace(/\/$/, '');
  const token    = document.getElementById('token').value.trim();
  const biteship = document.getElementById('biteship').value.trim();
  chrome.storage.local.set({ [KEY_URL]: url, [KEY_TOKEN]: token, [KEY_BITESHIP]: biteship }, () => {
    const msg = document.getElementById('msg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
  });
});
