# SpamShield

A Chrome extension and FastAPI backend for real-time spam detection across Gmail, LinkedIn, and WhatsApp Web.

## Project structure

- `Backend/`
  - `app.py` - FastAPI application exposing the spam detection API.
  - `requirements.txt` - Python dependencies for the backend.
  - `svm_model.pkl` and `tfidf_vectorizer.pkl` (expected) - trained spam classifier and TF-IDF vectorizer used by the API.

- `extension/`
  - `manifest.json` - Chrome extension manifest, permissions, and content script configuration.
  - `background.js` - extension service worker for initialization, state defaults, and message relaying.
  - `content.js` - content script that scans page messages, sends text to the API, highlights spam, and updates stats.
  - `popup.html` - extension popup UI for toggling protection, viewing stats, and recent detections.
  - `popup.js` - popup logic for persistence, UI updates, and interaction handling.
  - `highlight.css` - styles used to mark and badge detected spam content.
  - `icons/` - extension icon assets.

- `spam_ham.ipynb` - notebook likely used for model exploration, training, or analysis.

## Features

- Real-time spam detection on:
  - Gmail
  - LinkedIn
  - WhatsApp Web
- Scans message content automatically and highlights suspected spam in the page UI.
- Uses a backend FastAPI service for classification.
- Popup dashboard includes:
  - global message scanned count
  - spam/safe breakdown
  - platform-based spam counts
  - recent detections list
  - clear stats button
  - API connectivity indicator
- Toggleable protection directly from the extension popup.
- Persistent stats stored in Chrome local storage.

## Backend behavior

- Loads a trained `svm_model.pkl` and `tfidf_vectorizer.pkl`.
- Uses NLTK to preprocess message text:
  - lowercase normalization
  - non-letter filtering
  - stop word removal
  - lemmatization
- Exposes:
  - `GET /` - health check
  - `POST /predict` - spam prediction endpoint
- CORS is enabled for extension access.

## Installation

### Backend

1. Open a terminal in `Backend/`.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the API service:
   ```bash
   python app.py
   ```
   or:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 10000
   ```

> Ensure `svm_model.pkl` and `tfidf_vectorizer.pkl` are present in `Backend/`.

### Chrome extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and select the `extension/` folder.
4. If using the local backend, update `API_URL` in `extension/content.js` to your backend URL, for example:
   ```js
   const API_URL = "http://localhost:10000/predict";
   ```
5. Reload the extension.

## Notes

- The extension currently points to a default hosted API URL in `extension/content.js`.
- If you want to use your own backend, change `API_URL` before loading the extension.
- The content script scans DOM nodes on Gmail, LinkedIn, and WhatsApp Web and highlights flagged spam messages.

## Development

- `popup.js` manages UI state and syncs stats with storage.
- `background.js` initializes default state and forwards runtime messages.
- `content.js` handles platform detection, scanning, API requests, spam highlighting, and local storage updates.
