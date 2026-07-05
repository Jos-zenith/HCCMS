# Impact

Household Carbon Credit Monitoring System (HCCMS)

A multi-layer project combining:
- **Frontend:** `victori/` Vue 3 + TypeScript + Vite dashboard
- **Backend:** Firebase Cloud Functions + Firestore
- **Machine Learning:** BarkVisionAI tree species/model inference
- **Hardware:** Arduino/ESP32 plant monitoring sketch

## Project Summary

This repository is designed to collect plant and environmental sensor data from an ESP32-based device, process it through Firebase backend services, and present the results in a real-time Vue dashboard. The project also contains Python-based ML assets for tree species identification and carbon credit monitoring support.

## Repository Structure

- `victori/`
  - Vue 3 frontend app
  - Firebase deployment config
  - `functions/` Firebase Cloud Functions backend code
  - `BarkVisionAI-main/` ML model and training code
- `victori/public/` static frontend assets
- `victori/src/` Vue application source files
- `victori/arduino/plant_monitor/plant_monitor.ino` ESP32 sensor sketch
- `deploy-setup.sh` deployment helper script
- `HCCMS_PROJECT_GUIDE.md` architecture and workflow guidance
- `QUICK_START.md` setup checklist and quick start commands

## Getting Started

### 1. Frontend
```powershell
cd victori
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 2. Python / Firebase Functions
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
cd victori\functions
pip install -r requirements.txt
```

### 3. Firebase
```powershell
npm install -g firebase-tools
cd victori
firebase login
firebase init
firebase deploy
```

### 4. Arduino
- Open `victori/arduino/plant_monitor/plant_monitor.ino`
- Configure WiFi and Firebase settings
- Upload to an ESP32-compatible board

## Recommended Workflow

1. Set up Firebase project and credentials.
2. Start the Vue frontend for local development.
3. Install and test Firebase Cloud Functions.
4. Connect the Arduino device and verify sensor data upload.
5. Add ML inference and carbon monitoring features in the backend.

## Helpful References

- `HCCMS_PROJECT_GUIDE.md` — overall architecture, priorities, and integration guidance
- `QUICK_START.md` — setup checklist and environment commands
- `victori/README.md` — frontend-specific setup for the Vue app
- `victori/functions/requirements.txt` — backend dependencies
- `victori/BarkVisionAI-main/BarkVisionAI-main/requirements.txt` — ML dependencies

## Notes

- `victori/` contains the primary frontend/backend app.
- The Arduino sketch is in `victori/arduino/plant_monitor/plant_monitor.ino`.
- Firebase uses Firestore and Cloud Functions for real-time data processing.

## Git Remote

Connected remote:
- `origin: https://github.com/Jos-zenith/victori.git`
