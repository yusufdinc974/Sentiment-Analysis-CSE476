from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware
import joblib
import re

app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOAD MODELS ---
print("Loading DistilBERT...")
distilbert_pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

print("Loading TF-IDF Model...")
try:
    tfidf_model = joblib.load('sentiment_model.pkl')
    tfidf_vectorizer = joblib.load('tfidf_vectorizer.pkl')
    tfidf_ready = True
except:
    print("WARNING: TF-IDF files not found. TF-IDF option will fail.")
    tfidf_ready = False

print("All models loaded!")

# --- HELPER FOR TF-IDF ---
def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text

# --- INPUT STRUCTURE ---
class ReviewRequest(BaseModel):
    text: str
    model_type: str = "distilbert" # Default to the smart one

# --- PREDICT ENDPOINT ---
@app.post("/predict")
async def predict_sentiment(request: ReviewRequest):
    # 1. Check which model the user wants
    if request.model_type == "tfidf":
        if not tfidf_ready:
            raise HTTPException(status_code=500, detail="TF-IDF model files missing on server.")
        
        # Use Simple Model
        cleaned = clean_text(request.text)
        vec = tfidf_vectorizer.transform([cleaned])
        prediction = tfidf_model.predict(vec)[0] # 'positive' or 'negative'
        probs = tfidf_model.predict_proba(vec)[0]
        confidence = max(probs)
        
        return {"sentiment": prediction.upper(), "confidence": confidence}

    else:
        # Use Advanced Model (DistilBERT)
        result = distilbert_pipeline(request.text)[0]
        return {"sentiment": result['label'], "confidence": result['score']}

# --- FILE ANALYSIS ENDPOINT (Keep this simple, defaulting to DistilBERT for now) ---
@app.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    model_type: str = Form("distilbert") # <--- Receives the choice from Frontend
):
    # 1. Read file
    content = await file.read()
    text_content = content.decode("utf-8")
    reviews = text_content.splitlines()
    
    stats = {"positive": 0, "negative": 0, "total": 0}
    
    # 2. Check if we are using the Fast Model (TF-IDF)
    use_tfidf = (model_type == "tfidf") and tfidf_ready
    
    for review in reviews:
        if not review.strip():
            continue
            
        safe_review = review[:512]
        
        # 3. The Logic Switch
        if use_tfidf:
            # --- Fast Way ---
            cleaned = clean_text(safe_review)
            vec = tfidf_vectorizer.transform([cleaned])
            label = tfidf_model.predict(vec)[0].upper() # 'POSITIVE' or 'NEGATIVE'
        else:
            # --- Slow/Smart Way ---
            result = distilbert_pipeline(safe_review)[0]
            label = result['label']
            
        # 4. Tally stats
        if label == 'POSITIVE':
            stats["positive"] += 1
        else:
            stats["negative"] += 1
        
        stats["total"] += 1

    # 5. Calculate Ratios
    if stats["total"] > 0:
        stats["positive_ratio"] = (stats["positive"] / stats["total"]) * 100
        stats["negative_ratio"] = (stats["negative"] / stats["total"]) * 100
    else:
        stats["positive_ratio"] = 0
        stats["negative_ratio"] = 0
        
    return stats