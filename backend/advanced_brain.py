from transformers import pipeline

print("Downloading/Loading the model... (this happens only once)")

# We use a specific model fine-tuned for Sentiment Analysis on IMDB
# This matches your proposal's "ML/Transformer Model" requirement
sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

print("\n--- Advanced AI Ready (Transformer) ---")
print("Type a review to test context.")
print("Type 'exit' to stop.\n")

while True:
    user_input = input("Enter a review: ")
    
    if user_input.lower() == 'exit':
        break
        
    # The pipeline handles tokenization, prediction, and logic automatically
    result = sentiment_pipeline(user_input)[0]
    
    label = result['label']
    score = result['score']
    
    print(f"Prediction: {label}")
    print(f"Confidence: {score * 100:.2f}%\n")