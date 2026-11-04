# 🌱 NativeYard NJ — Smart Yard Ecology & Native Plant Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Storage-orange?logo=firebase)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash%20Vision-4285F4?logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Live App](https://img.shields.io/badge/Live%20App-njnativeyard.web.app-success?logo=google-chrome)](https://njnativeyard.web.app)

**NativeYard** is an AI-powered landscaping ecology web application designed to help New Jersey homeowners, naturalists, and restoration practitioners transform standard residential yards into vibrant, biodiversity-rich ecosystems.

Starting with a photo of a front, back, or side yard, NativeYard detects individual plants, classifies their ecological status (Keystone Native, Native, Benign Non-Native, or Regulated Invasive), calculates a **Yard Native Score (0–100)** with caterpillar host capacities, and provides actionable guidance to remove invasive plants and plant native substitutes.

---

## 🌟 Key Features

* 🎯 **Interactive Bounding Box Canvas Engine**:
  * Visual inspection of detected plants with confidence badges and verified checkmarks directly over the yard photo.
  * **Delete Box**: Remove false detections or irrelevant foliage with real-time score recalculation.
  * **Redraw Boundary**: Refine box coordinates with draggable handles.
  * **Draw New Region**: Draw a custom bounding box over any missed plant to trigger immediate targeted AI re-identification via `/api/reidentify-box`.
* 📸 **Dual Camera & Hybrid Input**:
  * **Mobile**: Native camera integration with autofocus and rear-lens capture.
  * **Desktop**: Live webcam viewfinder with lens selection, flip controls, 3-second countdown shutter, and flash preview.
* ⚡ **Free-Tier Client-Side Image Compression**:
  * Client-side canvas compression (`compressImageToOptimizedBlob`) auto-orients EXIF photos, constrains long edges to 1280px, and encodes to WebP/JPEG.
  * Reduces 8–12MB smartphone photos down to ~90KB–130KB, allowing 40,000+ yard scans within the Firebase 5 GB Spark free tier.
* 🔬 **Macro Close-Up Leaf Verification (`/api/identify-macro`)**:
  * Snap or upload close-up photos of leaves, bark, or flowers.
  * Extracts botanical traits (leaf margins, venation, arrangement) to verify difficult lookalikes.
* 🌿 **Curated New Jersey Botanical Knowledge Base**:
  * **237 curated species** with 100% photo coverage in `/public/plants/`.
  * **5-Tier Ecological Verdicts**:
    * **⭐ Keystone Natives**: Powerhouse genera (e.g., Oaks, Cherries, Goldenrods) supporting hundreds of caterpillar and pollinator species based on Dr. Doug Tallamy’s research.
    * **🟢 Native Plants**: Indigenous species that provide essential food and habitat for local wildlife.
    * **🔵 Non-Native / Benign**: Non-invasive cultivated plants (e.g., Hostas, Daylilies).
    * **🔴 Regulated Invasives & Watchlist**: Ecological threats requiring eradication (e.g., Japanese Barberry, English Ivy, Callery Pear).
    * **⚪ Unverified / Review Needed**: Flagged for homeowner confirmation.
* 📊 **Yard Native Score (0–100) & Caterpillar Capacity**:
  * Calculates an ecological rating factoring in native diversity, keystone genera presence, and caterpillar host capacity while penalizing invasive threats.
* 🏡 **Property & Yard Area Persistence**:
  * Authenticated homeowner property profiles (Front Yard, Back Bed, Patio, Side Yard).
  * Save scans to Firebase Cloud Storage and Cloud Firestore with 1-click restore to canvas.
* 🔐 **Google One-Click Authentication & Curator Admin Portal**:
  * Seamless Google OAuth sign-in.
  * Admin Curator Portal (`/admin/plants`) for searching, filtering, editing, and managing botanical records.
* 📄 **Actionable Ecological Report & PDF Export**:
  * One-click PDF download via `jsPDF` and `html2canvas` with plant inventories, native swap lists, and invasive removal methods.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   NativeYard Client (Next.js 16 + React 19)            │
│  - Interactive Yard Photo Canvas & SVG Bounding Boxes                  │
│  - WebRTC Live Webcam Viewfinder / Mobile Rear-Camera Capture          │
│  - Client-Side WebP/JPEG Compression (EXIF auto-orientation, max 1280px│
│  - Yard Native Score & Caterpillar Host Breakdown                      │
│  - Filterable Plant Inventory, Rematch Modal & Leaf Macro Diagnosis   │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │                                │
        JSON / Multipart Form Data                   │ JSON Responses
                    │                                │
┌───────────────────┴────────────────────────────────▼───────────────────┐
│               Next.js App Router API Layer (Node.js / Cloud Run)       │
├───────────────────────────────────┬────────────────────────────────────┤
│   POST /api/analyze               │   POST /api/reidentify-box         │
│   - Whole-yard plant detection    │   - Targeted crop re-identification│
│   - Bounding boxes (0-100 norm)   │   - Sharp image slicing            │
│   - Sharp auto-orientation        │   - Crop-specific Gemini prompt    │
├───────────────────────────────────┴────────────────────────────────────┤
│   POST /api/identify-macro                                             │
│   - Close-up leaf/flower diagnosis & botanical trait extraction        │
└─────────────────┬──────────────────────────────────┬───────────────────┘
                  │                                  │
                  ▼                                  ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│        Google Cloud & Gemini      │ │         Firebase Services        │
│  - Gemini 2.5 Flash Vision API    │ │  - Firebase Auth (Google OAuth)  │
│  - Pl@ntNet Botanical API (backup)│ │  - Cloud Firestore (plants, db)  │
│  - Structured JSON Schemas        │ │  - Cloud Storage (yard photos)   │
│  - App Hosting & Cloud Run        │ │  - Firebase Hosting (CDN rewrite)│
└───────────────────────────────────┘ └──────────────────────────────────┘
```

---

## 📁 Repository Structure

The active production application is organized in `web3/`:

```text
LandscapingApp/
├── README.md                      # Project documentation and guide
├── .gitignore                     # Git ignore rules (secrets, build outputs, debug logs)
├── .env.example                   # Environment configuration template
├── docs/
│   ├── SPEC.md                    # Core product & technical specification
│   └── WEB3_ENHANCEMENTS_SUMMARY.md # Architectural decisions & enhancement log
└── web3/                          # Main Next.js 16 + Firebase Application
    ├── package.json               # Dependencies and npm scripts
    ├── next.config.ts             # Next.js configuration
    ├── tsconfig.json              # TypeScript configuration
    ├── firebase.json              # Firebase Hosting & App Hosting rewrites
    ├── firestore.rules            # Firestore security rules
    ├── storage.rules              # Cloud Storage security rules
    ├── apphosting.yaml            # Firebase App Hosting compute config
    ├── app/
    │   ├── layout.tsx             # Root layout with Fraunces & DM Sans fonts
    │   ├── page.tsx               # Main application orchestration & state machine
    │   ├── globals.css            # Tailwind CSS v4 tokens, themes & adaptive grid
    │   ├── admin/
    │   │   └── plants/
    │   │       └── page.tsx       # Curator admin portal (237 plants management)
    │   └── api/
    │       ├── analyze/
    │       │   └── route.ts       # Global yard photo detection endpoint
    │       ├── identify-macro/
    │       │   └── route.ts       # Close-up leaf macro diagnosis endpoint
    │       └── reidentify-box/
    │           └── route.ts       # Targeted crop re-identification endpoint
    ├── components/
    │   ├── auth/                  # Google Auth modal and user dropdown
    │   ├── camera/                # WebRTC live camera modal & mobile shutter
    │   ├── canvas/                # Interactive bounding box canvas & toolbar
    │   ├── property/              # PropertyBar & PropertyManagerModal
    │   └── views/                 # LandingView, AnalyzingView, AuditView, ReportView
    ├── data/
    │   ├── master-nj-plants.json  # Comprehensive 237-species dataset
    │   └── nj-flora.v1.json       # Botanical metadata & classification lookup
    ├── lib/
    │   ├── camera.ts              # Client-side WebP compression & EXIF parsing
    │   ├── plants.ts              # Ecological scoring & recommendation logic
    │   ├── scoring.ts             # Biodiversity rating & metric computation
    │   ├── vision.ts              # Gemini Vision API prompts & crop processing
    │   └── firebase/
    │       ├── client.ts          # Browser Firebase client (Auth, Firestore, Storage)
    │       ├── admin.ts           # Firebase Admin SDK initialization
    │       ├── properties.ts      # Property, yard area, and scan Firestore CRUD
    │       └── plants.ts          # Botanical database Firestore queries
    ├── public/
    │   ├── plants/                # 238 optimized botanical photos (100% coverage)
    │   └── samples/               # Sample yard photos (front, back, side)
    └── scripts/
        ├── seed-firebase-plants.mjs # Batch seeder for 237 plants into Firestore
        └── setup-firebase.mjs     # Firebase credentials verification
```

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v20 or later recommended)
* [npm](https://www.npmjs.com/)
* A **Google Gemini API Key** (obtain free from [Google AI Studio](https://aistudio.google.com/))
* A **Firebase Project** with Authentication (Google sign-in enabled), Cloud Firestore, and Cloud Storage.

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RoboRoversReborn/NativeYard-1.git
   cd NativeYard-1
   ```

2. **Navigate to the web application directory and install dependencies:**
   ```bash
   cd web3
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file inside the `web3/` directory (or copy from `web3/.env.example`):
   ```env
   # Google Gemini Vision
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash

   # (Optional) Pl@ntNet API Key
   PLANTNET_API_KEY=your_optional_plantnet_key_here

   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. **Seed Botanical Database:**
   Seed all 237 curated New Jersey botanical species into Cloud Firestore:
   ```bash
   npm run seed:db
   ```

5. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment

NativeYard is deployed on **Google Firebase App Hosting** and **Firebase Hosting**:

* **Live URL**: [https://njnativeyard.web.app](https://njnativeyard.web.app)
* **App Hosting Backend**: `https://nativeyard-web--njnativeyard.us-east4.hosted.app`

### Deploying Changes

1. **Deploy Security Rules:**
   ```bash
   cd web3
   npm run firebase:deploy-rules
   ```

2. **Deploy Hosting CDN Rewrites:**
   ```bash
   npx firebase-tools deploy --only hosting
   ```

3. **Deploy App Code via App Hosting:**
   Push commits to the `Firebase` branch on GitHub. Firebase App Hosting automatically builds the Next.js production bundle using Cloud Build and rolls out the revision to Cloud Run.

---

## 📚 Ecological References

* **Dr. Doug Tallamy & Homegrown National Park**: Research on keystone plant genera and caterpillar host associations.
* **Native Plant Society of New Jersey (NPSNJ)**: Native plant gardening guidelines and invasive plant alerts.
* **Rutgers NJAES (New Jersey Agricultural Experiment Station)**: Ecoregion landscape recommendations and invasive species profiles.
* **National Wildlife Federation (NWF)**: Native Plant Finder ecological host records for Mid-Atlantic ecoregions.

---

## 📄 License

This project is licensed under the MIT License — see the repository for details.
