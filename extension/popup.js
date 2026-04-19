const toggle = document.getElementById('mainToggle');
const toggleLabel = document.getElementById('toggle-label');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('status-text');
const apiDot = document.getElementById('apiDot');
const apiStatus = document.getElementById('apiStatus');

// ── Load state from storage ──
chrome.storage.local.get(['enabled', 'stats', 'recent', 'apiOk'], (data) => {
  const enabled = data.enabled !== false;
  toggle.checked = enabled;
  applyToggleUI(enabled);

  if (data.stats) updateStatsUI(data.stats);
  if (data.recent) renderRecent(data.recent);
  updateApiUI(data.apiOk !== false);
});

// ── Toggle ──
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  applyToggleUI(enabled);
  chrome.storage.local.set({ enabled });
  // Notify all matching tabs
  chrome.tabs.query({ url: ['*://mail.google.com/*', '*://www.linkedin.com/*', '*://web.whatsapp.com/*'] }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE', enabled }).catch(() => {});
    });
  });
});

// ── Clear stats ──
document.getElementById('clearBtn').addEventListener('click', () => {
  const empty = { scanned: 0, spam: 0, safe: 0, gmail: 0, linkedin: 0, whatsapp: 0 };
  chrome.storage.local.set({ stats: empty, recent: [] });
  updateStatsUI(empty);
  renderRecent([]);
});

// ── Listen for live updates from content script ──
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'STATS_UPDATE') updateStatsUI(msg.stats);
  if (msg.type === 'NEW_DETECTION') addRecentItem(msg.item);
  if (msg.type === 'API_STATUS') updateApiUI(msg.ok);
});

// ── Helpers ──
function applyToggleUI(enabled) {
  toggleLabel.textContent = enabled ? 'ON' : 'OFF';
  statusDot.className = 'dot ' + (enabled ? 'active' : 'inactive');
  statusText.textContent = enabled ? 'ACTIVE · MONITORING' : 'PAUSED · IDLE';
  document.body.classList.toggle('disabled', !enabled);
}

function updateStatsUI(s) {
  animateNum('stat-scanned', s.scanned || 0);
  animateNum('stat-spam', s.spam || 0);
  animateNum('stat-safe', s.safe || 0);

  const max = Math.max(s.gmail || 0, s.linkedin || 0, s.whatsapp || 0, 1);
  setBar('bar-gmail', s.gmail || 0, max);
  setBar('bar-linkedin', s.linkedin || 0, max);
  setBar('bar-whatsapp', s.whatsapp || 0, max);
  document.getElementById('count-gmail').textContent = s.gmail || 0;
  document.getElementById('count-linkedin').textContent = s.linkedin || 0;
  document.getElementById('count-whatsapp').textContent = s.whatsapp || 0;
}

function setBar(id, val, max) {
  document.getElementById(id).style.width = Math.round((val / max) * 100) + '%';
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const step = target > current ? 1 : -1;
  const diff = Math.abs(target - current);
  const delay = diff > 10 ? 20 : 60;
  let cur = current;
  const tick = () => {
    cur += step;
    el.textContent = cur;
    if (cur !== target) setTimeout(tick, delay);
  };
  setTimeout(tick, 10);
}

function renderRecent(items) {
  const list = document.getElementById('recent-list');
  if (!items || items.length === 0) {
    list.innerHTML = '<div class="empty-state">No detections yet</div>';
    return;
  }
  list.innerHTML = items.slice(-4).reverse().map(itemHTML).join('');
}

function addRecentItem() {
  // Storage was already written by content.js — just re-read and render
  chrome.storage.local.get(['recent'], (data) => {
    renderRecent(data.recent || []);
  });
}

function itemHTML(item) {
  const isSpam = item.label === 'spam';
  const conf = Math.round((item.confidence || 0) * 100);
  const preview = (item.text || '').slice(0, 45) + (item.text?.length > 45 ? '…' : '');
  return `
    <div class="recent-item">
      <span class="recent-badge ${isSpam ? 'spam' : 'ham'}">${isSpam ? 'SPAM' : 'HAM'}</span>
      <span class="recent-text">${escapeHTML(preview)}</span>
      <span class="recent-conf">${conf}%</span>
    </div>`;
}

function updateApiUI(ok) {
  apiDot.className = 'api-dot' + (ok ? '' : ' offline');
  apiStatus.textContent = ok ? 'API Connected' : 'API Offline';
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
