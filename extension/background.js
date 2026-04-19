// SpamShield background service worker

// On install, set defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    stats: { scanned: 0, spam: 0, safe: 0, gmail: 0, linkedin: 0, whatsapp: 0 },
    recent: [],
    apiOk: true,
  });
});

// Relay messages between content scripts and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Forward to all extension views (popup)
  if (['STATS_UPDATE', 'NEW_DETECTION', 'API_STATUS'].includes(msg.type)) {
    chrome.runtime.sendMessage(msg).catch(() => {}); // popup may be closed
  }

  // Store API status
  if (msg.type === 'API_STATUS') {
    chrome.storage.local.set({ apiOk: msg.ok });
  }
});
