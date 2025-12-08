from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
from fastapi.middleware.cors import CORSMiddleware
from fastapi import File, UploadFile

# 1. Initialize the App
app = FastAPI()

# 2. Setup CORS (Crucial for connecting React to Python)
# This tells the server: "It's okay if a website running on localhost:5173 talks to me."
origins = [
    "http://localhost:5173", # Standard Vite port
    "http://localhost:3000", # Standard React port (just in case)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Load the Model (The "Brain")
# We load it here so it stays in memory (fast) instead of reloading for every request (slow)
print("Loading model...")
sentiment_pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
print("Model loaded!")

# 4. Define the Data Structure
# This ensures we only accept data that looks like { "text": "some review" }
class ReviewRequest(BaseModel):
    text: str

# 5. The API Endpoint
@app.post("/predict")
async def predict_sentiment(request: ReviewRequest):
    try:
        # Get the text from the request
        review_text = request.text
        
        # Ask the model
        result = sentiment_pipeline(review_text)[0]
        
        # result looks like: {'label': 'POSITIVE', 'score': 0.99}
        return {
            "sentiment": result['label'],
            "confidence": result['score']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    # 1. Read the file content
    content = await file.read()

    # 2. Decode bytes to string (assuming UTF-8)
    text_content = content.decode("utf-8")

    # 3. Split into lines (assuming 1 review per line)
    reviews = text_content.splitlines()

    # 4. Analyze each review
    stats = {"positive": 0, "negative": 0, "total": 0}

    for review in reviews:
        # Skip empty lines
        if not review.strip():
            continue

        # Truncate to 512 chars to prevent model crashes on huge text
        # (DistilBERT has a limit, keeping it safe here)
        safe_review = review[:512]

        result = sentiment_pipeline(safe_review)[0]

        if result['label'] == 'POSITIVE':
            stats["positive"] += 1
        else:
            stats["negative"] += 1

        stats["total"] += 1

    # 5. Calculate percentages
    if stats["total"] > 0:
        stats["positive_ratio"] = (stats["positive"] / stats["total"]) * 100
        stats["negative_ratio"] = (stats["negative"] / stats["total"]) * 100
    else:
        stats["positive_ratio"] = 0
        stats["negative_ratio"] = 0

    return stats

# Health check endpoint (optional, just to see if server is running)
@app.get("/")
def read_root():
    return {"status": "Server is running"}