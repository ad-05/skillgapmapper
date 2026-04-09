"""
ML Training Pipeline — AI-Based Skill Gap Career Mapper
========================================================
Generates synthetic assessment data, trains a Random Forest classifier,
performs K-Means clustering for learner personas, and saves all models.

Run once:  python train_model.py
Models saved to: models/
"""

import numpy as np
import json, os, joblib, random
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (classification_report, confusion_matrix,
                              accuracy_score, f1_score, roc_auc_score)
from sklearn.preprocessing import StandardScaler
from sklearn.inspection import permutation_importance

random.seed(42)
np.random.seed(42)

# ── Career role definitions (mirrors career_roles.csv) ────────────────────────
ROLES = {
    "Full Stack Developer": {
        "Python":8,"JavaScript":9,"React":8,"Node.js":8,"SQL":7,
        "REST APIs":8,"Git":7,"CSS":7,"TypeScript":7,"Docker":5
    },
    "Data Scientist": {
        "Python":9,"SQL":7,"Git":5,"Machine Learning":9,"Statistics":8,
        "Data Visualization":7,"Pandas":8,"Deep Learning":7,
        "Feature Engineering":7,"Mathematics":8,"Data Analysis":7
    },
    "DevOps Engineer": {
        "Python":5,"Git":8,"Docker":9,"Kubernetes":8,"Linux":9,
        "CI/CD":8,"AWS":8,"Terraform":7,"Monitoring":7
    },
    "Cybersecurity Analyst": {
        "Python":6,"Linux":8,"Networking":9,"Ethical Hacking":8,
        "Cryptography":8,"Incident Response":7,"SIEM Tools":7,
        "Risk Assessment":8,"Firewalls":7,"Compliance":6
    },
    "AI/ML Engineer": {
        "Python":9,"REST APIs":7,"Git":7,"Machine Learning":9,
        "Statistics":8,"Deep Learning":9,"TensorFlow/PyTorch":8,
        "Mathematics":8,"Data Processing":7,"MLOps":6,"Cloud Platforms":8
    },
    "Product Manager": {
        "SQL":5,"Product Strategy":9,"Agile/Scrum":8,"Data Analysis":7,
        "Communication":9,"User Research":8,"Roadmapping":8,
        "Stakeholder Management":8,"Market Research":7,"Leadership":8
    },
}

ALL_SKILLS = sorted(set(s for r in ROLES.values() for s in r.keys()))
ROLE_NAMES  = list(ROLES.keys())
LEVEL_MAP   = {"None": 0, "Beginner": 3, "Intermediate": 6, "Advanced": 8, "Expert": 10}
LEVELS      = [0, 3, 6, 8, 10]

print(f"Skills: {len(ALL_SKILLS)}   Roles: {len(ROLE_NAMES)}")


# ── Synthetic data generation ─────────────────────────────────────────────────

def generate_sample(role_name, outcome):
    """
    Generate one synthetic learner profile for a given role and outcome.
    outcome: 1 = job-ready, 0 = not ready

    Strategy:
    - job-ready profiles: mostly Advanced/Expert in required skills, random for others
    - not-ready profiles: mostly None/Beginner/Intermediate, random mix
    """
    req = ROLES[role_name]
    vector = {}

    for skill in ALL_SKILLS:
        required = req.get(skill, 0)

        if required == 0:
            # Skill not needed — random low-to-mid value
            vector[skill] = random.choice([0, 0, 3, 3, 6])
        elif outcome == 1:
            # Ready: must meet or exceed requirement, with some noise
            min_level = max(0, required - 2)
            choices = [l for l in LEVELS if l >= min_level]
            # Weight towards higher levels
            weights = [1, 2, 3, 4, 5][:len(choices)]
            vector[skill] = random.choices(choices, weights=weights)[0]
        else:
            # Not ready: generally below requirement
            max_level = max(0, required - 2)
            choices = [l for l in LEVELS if l <= max_level] or [0, 3]
            vector[skill] = random.choice(choices)

    return vector


def build_dataset(n_per_class=400):
    X, y, roles_col = [], [], []

    for role_name in ROLE_NAMES:
        for outcome in [0, 1]:
            for _ in range(n_per_class):
                vec = generate_sample(role_name, outcome)
                X.append([vec[s] for s in ALL_SKILLS])
                y.append(outcome)
                roles_col.append(role_name)

    return np.array(X), np.array(y), roles_col


print("\n📊 Generating synthetic dataset...")
X, y, roles_col = build_dataset(n_per_class=500)
print(f"   Dataset shape: {X.shape}  |  Ready: {y.sum()}  |  Not ready: {(y==0).sum()}")


# ── Train / test split ────────────────────────────────────────────────────────

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"   Train: {len(X_train)}  |  Test: {len(X_test)}")


# ── Random Forest classifier ──────────────────────────────────────────────────

print("\n🌲 Training Random Forest...")
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1,
)
rf.fit(X_train, y_train)

y_pred   = rf.predict(X_test)
y_proba  = rf.predict_proba(X_test)[:, 1]
acc      = accuracy_score(y_test, y_pred)
f1       = f1_score(y_test, y_pred)
auc      = roc_auc_score(y_test, y_proba)

print(f"   Accuracy : {acc:.4f}")
print(f"   F1 Score : {f1:.4f}")
print(f"   ROC-AUC  : {auc:.4f}")

# Cross-validation
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(rf, X, y, cv=cv, scoring="f1")
print(f"   5-Fold CV F1: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

print("\n   Classification Report:")
print(classification_report(y_test, y_pred, target_names=["Not Ready", "Job Ready"]))


# ── Permutation importance (SHAP-equivalent, no external lib needed) ──────────

print("🔍 Computing feature importance (permutation-based)...")
perm_imp = permutation_importance(rf, X_test, y_test, n_repeats=10,
                                   random_state=42, scoring="f1")
importance_means = perm_imp.importances_mean
importance_stds  = perm_imp.importances_std

# Also get built-in RF feature importances (MDI)
mdi_importance = rf.feature_importances_

# Combine both for robustness
combined_importance = (importance_means / importance_means.max() +
                       mdi_importance / mdi_importance.max()) / 2

feature_importance = {
    ALL_SKILLS[i]: {
        "permutation": float(importance_means[i]),
        "permutation_std": float(importance_stds[i]),
        "mdi": float(mdi_importance[i]),
        "combined": float(combined_importance[i]),
    }
    for i in range(len(ALL_SKILLS))
}

top_features = sorted(feature_importance.items(),
                      key=lambda x: x[1]["combined"], reverse=True)[:10]
print("   Top 10 most important skills:")
for skill, vals in top_features:
    bar = "█" * int(vals["combined"] * 30)
    print(f"   {skill:<30} {bar} {vals['combined']:.4f}")


# ── K-Means clustering — learner personas ────────────────────────────────────

print("\n🔵 Training K-Means clustering (learner personas)...")
scaler  = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Find optimal k using inertia elbow (we'll use k=4 personas)
K = 4
kmeans = KMeans(n_clusters=K, random_state=42, n_init=20, max_iter=500)
kmeans.fit(X_scaled)

# Label each cluster with a meaningful persona name
cluster_labels = kmeans.labels_
persona_profiles = {}

for k in range(K):
    mask      = cluster_labels == k
    mean_vec  = X[mask].mean(axis=0)
    ready_pct = y[mask].mean() * 100

    # Find top 3 strongest and weakest skill groups in this cluster
    skill_means = {ALL_SKILLS[i]: mean_vec[i] for i in range(len(ALL_SKILLS))}
    top3    = sorted(skill_means, key=skill_means.get, reverse=True)[:3]
    bottom3 = [s for s in sorted(skill_means, key=skill_means.get) if skill_means[s] > 0][:3]

    persona_profiles[k] = {
        "size": int(mask.sum()),
        "ready_pct": round(ready_pct, 1),
        "top_skills": top3,
        "weak_skills": bottom3,
        "mean_vector": {s: round(float(mean_vec[i]), 2) for i, s in enumerate(ALL_SKILLS)},
    }

# Auto-name personas based on their characteristics
PERSONA_NAMES = ["The Specialist", "The Generalist", "The Beginner", "The Almost-Ready"]
for k, profile in persona_profiles.items():
    ready = profile["ready_pct"]
    name = (
        "The Expert"       if ready >= 70 else
        "The Almost-Ready" if ready >= 50 else
        "The Generalist"   if profile["size"] > len(X) // (K * 0.8) else
        "The Beginner"
    )
    profile["name"] = name
    print(f"   Cluster {k} — {name}: {profile['size']} learners, {ready}% ready, top: {profile['top_skills']}")


# ── Confusion matrix ──────────────────────────────────────────────────────────

cm = confusion_matrix(y_test, y_pred)
print(f"\n   Confusion Matrix:\n   {cm}")


# ── Save everything ───────────────────────────────────────────────────────────

os.makedirs("models", exist_ok=True)

joblib.dump(rf,     "models/readiness_rf.pkl")
joblib.dump(kmeans, "models/learner_kmeans.pkl")
joblib.dump(scaler, "models/scaler.pkl")

metadata = {
    "all_skills":          ALL_SKILLS,
    "role_names":          ROLE_NAMES,
    "feature_importance":  feature_importance,
    "persona_profiles":    persona_profiles,
    "model_metrics": {
        "accuracy":   round(acc, 4),
        "f1_score":   round(f1, 4),
        "roc_auc":    round(auc, 4),
        "cv_f1_mean": round(float(cv_scores.mean()), 4),
        "cv_f1_std":  round(float(cv_scores.std()), 4),
        "n_train":    int(len(X_train)),
        "n_test":     int(len(X_test)),
        "n_features": int(len(ALL_SKILLS)),
        "n_classes":  2,
    },
    "confusion_matrix": cm.tolist(),
}

with open("models/metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("\n✅ Models saved:")
print("   models/readiness_rf.pkl     — Random Forest classifier")
print("   models/learner_kmeans.pkl   — K-Means persona clustering")
print("   models/scaler.pkl           — StandardScaler for clustering")
print("   models/metadata.json        — Feature importance + metrics + personas")
print(f"\n🎯 Final Model Performance:")
print(f"   Accuracy: {acc:.2%}  |  F1: {f1:.4f}  |  AUC: {auc:.4f}")
