import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

def train_confidence_model():
    print("📊 Training Confidence Detection Model...")
    print("📁 Current directory:", os.getcwd())
    
    # The file path - try different possibilities
    base_path = r'D:\Rishika\InfosysSpringBoard_VirtualInternship\AI_Mock_Interview_platform\datasets\ConfiDetect-Confidence-Posture-Dataset'
    
    # List all files in the directory
    print(f"\n📁 Files in {base_path}:")
    for file in os.listdir(base_path):
        print(f"   - {file}")
    
    # Try to find the dataset file
    possible_files = [
        'confidence_features_dataset',
        'confidence_features_dataset.csv',
        'confidence_features_dataset (1)',
        'confidence_features_dataset (1).csv',
        'confidetect_dataset.csv',
        'data.csv',
        'dataset.csv'
    ]
    
    df = None
    for filename in possible_files:
        filepath = os.path.join(base_path, filename)
        if os.path.exists(filepath):
            print(f"\n✅ Found file: {filename}")
            try:
                df = pd.read_csv(filepath)
                print(f"✅ Loaded {len(df)} samples")
                break
            except Exception as e:
                print(f"⚠️ Error reading {filename}: {e}")
                continue
    
    if df is None:
        print("\n❌ Could not find the dataset file!")
        print("📁 Please check the file name and try again.")
        return None, None, None
    
    print(f"\n📋 Shape: {df.shape}")
    print(f"📋 Columns: {df.columns.tolist()}")
    
    # Find target column
    target_col = None
    for col in ['confidence_label', 'label', 'target', 'Confidence_Level', 'Confidence', 'class', 'Category']:
        if col in df.columns:
            target_col = col
            break
    
    if target_col is None:
        # Use the last column as target
        target_col = df.columns[-1]
        print(f"🎯 Using last column as target: {target_col}")
    
    # Get numeric columns for features
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    feature_cols = [col for col in numeric_cols if col != target_col]
    
    if len(feature_cols) == 0:
        print("❌ No numeric feature columns found!")
        return None, None, None
    
    print(f"📊 Features: {len(feature_cols)} columns")
    
    # Prepare data
    X = df[feature_cols].values
    y = df[target_col].astype(str).values
    
    # Handle missing values
    X = np.nan_to_num(X, nan=0.0)
    
    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    print(f"📊 Classes: {le.classes_.tolist()}")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print(f"📊 Train: {len(X_train)}, Test: {len(X_test)}")
    
    # Train model
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n✅ Accuracy: {accuracy:.4f}")
    print("\n📊 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    # Save models
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/confidence_model.pkl')
    joblib.dump(le, 'models/confidence_label_encoder.pkl')
    joblib.dump(scaler, 'models/confidence_scaler.pkl')
    
    model_info = {
        'accuracy': float(accuracy),
        'classes': le.classes_.tolist(),
        'features': feature_cols
    }
    
    with open('models/confidence_model_info.json', 'w') as f:
        json.dump(model_info, f, indent=2)
    
    print("\n✅ Models saved in 'models/' directory")
    return model, le, scaler

if __name__ == "__main__":
    print("🚀 Starting Model Training...")
    print("📁 Working directory:", os.getcwd())
    train_confidence_model()