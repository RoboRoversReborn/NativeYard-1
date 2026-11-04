# NativeYard V3 — Unified Application Specification

## 1. Executive Summary

**NativeYard V3** (`web3`) is a unified, next-generation ecological yard audit and landscaping platform calibrated specifically for New Jersey homeowners and restoration practitioners. It merges the modern editorial UI, rich ecological storytelling, and comprehensive botanical classifications from `web2` with production-tested Firebase property management, multi-tier vision analysis, hardware camera integration, and a newly introduced **Interactive Bounding Box Canvas Engine**.

### Core Value Proposition
- **Nature-Journal Editorial Layout**: Magazine-grade visual typography (Fraunces serif + DM Sans), interactive ecological dial, and educational narratives ("How it works in three acts", "Why native, why now", "Plant verdicts").
- **Botanical Precision**: 5-tier classification (`NATIVE_KEYSTONE`, `NATIVE`, `NON_NATIVE_BENIGN`, `INVASIVE_REGULATED`, `INVASIVE_WATCHLIST`) based on Rutgers NJAES, NPSNJ, and Dr. Doug Tallamy's research.
- **Interactive Bounding Box Canvas**: Full visual control over yard detections — click to inspect, delete false positives, redraw boundaries, draw new custom regions, and re-identify targeted foliage crops on the fly.
- **Full Property & Yard Management**: Authenticated homeowner property profiles (multiple addresses, front/back/side yard areas, historical scan timelines, Firebase Cloud Storage persistence, and instant reload of past audits).
- **Dual Camera & Compression**: Live webcam viewfinder with device switching + native mobile rear shutter, paired with client-side canvas compression (optimized WebP/JPEG, max 1280px) to maximize the Firebase Spark free tier for 40,000+ scans.

---

## 2. Architecture & File Structure

The application is isolated inside `/Users/niravgadhia/LandscapingApp/web3`.

```
/Users/niravgadhia/LandscapingApp/web3/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts             # Global yard photo analysis (Gemini 2.5 Flash + Pl@ntNet)
│   │   └── reidentify-box/
│   │       └── route.ts             # Targeted crop re-identification for user-drawn boxes
│   ├── admin/
│   │   └── plants/
│   │       └── page.tsx             # Curator admin portal for browsing/editing 237 NJ plants
│   ├── globals.css                  # Tailwind CSS v4 design system & custom animations
│   ├── layout.tsx                   # App shell, fonts (Fraunces & DM Sans), Firebase Auth provider
│   └── page.tsx                     # Main application entry point orchestrating the state machine
├── components/
│   ├── auth/
│   │   ├── AuthModal.tsx            # Google One-Click Auth modal
│   │   └── UserDropdown.tsx         # User avatar and account settings dropdown
│   ├── camera/
│   │   └── CameraModal.tsx          # Live webcam viewfinder with camera flip & countdown
│   ├── property/
│   │   ├── PropertyBar.tsx          # Sticky bar: active property, yard area tabs, save scan button
│   │   └── PropertyManagerModal.tsx # Manage addresses, add areas, browse audit timeline
│   ├── canvas/
│   │   ├── BoundingBoxOverlay.tsx   # Interactive SVG/HTML bounding box editor
│   │   ├── BoxControlsToolbar.tsx   # Select, Redraw, Draw New, and Delete action buttons
│   │   └── RegionCropper.ts         # Client/server normalized coordinate crop utility
│   ├── views/
│   │   ├── LandingView.tsx          # Editorial hero, NJ ZIP lookup, "Why native", "How it works"
│   │   ├── AnalyzingView.tsx        # Step-by-step scanning radar with botanical progress milestones
│   │   ├── AuditView.tsx            # Main visualizer: photo canvas, score ring, plant inspector
│   │   └── ReportView.tsx           # Printable ecological report, native swaps, invasive removal
│   └── ui/
│       ├── ScoreRing.tsx            # SVG circular biodiversity score dial
│       ├── StatusBadge.tsx          # Keystone, Native, Non-native, Invasive badge chips
│       └── Brand.tsx                # NativeYard logo mark and New Jersey pilot indicator
├── data/
│   └── nj-flora.v1.json             # Canonical NJ plant catalog (lepidoptera hosts, moisture, deer)
├── lib/
│   ├── camera.ts                    # Device detection, EXIF orientation, compressImageToOptimizedBlob
│   ├── plants.ts                    # NJ plant querying, ecoregion matching, swap recommendations
│   ├── scoring.ts                   # Biodiversity score algorithm & ecological grade calculator
│   ├── types.ts                     # Strict TypeScript interfaces (Property, YardArea, Audit, Detection)
│   ├── vision.ts                    # Gemini Vision prompt runner & crop extraction
│   └── firebase/
│       ├── client.ts                # Browser Firebase client (Auth, Firestore, Storage)
│       ├── admin.ts                 # Server Firebase Admin SDK initialized with project credentials
│       ├── properties.ts            # CRUD helpers for properties, yard_areas, and yard_scans
│       └── plants.ts                # Firestore plants collection operations
├── public/
│   ├── samples/                     # Curated sample yards (Front Yard, Back Bed, Woodland Edge)
│   └── images/                      # Reference badges, icons, and textures
├── scripts/
│   ├── seed-firebase-plants.mjs     # Batch seeder for 237 NJ plants into Firestore
│   └── setup-firebase.mjs           # Firebase setup verification
├── firebase.json                    # Firebase App Hosting & Hosting rewrites config
├── firestore.rules                  # Firestore security rules
├── storage.rules                    # Cloud Storage security rules
├── apphosting.yaml                  # Firebase App Hosting compute config
├── package.json                     # Next.js 16, React 19, Tailwind v4, Firebase 13, Sharp
├── tsconfig.json                    # Strict TypeScript configuration
└── SPECIFICATION.md                 # This document
```

---

## 3. Data Models & Schemas

### 3.1 Botanical Plant Entity
```typescript
export interface NJPlant {
  id: string;
  commonName: string;
  scientificName: string;
  family?: string;
  status: "NATIVE_KEYSTONE" | "NATIVE" | "NON_NATIVE_BENIGN" | "INVASIVE_REGULATED" | "INVASIVE_WATCHLIST";
  plantType: "Tree" | "Shrub" | "Perennial" | "Fern" | "Grass" | "Vine";
  lepidopteraHostsSupported?: number;
  sunNeeds?: "Full Sun" | "Partial Sun" | "Full Shade" | "Adaptable";
  soilMoisture?: "Dry" | "Moist" | "Wet" | "Adaptable";
  deerResistance?: "High" | "Moderate" | "Low";
  invasiveProfile?: {
    harmSummary: string;
    removalMethods: string[];
    nativeSubstitutes: string[];
  };
  nativeBenefits?: {
    ecologicalSummary: string;
    keystoneNotes?: string;
  };
  samplePhotoUrl?: string;
}
```

### 3.2 Yard Detection Entity
```typescript
export interface Detection {
  id: string;
  plantId: string;
  commonName: string;
  scientificName: string;
  status: PlantStatus;
  confidence: number;
  box: {
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
    w: number; // 0-100 percentage
    h: number; // 0-100 percentage
  };
  reasoning?: string;
  plantPart?: "leaf" | "flower" | "fruit" | "bark" | "habit";
  source: "gemini" | "plantnet" | "manual_crop";
  isUserDrawn?: boolean;
}
```

### 3.3 Firebase Property & Scan Schema
```typescript
export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  hardiness_zone: string;
  created_at: string;
  yard_areas?: YardArea[];
}

export interface YardArea {
  id: string;
  property_id: string;
  name: string;       // e.g. "Front Yard", "South Garden Bed"
  area_type: "front" | "back" | "side" | "patio" | "other";
  sun_exposure?: string;
  soil_type?: string;
  yard_scans?: YardScan[];
}

export interface YardScan {
  id: string;
  yard_area_id: string;
  photo_url: string;
  native_score: number;
  grade: string;
  plants_count: number;
  native_count: number;
  non_native_count: number;
  invasive_count: number;
  keystone_count: number;
  detected_plants: Detection[];
  notes?: string;
  created_at: string;
}
```

---

## 4. Feature Specifications

### 4.1 Interactive Bounding Box Canvas Engine
The yard photo is rendered inside a responsive canvas container with coordinates normalized to 0–100%.

1. **Inspector Mode (Default)**:
   - Hovering or clicking a bounding box highlights it with a solid status-colored stroke and active badge.
   - The right inspector panel scrolls to the plant details, displaying species name, confidence, ecological role, and native swaps.
2. **Delete Box (`removeDetection`)**:
   - The user selects a box and clicks the **"🗑️ Delete Box"** button or presses the `Delete` key.
   - The detection is removed from state.
   - `rebuildAudit()` executes immediately, updating:
     - Invasive load count.
     - Biodiversity score dial (e.g., removing an invasive Norway Maple increases the score).
     - Native percentage bar and swap recommendations.
3. **Redraw Mode (`redrawDetection`)**:
   - The user selects an existing box and clicks **"✏️ Redraw Boundary"**.
   - Handles appear on the box corners/edges. The user drags the rectangle to tightly frame the foliage.
   - Clicking **"Re-identify Crop"** triggers targeted re-scan on that exact revised rectangle.
4. **Draw New Region Mode (`drawNewRegion`)**:
   - The user clicks **"➕ Add Plant / Draw Region"**.
   - The canvas cursor switches to `crosshair`.
   - The user clicks and drags (or touches and drags on mobile) across an unrecognized plant or shrub.
   - A dashed boundary appears in real time.
   - Upon release, an action popup prompts: **"Identify Plant in Region ⚡"** or **"Cancel"**.
5. **Targeted Re-identification API (`POST /api/reidentify-box`)**:
   - Input: `{ imageBase64, box: { x, y, w, h }, zip, targetDetectionId? }`
   - Execution:
     1. Uses `sharp` to extract the bounding box slice.
     2. Calls Gemini Vision model with targeted prompt focused strictly on the isolated crop.
     3. Cross-references the response with `nj-flora.v1.json`.
     4. Returns the matched plant ID, confidence, and verified metadata.
     5. The detection is seamlessly inserted/updated in the yard audit and the score recalculated.

---

## 4.2 Property Management & Yard Area Persistence
1. **Property Bar**:
   - A sticky toolbar beneath the main header displaying:
     - Active Property selector dropdown (e.g., `🏡 42 Elm Street, Ridgewood NJ`).
     - Yard Area tabs (`🌱 Front Yard`, `🌿 Back Yard`, `➕ Add Area`).
     - **"Save Audit to Yard Area"** action button.
2. **Saving Scans**:
   - When the user clicks "Save Audit", the system:
     1. Optimizes the photo using client-side canvas compression (`compressImageToOptimizedBlob`, max 1280px, WebP/JPEG, ~100KB).
     2. Uploads the image blob to Firebase Cloud Storage at `yard-photos/${userId}/${scanId}.webp`.
     3. Obtains the download URL.
     4. Inserts a record into Firestore `properties/${propertyId}/yard_areas/${areaId}/scans` with all detections, bounding boxes, score, and timestamp.
     5. Displays a success toast notification.
3. **Restoring Past Scans**:
   - In the Property Manager modal, users can view past scans by date.
   - Clicking **"Load Scan"** reconstructs the full visualizer:
     - Downloads and sets the original yard photo.
     - Re-renders all bounding boxes and plant tags.
     - Populates the score dial and ecological action report.

---

## 4.3 Hardware Camera & Client Preprocessing
1. **Device Detection**:
   - Uses `isMobileOrTablet()` to determine hardware environment.
   - On mobile devices, triggers `<input type="file" accept="image/*" capture="environment" />` for maximum resolution and autofocus.
2. **Desktop Live Camera Modal**:
   - WebRTC `navigator.mediaDevices.getUserMedia` with video resolution up to 1080p.
   - Camera device selection dropdown (switch between FaceTime HD, external webcams).
   - Flip camera button.
   - Shutter button with 3-second countdown and flash animation.
   - Preview confirmation modal with "Retake" and "Analyze Photo" options.
3. **Client-Side Image Optimization (`compressImageToOptimizedBlob`)**:
   - Auto-orients image based on EXIF orientation tags.
   - Scales long edge to max 1280px.
   - Compresses to WebP (fallback to 80% JPEG).
   - Reduces 8MB smartphone photos down to ~90KB-130KB, maximizing the 5 GB Spark free tier for ~40,000+ scans.

---

## 5. Security & Environment Configuration

The application requires the following environment variables (stored in `.env.local`):

```bash
# Google Gemini Vision
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# Botanical Identification Fallback (Optional)
PLANTNET_API_KEY=your_key_here

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```
