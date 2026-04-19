# 🛡️ SpamShield — Chrome Extension

Real-time spam detection for Gmail, LinkedIn & WhatsApp Web, powered by your FastAPI model.

---

## 📁 File Structure

```
spam-shield/
├── manifest.json       # Extension config
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── content.js          # DOM parser + API caller
├── highlight.css       # Spam highlight styles
├── background.js       # Service worker
└── icons/              # Extension icons
```

---

## ⚙️ Setup

### 1. Configure your API endpoint

Open `content.js` and update line 8:

```js
const API_URL = 'http://localhost:8000/predict'; // ← your FastAPI URL
```

### 2. FastAPI expected contract

**POST** `/predict`

Request body:
```json
{ "text": "message content here" }
```

Response:
```json
{ "label": "spam", "confidence": 0.94 }
```
- `label` → `"spam"` or `"ham"`
- `confidence` → float between 0.0 and 1.0

### 3. CORS — add this to your FastAPI app

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)
```

---

## 🚀 Load in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `spam-shield/` folder
5. Visit Gmail, LinkedIn, or WhatsApp Web — the extension activates automatically

---

## 🎛️ Features

| Feature | Description |
|---|---|
| **Toggle ON/OFF** | Pause detection without uninstalling |
| **Confidence Badge** | Red badge shows spam % on flagged messages |
| **Stats Dashboard** | Count of scanned, spam, safe messages |
| **Per-platform breakdown** | Gmail / LinkedIn / WhatsApp spam counts |
| **Recent detections** | Last 4 spam/ham detections with confidence |
| **API status indicator** | Shows if your FastAPI is reachable |
| **Toast notifications** | Brief overlay when spam is detected |

---

## 🔧 Tuning

- **Confidence threshold**: Change `CONFIDENCE_THRESHOLD` in `content.js` (default: `0.6`)
- **Scan interval**: Change `SCAN_INTERVAL_MS` (default: `2000ms`)
