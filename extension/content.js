/**
 * SpamShield Content Script
 * Runs on Gmail, LinkedIn, WhatsApp Web
 * Parses DOM, sends text to FastAPI, highlights spam
 */

const API_URL = 'https://spamurai-ai.onrender.com/predict'; // ← Change to your FastAPI endpoint
const SCAN_INTERVAL_MS = 2000;
const CONFIDENCE_THRESHOLD = 0.6;

let enabled = true;
let scanning = false;
let processedNodes = new WeakSet();
let stats = { scanned: 0, spam: 0, safe: 0, gmail: 0, linkedin: 0, whatsapp: 0 };

const platform = detectPlatform();

// ── Init ──
chrome.storage.local.get(['enabled', 'stats'], (data) => {
  enabled = data.enabled !== false;
  stats = data.stats || stats;
  if (enabled) startScanner();
});

// ── Message listener (toggle from popup) ──
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'TOGGLE') {
    enabled = msg.enabled;
    if (enabled) startScanner();
  }
});

// ── Platform detection ──
function detectPlatform() {
  const h = location.hostname;
  if (h.includes('mail.google.com')) return 'gmail';
  if (h.includes('linkedin.com')) return 'linkedin';
  if (h.includes('whatsapp.com')) return 'whatsapp';
  return 'unknown';
}

// ── Scanner loop ──
function startScanner() {
  scan();
  setInterval(() => { if (enabled) scan(); }, SCAN_INTERVAL_MS);

  // MutationObserver for real-time DOM changes
  const observer = new MutationObserver(() => {
    if (enabled && !scanning) scan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function scan() {
  if (scanning || !enabled) return;
  scanning = true;
  try {
    const nodes = getMessageNodes();
    for (const node of nodes) {
      if (processedNodes.has(node)) continue;
      processedNodes.add(node);
      const text = node.innerText?.trim();
      if (!text || text.length < 10) continue;

      node.classList.add('spamshield-scanning');
      const result = await classify(text);
      node.classList.remove('spamshield-scanning');

      if (result) handleResult(node, text, result);
    }
  } finally {
    scanning = false;
  }
}

// ── DOM selectors per platform ──
function getMessageNodes() {
  const selectors = {
    gmail: [
      'div.a3s.aiL',               // email body
      'div[data-message-id] .ii.gt', // thread message
    ],
    linkedin: [
      '.msg-s-event-listitem__body', // inbox messages
      '.feed-shared-update-v2__description', // feed posts
      '.comment-item__main-content',
    ],
    whatsapp: [
      'div.copyable-text span.selectable-text', // chat messages
      'div._21Ahp',                              // older selector
    ],
  };

  const list = selectors[platform] || [];
  const seen = new Set();
  const results = [];
  for (const sel of list) {
    document.querySelectorAll(sel).forEach(el => {
      if (!processedNodes.has(el) && !seen.has(el)) {
        seen.add(el);
        results.push(el);
      }
    });
  }
  return results;
}

// ── API call ──
async function classify(text) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    // Expected: { label: "spam"|"ham", confidence: 0.0–1.0 }
    chrome.runtime.sendMessage({ type: 'API_STATUS', ok: true }).catch(() => {});
    return { label: data.prediction, confidence: data.confidence };
  } catch (e) {
    chrome.runtime.sendMessage({ type: 'API_STATUS', ok: false }).catch(() => {});
    return null;
  }
}

// ── Handle result ──
function handleResult(node, text, result) {
  const { label, confidence } = result;
  const isSpam = label === 'spam' && confidence >= CONFIDENCE_THRESHOLD;

  // Update stats
  stats.scanned++;
  if (isSpam) {
    stats.spam++;
    stats[platform] = (stats[platform] || 0) + 1;
  } else {
    stats.safe++;
  }

  chrome.storage.local.set({ stats });
  chrome.runtime.sendMessage({ type: 'STATS_UPDATE', stats }).catch(() => {});

  if (isSpam) {
    highlightSpam(node, confidence);
    showToast(text, confidence);

    // Store detection directly in storage (single write, no relay race)
    const item = { label, confidence, text, platform, ts: Date.now() };
    chrome.storage.local.get(['recent'], (data) => {
      const arr = data.recent || [];
      arr.push(item);
      if (arr.length > 20) arr.shift();
      chrome.storage.local.set({ recent: arr });
      // Notify popup after storage is written
      chrome.runtime.sendMessage({ type: 'NEW_DETECTION', item }).catch(() => {});
    });
  }
}

// ── Highlight spam node ──
function highlightSpam(node, confidence) {
  let wrapper = node.closest('.spamshield-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'spamshield-wrapper';
    wrapper.style.cssText = 'position:relative;display:block;width:100%;padding-top:14px;box-sizing:border-box;';
    node.parentNode.insertBefore(wrapper, node);
    wrapper.appendChild(node);
  }

  wrapper.classList.add('spamshield-spam');

  // Badge — only add once
  if (!wrapper.querySelector('.spamshield-badge')) {
    const badge = document.createElement('span');
    badge.className = 'spamshield-badge';
    badge.textContent = `SPAM · ${Math.round(confidence * 100)}%`;
    wrapper.insertBefore(badge, wrapper.firstChild); // insert before message, not after
  }
}

// ── Toast notification (shown max once every 5s) ──
let lastToast = 0;
function showToast(text, confidence) {
  const now = Date.now();
  if (now - lastToast < 5000) return;
  lastToast = now;

  const toast = document.createElement('div');
  toast.className = 'spamshield-toast';
  toast.innerHTML = `
    <span class="toast-icon">🛡️</span>
    <span>Spam detected</span>
    <span class="toast-conf">${Math.round(confidence * 100)}%</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
