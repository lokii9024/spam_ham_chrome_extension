from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import pickle
import re
import nltk
import joblib
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# -------------------------------
# Initialize App
# -------------------------------
app = FastAPI(title="Spam Detection API")

# -------------------------------
# Enable CORS (important for extension)
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Load Model & Vectorizer
# -------------------------------
model = joblib.load("svm_model.pkl")
vectorizer = joblib.load("tfidf_vectorizer.pkl")

# Download NLTK data (runs once)
nltk.download("punkt")
nltk.download("stopwords")
nltk.download("wordnet")

stop_words = set(stopwords.words("english"))
lemmatizer = WordNetLemmatizer()

# -------------------------------
# Request Schema
# -------------------------------
class TextRequest(BaseModel):
    text: str

# -------------------------------
# Preprocessing Function
# -------------------------------
def preprocess(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-zA-Z]", " ", text)
    words = text.split()
    words = [lemmatizer.lemmatize(word) for word in words if word not in stop_words]
    return " ".join(words)

# -------------------------------
# Root Endpoint
# -------------------------------
@app.get("/")
def home():
    return {"message": "Spam Detection API is running 🚀"}

# -------------------------------
# Prediction Endpoint
# -------------------------------
@app.post("/predict")
def predict(req: TextRequest):
    processed_text = preprocess(req.text)

    # Keep sparse (IMPORTANT)
    vector = vectorizer.transform([processed_text]).toarray()

    prediction = model.predict(vector)[0]

    # Try to get probability (if available)
    confidence = None
    if hasattr(model, "predict_proba"):
        confidence = float(model.predict_proba(vector)[0][1])

    return {
        "input_text": req.text,
        "prediction": "spam" if prediction == 1 else "ham",
        "confidence": confidence
    }