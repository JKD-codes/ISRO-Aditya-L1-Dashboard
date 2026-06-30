import os
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib
from datetime import datetime, timedelta


MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

def extract_features(solexs_series, helios_series):
    """
    Extracts features for the XGBoost model.
    Takes lists of recent data points.
    """
    if not solexs_series or not helios_series:
        return None
        
    # Convert to arrays
    s_flux = np.array([d['flux'] for d in solexs_series])
    h_counts = np.array([d['counts_per_sec'] for d in helios_series])
    
    if len(s_flux) < 5 or len(h_counts) < 5:
        return None
        
    # Features:
    # 1-3. Recent SoLEXS stats
    s_mean = np.mean(s_flux[-5:])
    s_max = np.max(s_flux[-5:])
    s_min = np.min(s_flux[-5:])
    
    # 4. SoLEXS rate of change (derivative over last 5 points)
    s_roc = s_flux[-1] - s_flux[-5]
    
    # 5-6. Recent HEL1OS stats
    h_mean = np.mean(h_counts[-5:])
    h_max = np.max(h_counts[-5:])
    
    # 7. HEL1OS rate of change
    h_roc = h_counts[-1] - h_counts[-5]
    
    # 8. Spectral Hardness Ratio (Proxy: HEL1OS counts / SoLEXS flux)
    # Note: Real hardness ratio uses different energy bands of the same instrument,
    # but for this hackathon combining both instruments works as a proxy.
    hardness_ratio = h_max / (s_max * 1e9 + 1)
    
    return np.array([s_mean, s_max, s_min, s_roc, h_mean, h_max, h_roc, hardness_ratio])

def generate_synthetic_training_data(num_samples=1000):
    """
    Generates synthetic feature vectors and labels for training,
    since we don't have real labeled historical datasets.
    """
    X = []
    y_15 = []
    y_30 = []
    y_60 = []
    
    for _ in range(num_samples):
        # 0 = No flare, 1 = Flare
        is_flare = np.random.choice([0, 1], p=[0.8, 0.2])
        
        if is_flare:
            # Flare-like features
            s_mean = np.random.uniform(1e-6, 1e-3)
            s_max = s_mean * np.random.uniform(1.1, 3.0)
            s_min = s_mean * np.random.uniform(0.5, 0.9)
            s_roc = np.random.uniform(1e-7, 1e-4) # Fast rise
            h_mean = np.random.uniform(500, 5000)
            h_max = h_mean * np.random.uniform(1.2, 2.0)
            h_roc = np.random.uniform(100, 1000)
            hardness = h_max / (s_max * 1e9 + 1)
            
            # If currently spiking, high chance of flare in near future
            y_15.append(np.random.choice([0, 1], p=[0.1, 0.9]))
            y_30.append(np.random.choice([0, 1], p=[0.3, 0.7]))
            y_60.append(np.random.choice([0, 1], p=[0.6, 0.4]))
        else:
            # Quiet sun features
            s_mean = np.random.uniform(1e-9, 1e-7)
            s_max = s_mean * np.random.uniform(1.01, 1.1)
            s_min = s_mean * np.random.uniform(0.9, 0.99)
            s_roc = np.random.uniform(-1e-9, 1e-9)
            h_mean = np.random.uniform(10, 100)
            h_max = h_mean * np.random.uniform(1.0, 1.2)
            h_roc = np.random.uniform(-10, 10)
            hardness = h_max / (s_max * 1e9 + 1)
            
            y_15.append(np.random.choice([0, 1], p=[0.98, 0.02]))
            y_30.append(np.random.choice([0, 1], p=[0.95, 0.05]))
            y_60.append(np.random.choice([0, 1], p=[0.90, 0.10]))
            
        X.append([s_mean, s_max, s_min, s_roc, h_mean, h_max, h_roc, hardness])
        
    return np.array(X), np.array(y_15), np.array(y_30), np.array(y_60)

def train_and_save_model():
    """Trains the XGBoost models and saves them to disk."""
    print("Generating synthetic data and training XGBoost models...")
    X, y_15, y_30, y_60 = generate_synthetic_training_data(1000)
    
    model_15 = xgb.XGBClassifier(n_estimators=50, max_depth=3, learning_rate=0.1, use_label_encoder=False, eval_metric='logloss')
    model_30 = xgb.XGBClassifier(n_estimators=50, max_depth=3, learning_rate=0.1, use_label_encoder=False, eval_metric='logloss')
    model_60 = xgb.XGBClassifier(n_estimators=50, max_depth=3, learning_rate=0.1, use_label_encoder=False, eval_metric='logloss')
    
    model_15.fit(X, y_15)
    model_30.fit(X, y_30)
    model_60.fit(X, y_60)
    
    # Calculate dummy metrics based on training data for the hackathon
    # In a real scenario, this would be computed on a test set
    preds_15 = model_15.predict(X)
    
    # True Skill Statistic (TSS) = Sensitivity + Specificity - 1
    # POD = Sensitivity
    # FAR = 1 - Precision
    
    tp = np.sum((preds_15 == 1) & (y_15 == 1))
    tn = np.sum((preds_15 == 0) & (y_15 == 0))
    fp = np.sum((preds_15 == 1) & (y_15 == 0))
    fn = np.sum((preds_15 == 0) & (y_15 == 1))
    
    pod = tp / (tp + fn) if (tp + fn) > 0 else 0
    far = fp / (tp + fp) if (tp + fp) > 0 else 0
    tss = pod + (tn / (tn + fp)) - 1 if (tn + fp) > 0 else 0
    
    models = {
        'model_15': model_15,
        'model_30': model_30,
        'model_60': model_60,
        'metrics': {
            'tss': round(tss, 2),
            'pod': round(pod, 2),
            'far': round(far, 2)
        }
    }
    
    joblib.dump(models, MODEL_PATH)
    print(f"Models saved to {MODEL_PATH}")
    return models

def get_model():
    """Loads the model from disk, training it if it doesn't exist."""
    if not os.path.exists(MODEL_PATH):
        return train_and_save_model()
    return joblib.load(MODEL_PATH)

def flux_to_class_probs(expected_flux):
    """Maps a raw predicted flux to GOES class probabilities (heuristic mapping)"""
    if expected_flux >= 1e-4:
        return {"B": 1, "C": 5, "M": 15, "X": 79}
    if expected_flux >= 1e-5:
        return {"B": 5, "C": 15, "M": 75, "X": 5}
    if expected_flux >= 1e-6:
        return {"B": 15, "C": 75, "M": 9, "X": 1}
    
    return {"B": 85, "C": 10, "M": 4, "X": 1}

def predict(solexs_series, helios_series):
    """
    Runs the live data through the XGBoost model to get flare probabilities.
    Returns structured JSON for the frontend.
    """
    models = get_model()
    
    features = extract_features(solexs_series, helios_series)
    if features is None:
        return None
        
    X_pred = features.reshape(1, -1)
    
    prob_15 = float(models['model_15'].predict_proba(X_pred)[0][1])
    prob_30 = float(models['model_30'].predict_proba(X_pred)[0][1])
    prob_60 = float(models['model_60'].predict_proba(X_pred)[0][1])
    
    # We estimate an expected flux multiplier based on probability
    current_flux = solexs_series[-1]['flux']
    
    # Heuristic for demo purposes: scale current flux based on flare probability
    expected_flux_15 = current_flux * (1.0 + prob_15 * 50)
    expected_flux_30 = current_flux * (1.0 + prob_30 * 100)
    expected_flux_60 = current_flux * (1.0 + prob_60 * 200)
    
    horizons = [
        { 
            "horizon": 15, 
            "class_probs": flux_to_class_probs(expected_flux_15), 
            "confidence": round(prob_15 * 100) 
        },
        { 
            "horizon": 30, 
            "class_probs": flux_to_class_probs(expected_flux_30), 
            "confidence": round(prob_30 * 100) 
        },
        { 
            "horizon": 60, 
            "class_probs": flux_to_class_probs(expected_flux_60), 
            "confidence": round(prob_60 * 100) 
        }
    ]
    
    return {
        "horizons": horizons,
        "metrics": models['metrics'],
        "flux_trajectory": [] # Generated by frontend or enhanced later
    }
