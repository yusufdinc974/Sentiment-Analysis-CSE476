from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware
import joblib
import re

app = FastAPI()

# --- CORS CONFIGURATION ---
# Allows requests from your React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. LOAD ALL AI MODELS
# ==========================================

# A. Load DistilBERT (General Sentiment - Positive/Negative)
print("Loading DistilBERT...")
distilbert_pipeline = pipeline(
    "sentiment-analysis", 
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

# B. Load GoEmotions (Detailed Emotions - Joy, Anger, etc.)
print("Loading Emotion Model (GoEmotions)...")
emotion_pipeline = pipeline(
    "text-classification", 
    model="bhadresh-savani/bert-base-go-emotion", 
    top_k=None # Return scores for all 28 emotions
)

# C. Load TF-IDF (Fast/Lightweight Model)
print("Loading TF-IDF Model...")
try:
    tfidf_model = joblib.load('sentiment_model.pkl')
    tfidf_vectorizer = joblib.load('tfidf_vectorizer.pkl')
    tfidf_ready = True
except:
    print("WARNING: TF-IDF files not found. TF-IDF option will fail.")
    tfidf_ready = False

print("✅ All models loaded successfully!")


# ==========================================
# 2. HELPER FUNCTIONS & CLASSES
# ==========================================

def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text

class ReviewRequest(BaseModel):
    text: str
    model_type: str = "distilbert" # Options: "distilbert", "tfidf", "emotion"


# ==========================================
# 3. API ENDPOINTS
# ==========================================

@app.post("/predict")
async def predict_sentiment(request: ReviewRequest):
    """
    Analyzes a single review using the selected model.
    """
    
    # --- OPTION 1: TF-IDF (Fastest) ---
    if request.model_type == "tfidf":
        if not tfidf_ready:
            raise HTTPException(status_code=500, detail="TF-IDF model files missing on server.")
        
        cleaned = clean_text(request.text)
        vec = tfidf_vectorizer.transform([cleaned])
        prediction = tfidf_model.predict(vec)[0]
        probs = tfidf_model.predict_proba(vec)[0]
        confidence = max(probs)
        
        return {
            "sentiment": prediction.upper(), 
            "confidence": float(confidence)
        }

    # --- OPTION 2: EMOTION ANALYSIS (Detailed) ---
    elif request.model_type == "emotion":
        # Run the model
        results = emotion_pipeline(request.text)[0]
        
        # Sort results by score (highest confidence first)
        sorted_emotions = sorted(results, key=lambda x: x['score'], reverse=True)
        
        # Get the winner
        top_emotion = sorted_emotions[0]
        
        return {
            "sentiment": top_emotion['label'].upper(), # e.g., "JOY" or "ADMIRATION"
            "confidence": top_emotion['score'],
            "details": sorted_emotions[:3] # Return top 3 for the UI to display
        }

    # --- OPTION 3: DISTILBERT (Default / Balanced) ---
    else:
        result = distilbert_pipeline(request.text)[0]
        return {
            "sentiment": result['label'], 
            "confidence": result['score']
        }


@app.post("/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    model_type: str = Form("distilbert") 
):
    # 1. Read file
    content = await file.read()
    text_content = content.decode("utf-8")
    reviews = text_content.splitlines()
    
    total_reviews = 0
    
    # --- BRANCH A: EMOTION MODEL (28 Labels) ---
    if model_type == "emotion":
        emotion_tally = {} 
        
        for review in reviews:
            if not review.strip(): continue
            safe_review = review[:512]
            
            # 1. Run model
            # returns a list of dicts: [{'label': 'joy', 'score': 0.9}, ...]
            all_emotions = emotion_pipeline(safe_review)[0] 
            
            # 2. Find the emotion with the highest score
            top_emotion = max(all_emotions, key=lambda x: x['score'])
            
            # 3. Get the label
            label = top_emotion['label'] 
            
            # 4. Add to tally
            emotion_tally[label] = emotion_tally.get(label, 0) + 1
            total_reviews += 1
            
        # Format for Frontend (Sorted List)
        breakdown = []
        for label, count in emotion_tally.items():
            percentage = (count / total_reviews) * 100
            breakdown.append({
                "label": label.upper(),
                "count": count,
                "percentage": round(percentage, 1)
            })
            
        # Sort by most frequent
        breakdown.sort(key=lambda x: x["count"], reverse=True)
        
        return {
            "model_mode": "emotion",
            "total": total_reviews,
            "stats": breakdown
        }

    # --- BRANCH B: BINARY MODELS (DistilBERT / TF-IDF) ---
    else:
        stats = {"positive": 0, "negative": 0}
        
        use_tfidf = (model_type == "tfidf") and tfidf_ready
        
        for review in reviews:
            if not review.strip(): continue
            safe_review = review[:512]
            
            if use_tfidf:
                cleaned = clean_text(safe_review)
                vec = tfidf_vectorizer.transform([cleaned])
                label = tfidf_model.predict(vec)[0].upper()
            else:
                result = distilbert_pipeline(safe_review)[0]
                label = result['label']
                
            if label == 'POSITIVE': stats["positive"] += 1
            else: stats["negative"] += 1
            total_reviews += 1

        if total_reviews > 0:
            pos_ratio = (stats["positive"] / total_reviews) * 100
            neg_ratio = (stats["negative"] / total_reviews) * 100
        else:
            pos_ratio = 0
            neg_ratio = 0
            
        return {
            "model_mode": "binary",
            "total": total_reviews,
            "stats": {
                "positive": stats["positive"],
                "negative": stats["negative"],
                "positive_ratio": pos_ratio,
                "negative_ratio": neg_ratio
            }
        }