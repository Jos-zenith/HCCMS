"""
HCCMS bark identification server.

Serves the BarkVisionAI ResNet50 checkpoint (13 Himalayan tree species)
over HTTP for the Next.js dashboard (app/api/identify-tree/route.ts).

  GET  /health       -> {"status": "ok", "model_loaded": bool, "classes": [...]}
  POST /predict      -> multipart field "image" (bark); top-k species predictions
  POST /leaf-health  -> multipart field "image" (canopy); leaf colour indices
"""
import io
import os
import urllib.request

import numpy as np
import torch
import torch.nn as nn
from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
from torchvision import models, transforms

MODEL_PATH = os.environ.get("MODEL_PATH", "victori/best_resnet50.pth")
MODEL_URL = os.environ.get("MODEL_URL")
TOP_K = 3

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
CORS(app)

# Same preprocessing the model was trained with (ImageNet normalisation, 224x224)
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class ResNet50(nn.Module):
    """Matches the wrapper used in BarkVisionAI's prepare_model.py (keys are 'model.*')."""

    def __init__(self, num_classes):
        super().__init__()
        self.model = models.resnet50(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, num_classes)

    def forward(self, x):
        return self.model(x)


def load_model():
    if not os.path.exists(MODEL_PATH):
        if not MODEL_URL:
            app.logger.error("Model not found at %s and MODEL_URL not set", MODEL_PATH)
            return None, []
        os.makedirs(os.path.dirname(MODEL_PATH) or ".", exist_ok=True)
        app.logger.info("Downloading model from %s", MODEL_URL)
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)

    checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
    class_names = list(checkpoint["class_names"])
    net = ResNet50(len(class_names))
    net.load_state_dict(checkpoint["model_state_dict"])
    net.eval()
    return net, class_names


model, class_names = load_model()


@app.get("/health")
def health():
    return jsonify({
        "status": "ok" if model is not None else "degraded",
        "model_loaded": model is not None,
        "classes": class_names,
    })


@app.post("/predict")
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded"}), 503

    file = request.files.get("image")
    if file is None:
        return jsonify({"error": "No image provided"}), 400
    try:
        img = Image.open(io.BytesIO(file.read())).convert("RGB")
    except UnidentifiedImageError:
        return jsonify({"error": "Unsupported image format"}), 400

    with torch.no_grad():
        probs = torch.softmax(model(preprocess(img).unsqueeze(0)), dim=1)[0]
    top = torch.topk(probs, k=min(TOP_K, len(class_names)))
    top_k = [
        {"species": class_names[i], "confidence": round(float(p), 4)}
        for p, i in zip(top.values.tolist(), top.indices.tolist())
    ]
    return jsonify({**top_k[0], "top_k": top_k})


# Hue bands on PIL's 0-255 hue scale (x 360/255 for degrees)
HUE_STRESSED = (18, 46)   # ~25-65 deg: yellow / olive / browning leaves
HUE_HEALTHY = (46, 120)   # ~65-170 deg: green foliage
MIN_COVERAGE = 0.15


@app.post("/leaf-health")
def leaf_health():
    """
    Colour-based foliage health for close-up canopy photos from the ESP32-CAM.
      green_ratio          healthy-green pixels / all foliage pixels (chlorosis indicator)
      vari                 mean Visible Atmospherically Resistant Index (G-R)/(G+R-B)
      vegetation_coverage  share of the frame that is foliage
    Works best with consistent framing and daylight (see README).
    """
    file = request.files.get("image")
    if file is None:
        return jsonify({"error": "No image provided"}), 400
    try:
        img = Image.open(io.BytesIO(file.read())).convert("RGB")
    except UnidentifiedImageError:
        return jsonify({"error": "Unsupported image format"}), 400

    img.thumbnail((320, 320))
    rgb = np.asarray(img, dtype=np.float32) / 255.0
    hsv = np.asarray(img.convert("HSV"), dtype=np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1] / 255.0, hsv[..., 2] / 255.0

    lit = (s > 0.2) & (v > 0.15) & (v < 0.98)
    healthy = lit & (h >= HUE_HEALTHY[0]) & (h < HUE_HEALTHY[1])
    stressed = lit & (h >= HUE_STRESSED[0]) & (h < HUE_STRESSED[1])
    foliage = healthy | stressed
    coverage = float(foliage.mean())
    if coverage < MIN_COVERAGE:
        return jsonify({"error": "No foliage detected; frame the canopy closely", "vegetation_coverage": round(coverage, 3)}), 422

    r, g, b = rgb[..., 0][foliage], rgb[..., 1][foliage], rgb[..., 2][foliage]
    denom = g + r - b
    valid = np.abs(denom) > 0.05
    vari = float(np.clip((g[valid] - r[valid]) / denom[valid], -1, 1).mean()) if valid.any() else 0.0

    return jsonify({
        "green_ratio": round(float(healthy.sum() / foliage.sum()), 4),
        "vari": round(vari, 4),
        "vegetation_coverage": round(coverage, 4),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
