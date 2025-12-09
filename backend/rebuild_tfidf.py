import pandas as pd
import re
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Configuration
csv_path = 'IMDB_Dataset.csv'
model_path = 'sentiment_model.pkl'
vectorizer_path = 'tfidf_vectorizer.pkl'

def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return text

# 1. Try to load real data, otherwise use dummy data
if os.path.exists(csv_path):
    print(f"Found {csv_path}. Training on REAL data (this takes 30s)...")
    df = pd.read_csv(csv_path)
    # Use only first 10k rows to speed it up for the demo
    df = df.iloc[:10000] 
    X = df['review'].apply(clean_text)
    y = df['sentiment']
else:
    print(f"⚠️ {csv_path} not found.")


# 2. Vectorize
print("Vectorizing...")
# ngram_range=(1,2) helps capture "not good"
vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=5000)
X_vec = vectorizer.fit_transform(X)

# 3. Train
print("Training Logistic Regression...")
model = LogisticRegression()
model.fit(X_vec, y)

# 4. Save
print(f"Saving to {model_path} and {vectorizer_path}...")
joblib.dump(model, model_path)
joblib.dump(vectorizer, vectorizer_path)

print("✅ Done! You can now run Docker.")