# NativeYard V3 — Unified Application Specification

## 1. Executive Summary

**NativeYard V3** (`web3`) is a unified, next-generation ecological yard audit and landscaping platform calibrated specifically for New Jersey homeowners and restoration practitioners. It merges the modern editorial UI, rich ecological storytelling, and comprehensive botanical classifications from `web2` with the production-tested Supabase property management, multi-tier vision analysis, hardware camera integration, and a newly introduced **Interactive Bounding Box Canvas Engine**.

### Core Value Proposition
- **Nature-Journal Editorial Layout**: Magazine-grade visual typography (Fraunces serif + DM Sans), interactive ecological dial, and educational narratives ("How it works in three acts", "Why native, why now", "Plant verdicts").
- **Botanical Precision**: 5-tier classification (`NATIVE_KEYSTONE`, `NATIVE`, `NON_NATIVE_BENIGN`, `INVASIVE_REGULATED`, `INVASIVE_WATCHLIST`) based on Rutgers NJAES, NPSNJ, and Dr. Doug Tallamy's research.
- **Interactive Bounding Box Canvas**: Full visual control over yard detections — click to inspect, delete false positives, redraw boundaries, draw new custom regions, and re-identify targeted foliage crops on the fly.
- **Full Property & Yard Management**: Authenticated homeowner property profiles (multiple addresses, front/back/side yard areas, historical scan timelines, Supabase Storage persistence, and instant reload of past audits).
- **Dual Camera & Compression**: Live webcam viewfinder with device switching + native mobile rear shutter, paired with client-side canvas compression to avoid mobile timeout and 413 payload limits.

---

## 2. Architecture & File Structure

The new application is isolated inside `/Users/niravgadhia/LandscapingApp/web3` to guarantee zero regressions to `/web` or `/web2`.

```
/Users/niravgadhia/LandscapingApp/web3/
├── app/
│   ├── api/
│   │   ├── analyze/
│   │   │   └── route.ts             # Global yard photo analysis (Gemini 3.5 Flash + Pl@ntNet)
│   │   ├── reidentify-box/
│   │   │   └── route.ts             # Targeted crop re-identification for user-drawn boxes
│   │   └── auth/
│   │       └── callback/route.ts    # Supabase OAuth redirect handler
│   ├── globals.css                  # Tailwind CSS v4 design system & custom animations
│   ├── layout.tsx                   # App shell, fonts (Fraunces & DM Sans), Supabase session provider
│   └── page.tsx                     # Main application entry point orchestrating the state machine
├── components/
│   ├── auth/
│   │   ├── AuthModal.tsx            # Google / Magic Link login modal
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
│   ├── camera.ts                    # Device detection, orientation check, client compressImageFile
│   ├── plants.ts                    # NJ plant querying, ecoregion matching, swap recommendations
│   ├── scoring.ts                   # Biodiversity score algorithm & ecological grade calculator
│   ├── types.ts                     # Strict TypeScript interfaces (Property, YardArea, Audit, Detection)
│   ├── vision.ts                    # Gemini Vision prompt runner & crop extraction
│   └── supabase/
│       ├── client.ts                # Browser Supabase client
│       ├── server.ts                # Server component Supabase client
│       └── properties.ts            # CRUD helpers for properties, yard_areas, and yard_scans
├── public/
│   ├── samples/                     # Curated sample yards (Front Yard, Back Bed, Woodland Edge)
│   └── images/                      # Reference badges, icons, and textures
├── package.json                     # Next.js 16, React 19, Tailwind v4, Lucide React, Sharp
├── tsconfig.json                    # Strict TypeScript configuration
├── SPECIFICATION.md                 # This document
└── PHASED_PLAN.md                   # Execution milestones and testing roadmap
```

---

## 3. Data Models & TypeScript Contracts

### 3.1 Plant & Botanical Classification
```typescript
export type NjPlantStatus =
  | "NATIVE_KEYSTONE"    // High ecological value (e.g., Quercus alba supporting 500+ caterpillars)
  | "NATIVE"             // Indigenous to NJ physiographic provinces
  | "NON_NATIVE_BENIGN"  // Non-indigenous but non-invasive ornamental (e.g., Hydrangea)
  | "INVASIVE_REGULATED" // Banned/restricted by NJ state environmental laws (e.g., Callery Pear)
  | "INVASIVE_WATCHLIST";// High ecological threat to NJ woodlands (e.g., Japanese Barberry)

export interface Plant {
  id: string;
  commonName: string;
  scientificName: string;
  status: "keystone" | "native" | "non-native" | "invasive";
  njStatus: NjPlantStatus;
  type: "Tree" | "Shrub" | "Perennial" | "Groundcover" | "Vine" | "Grass" | "Fern";
  sun: string;
  moisture: string;
  bloom: string;
  height: string;
  description: string;
  lepidoptera?: number;               // Number of caterpillar species hosted
  specialistBeeSupport?: boolean;     // Supports pollen-specialist native bees
  deerResistance?: "HIGH" | "MODERATE" | "LOW";
  swapIds?: string[];                 // Recommended native replacement plant IDs
  removal?: {
    method: string;
    timing: string;
    safety: string;
    disposal: string;
  };
}
```

### 3.2 Bounding Box & Detection Model
```typescript
export interface BoundingBox {
  x: number; // Percentage from left (0 - 100)
  y: number; // Percentage from top (0 - 100)
  w: number; // Percentage width (0 - 100)
  h: number; // Percentage height (0 - 100)
}

export interface Detection {
  id: string;
  plantId: string;
  confidence: number;
  box: BoundingBox;
  areaSqFt?: number;
  needsReview?: boolean;
  plantPart?: "leaf" | "flower" | "fruit" | "bark" | "habit";
  source: "gemini" | "plantnet" | "manual_crop";
  isUserDrawn?: boolean;
}
```

### 3.3 Supabase Property & Scan Schema
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
     1. Uses `sharp` to extract the bounding box slice:
        ```typescript
        const left = Math.round((box.x / 100) * fullWidth);
        const top = Math.round((box.y / 100) * fullHeight);
        const width = Math.round((box.w / 100) * fullWidth);
        const height = Math.round((box.h / 100) * fullHeight);
        ```
     2. Calls Gemini Vision model with targeted prompt focused strictly on the isolated crop.
     3. Cross-references the response with `nj-flora.v1.json`.
     4. Returns the matched plant ID, confidence, and verified metadata.
     5. The detection is seamlessly inserted/updated in the yard audit and the score recalculated.

---

### 4.2 Property Management & Yard Area Persistence
1. **Property Bar**:
   - A sticky toolbar beneath the main header displaying:
     - Active Property selector dropdown (e.g., `🏡 42 Elm Street, Ridgewood NJ`).
     - Yard Area tabs (`🌱 Front Yard`, `🌿 Back Yard`, `➕ Add Area`).
     - **"Save Audit to Yard Area"** action button.
2. **Saving Scans**:
   - When the user clicks "Save Audit", the system:
     1. Uploads the current image blob to Supabase Storage bucket `yard-photos/${userId}/${scanId}.jpg`.
     2. Obtains the public URL.
     3. Inserts a record into `yard_scans` with all plant detections, bounding boxes, score, and timestamp.
     4. Displays a success toast notification.
3. **Restoring Past Scans**:
   - In the Property Manager modal, users can view past scans by date.
   - Clicking **"Load Scan"** reconstructs the full visualizer:
     - Downloads and sets the original yard photo.
     - Re-renders all bounding boxes and plant tags.
     - Populates the score dial and ecological action report.

---

### 4.3 Hardware Camera & Client Preprocessing
1. **Device Detection**:
   - Uses `isMobileOrTablet()` to determine hardware environment.
   - On mobile devices, triggers `<input type="file" accept="image/*" capture="environment" />` for maximum resolution and autofocus.
2. **Desktop Live Camera Modal**:
   - WebRTC `navigator.mediaDevices.getUserMedia` with video resolution up to 1080p.
   - Camera device selection dropdown (switch between FaceTime HD, external webcams).
   - Flip camera button.
   - Shutter button with 3-second countdown and flash animation.
   - Preview confirmation modal with "Retake" and "Analyze Photo" options.
3. **Client-Side Image Optimization (`compressImageFile`)**:
   - Auto-orients image based on EXIF tags.
   - Scales long edge to max 1600px.
   - Converts HEIC/PNG to 85% quality JPEG.
   - Keeps payload size around 300KB–600KB, ensuring sub-second upload times.

---

### 4.4 Editorial Storytelling & Ecological Action Plan
1. **Landing Page Educational Modules**:
   - **"How it works in three acts"**:
     - *Act I: Photograph the Living Space* (Wide-angle shot of the bed).
     - *Act II: Read the Ecology* (Gemini Vision extracts species & caterpillar counts).
     - *Act III: Execute the Plan* (Targeted removal guide & native replacements).
   - **"Plant verdicts — Not all green is good"**:
     - Visual badge guide explaining the differences between Keystone Natives, Benign Non-natives, and Regulated Invasives.
   - **"Why native, why now"**:
     - Ecological statistics: 40 million acres of lawn in the US; 96% of terrestrial birds feed chicks exclusively on native caterpillars; Oak trees hosting 500+ species vs. Bradford Pear hosting 1.
2. **Actionable Report View**:
   - Printable 1-page yard conservation audit.
   - Invasive eradication protocols (cut-stump, herbicide safety, disposal timing).
   - Recommended native swaps matched to existing sun/soil conditions.
   - Seasonal planting calendar for New Jersey Zones 6a–7b.

---

## 5. Security & Environment Configuration

The application requires the following environment variables (stored in `.env.local`):

```bash
# Google Gemini Vision
GEMINI_API_KEY=AIzaSy...
GEMINI_VISION_MODEL=gemini-3.5-flash

# Botanical Identification Fallback (Optional)
PLANTNET_API_KEY=2b10...

# Supabase Auth, Database & Storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```
