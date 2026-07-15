const STORAGE_KEY_URL   = 'samaqu_api_url';
const STORAGE_KEY_TOKEN = 'samaqu_token';

// Load saved values
chrome.storage.local.get([STORAGE_KEY_URL, STORAGE_KEY_TOKEN], data => {
  document.getElementById('apiUrl').value = data[STORAGE_KEY_URL] || '';
  document.getElementById('token').value  = data[STORAGE_KEY_TOKEN] || '';
});

document.getElementById('save').addEventListener('click', () => {
  const url   = document.getElementById('apiUrl').value.trim().replace(/\/$/, '');
  const token = document.getElementById('token').value.trim();
  chrome.storage.local.set({ [STORAGE_KEY_URL]: url, [STORAGE_KEY_TOKEN]: token }, () => {
    const msg = document.getElementById('msg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
  });
});
