# NativeYard V3 — Phased Implementation Plan

This document establishes the step-by-step phased execution plan to construct **NativeYard V3** inside the `/Users/niravgadhia/LandscapingApp/web3` folder, combining the UI & ecological classifications of `web2` with the camera, vision engine, and Supabase property management of `web`, plus the new **Interactive Bounding Box Canvas Engine**.

---

## Roadmap Overview

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation & Scaffold           (Next.js 16 + React 19 + Tailwind v4 + Lucide)           │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Data Models & NJ Flora Catalog  (Types, nj-flora snapshot, ecoregion matcher)             │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Supabase Properties & Scans     (Auth, PropertyBar, Yard Areas, Save/Restore Scan)        │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Camera System & Preprocessing   (Webcam viewfinder, Mobile shutter, compressImageFile)    │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Vision Analysis Engine          (/api/analyze + Gemini 2.5 Flash + Sharp auto-orient)     │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 6: Interactive Bounding Box Canvas (Select, Delete, Redraw, Draw New Region)                 │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 7: Targeted Re-identification API  (/api/reidentify-box crop re-scan endpoint)              │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 8: Editorial Landing & Reports     ("How it works", "Why native", Report View with Swaps)    │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 9: End-to-End Verification         (Dual camera tests, crop re-id test, property scan test)  │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Phases

### Phase 1: Foundation & Scaffold Setup
- **Goal**: Initialize the Next.js 16 / React 19 project structure in `web3/` with Tailwind CSS v4, TypeScript, Lucide React icons, and Sharp image processing.
- **Tasks**:
  1. Create `package.json` with Next.js 16, React 19, Lucide React, Sharp, and `@supabase/supabase-js`.
  2. Configure `tsconfig.json` with path aliases (`@/*` pointing to `./*`).
  3. Set up `app/layout.tsx` with Google Fonts (`Fraunces` and `DM Sans`).
  4. Set up `app/globals.css` with the curated cream linen and deep forest green color tokens.
  5. Symlink or copy `.env.local` to enable Gemini and Supabase API access.
- **Deliverables**: Working Next.js development server running on an independent port.

---

### Phase 2: Data Models & New Jersey Botanical Catalog
- **Goal**: Establish the botanical catalog, classification badges, and ecoregion mapping.
- **Tasks**:
  1. Port `nj-flora.v1.json` into `web3/data/`.
  2. Implement `lib/plants.ts` and `lib/types.ts`:
     - 5-tier classification (`NATIVE_KEYSTONE`, `NATIVE`, `NON_NATIVE_BENIGN`, `INVASIVE_REGULATED`, `INVASIVE_WATCHLIST`).
     - Ecoregion lookup for 5-digit NJ ZIP codes (07000–08999).
     - Native swap lookup for invasive and non-native plants.
  3. Create reusable UI components:
     - `components/ui/StatusBadge.tsx` (color-coded chips with icons).
     - `components/ui/ScoreRing.tsx` (animated circular biodiversity gauge).
- **Deliverables**: Unit-tested plant query and scoring helper library.

---

### Phase 3: Supabase Property Management & Yard Persistence
- **Goal**: Port and modernize the property management system from `web/`.
- **Tasks**:
  1. Create `lib/supabase/client.ts` and `lib/supabase/server.ts`.
  2. Implement `lib/supabase/properties.ts`:
     - `getPropertiesWithAreas()`: Retrieve user properties, yard areas, and scan history.
     - `createProperty()`: Add address and auto-generate default Front/Back yard areas.
     - `createYardArea()`: Add custom area (e.g. Side Yard, Shade Bed, Patio).
     - `saveYardScan()`: Upload photo to Supabase Storage and insert audit record.
  3. Build UI components:
     - `components/property/PropertyBar.tsx`: Sticky bar with property selector, yard area tabs, and "Save Scan" button.
     - `components/property/PropertyManagerModal.tsx`: Manage addresses and inspect past scan dates.
     - Restore scan functionality: Clicking a past scan reloads the original photo, bounding boxes, and score report onto the canvas.
- **Deliverables**: Full multi-property authentication and yard persistence workflow.

---

### Phase 4: Camera System & Client Preprocessing
- **Goal**: Deliver zero-friction photo capture for both desktop webcams and mobile phones.
- **Tasks**:
  1. Implement `lib/camera.ts`:
     - `isMobileOrTablet()`: Device user-agent detection.
     - `compressImageFile(file, maxDimension = 1600, quality = 0.85)`: Canvas downscaling to prevent mobile browser crashes and 413 HTTP errors.
  2. Build `components/camera/CameraModal.tsx`:
     - Live WebRTC camera viewfinder for desktop users.
     - Camera selector dropdown (switch devices).
     - 3-second countdown timer and flash shutter effect.
     - Freeze preview with "Retake" or "Use Photo" buttons.
  3. Wire mobile native shutter button (`<input type="file" accept="image/*" capture="environment" />`).
- **Deliverables**: Dual-camera capture system outputting clean, compressed JPEG blobs.

---

### Phase 5: Vision Analysis Engine (`/api/analyze`)
- **Goal**: Merge the backend vision analysis capabilities into a high-throughput endpoint.
- **Tasks**:
  1. Build `app/api/analyze/route.ts`:
     - Support JSON base64 and `multipart/form-data`.
     - Automatic EXIF orientation using `sharp(buffer).rotate()`.
     - Gemini 2.5 Flash Vision prompt returning normalized bounding boxes `[ymin, xmin, ymax, xmax]`.
     - Optional Pl@ntNet fallback for ambiguous plant organs.
     - Scoring engine calculating native ratio, keystone bonus, and invasive penalties.
  2. Integrate sample yards:
     - Curated sample yard datasets with pre-labeled bounding boxes for instant testing.
- **Deliverables**: Production-ready `/api/analyze` route returning enriched plant detections.

---

### Phase 6: Interactive Bounding Box Canvas Engine
- **Goal**: Implement the core interactive visual editor requested by the user.
- **Tasks**:
  1. Build `components/canvas/BoundingBoxOverlay.tsx`:
     - **Select Box**: Click any box to highlight with status color ring and focus inspector card.
     - **Delete Box**: Click "🗑️ Delete" or press `Delete` key; calls `removeDetection()`, immediately recalculating the audit score and removing false positives.
     - **Redraw Mode**: Select existing box, click "✏️ Redraw", and drag resize handles to reframe foliage.
     - **Draw New Region**: Click "➕ Draw Region", drag crosshair on canvas to frame an un-detected plant or leaf cluster.
  2. Build `components/canvas/BoxControlsToolbar.tsx`:
     - Floating toolbar above the yard photo containing mode buttons: `[ 🖱️ Select ]`, `[ ✏️ Redraw ]`, `[ ➕ Draw Region ]`, `[ 🗑️ Delete ]`.
- **Deliverables**: Interactive bounding box canvas with full drag, redraw, and delete capabilities.

---

### Phase 7: Targeted Region Re-identification API (`/api/reidentify-box`)
- **Goal**: Enable instantaneous re-analysis of a user-drawn or user-redrawn bounding box without re-scanning the entire yard.
- **Tasks**:
  1. Build `app/api/reidentify-box/route.ts`:
     - Receives `{ imageBase64, box: { x, y, w, h }, zip, existingDetectionId? }`.
     - Uses `sharp` to extract the high-res pixel rectangle from the source photo.
     - Calls Gemini Vision with targeted macro/crop identification prompt.
     - Cross-references with `nj-flora.v1.json` to find species match and ecological status.
     - Returns updated `Detection` object.
  2. Wire client to replace or append the detection in `audit.detections` and call `rebuildAudit()`.
- **Deliverables**: Live crop re-identification with sub-2-second response time.

---

### Phase 8: Editorial Landing Page & Actionable Report View
- **Goal**: Deliver the rich layout and storytelling from `web2`.
- **Tasks**:
  1. Build `components/views/LandingView.tsx`:
     - Hero section with pulsing radar indicator and live NJ ZIP code county matcher.
     - Sample yard quick loaders.
     - "How it works in three acts" educational section.
     - "Plant verdicts — Not all green is good" badge guide.
     - "Why native, why now" keystone plant statistics strip.
  2. Build `components/views/AnalyzingView.tsx`:
     - Step-by-step radar scanning visualizer with simulated botanical milestones.
  3. Build `components/views/ReportView.tsx`:
     - Printable ecological audit summary.
     - High-priority invasive removal protocols.
     - Sun/moisture-matched native plant replacements.
     - Seasonal planting schedule.
- **Deliverables**: Complete editorial flow from landing page to printable conservation report.

---

### Phase 9: End-to-End Testing & Verification
- **Goal**: Test all user workflows across devices.
- **Tasks**:
  1. Test desktop webcam capture $\rightarrow$ analysis $\rightarrow$ audit view.
  2. Test mobile camera capture and client compression.
  3. Test drawing a new box over an un-detected plant and verifying re-identification.
  4. Test deleting an invasive plant box and confirming score increase.
  5. Test saving scan to a Supabase property yard area and reloading it back.
  6. Verify zero modifications to existing `/web` and `/web2` codebases.
- **Deliverables**: Fully verified, independently running NativeYard V3 application.
