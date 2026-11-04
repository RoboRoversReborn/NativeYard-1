# NativeYard Web3: Full Enhancements & Architecture Changelog

This document provides a comprehensive summary of all architectural improvements, feature implementations, and bug fixes made to the **`web3`** application across recent user prompts.

---

## Table of Contents
1. [Overview & Scope](#1-overview--scope)
2. [Chronological Changelog of User Requests & Solutions](#2-chronological-changelog-of-user-requests--solutions)
   - [Item 1: 1:1 Box & Sidebar Alignment](#item-1-11-box--sidebar-alignment)
   - [Item 2: Full Report Image Overlay with Numbered Tags](#item-2-full-report-image-overlay-with-numbered-tags)
   - [Item 3: Sample Yard Data, Scores, & 5-Column Inventory Tally](#item-3-sample-yard-data-scores--5-column-inventory-tally)
   - [Item 4: True PDF File Export (Direct jsPDF Download)](#item-4-true-pdf-file-export-direct-jspdf-download)
   - [Item 5 & 6: 2-Stage Vision Pipeline (Gemini + Sharp Crop + Pl@ntNet)](#item-5--6-2-stage-vision-pipeline-gemini--sharp-crop--plantnet)
   - [Item 7 & 8: Macro Leaf Close-Up Verification & Rematch System](#item-7--8-macro-leaf-close-up-verification--rematch-system)
   - [Item 9 & 10: Complete New Jersey Flora Catalog & 100% Image Asset Coverage](#item-9--10-complete-new-jersey-flora-catalog--100-image-asset-coverage)
   - [Item 11: Confidence Scores & Verified Status Badges (Replacing '?')](#item-11-confidence-scores--verified-status-badges-replacing-)
   - [Item 12 & 13: Responsive Adaptive Layout (Phone vs. Tablet vs. Desktop)](#item-12--13-responsive-adaptive-layout-phone-vs-tablet-vs-desktop)
3. [Key File Directory & Reference Map](#3-key-file-directory--reference-map)
4. [Database & Future Migration Roadmap](#4-database--future-migration-roadmap)

---

## 1. Overview & Scope

The goal of this initiative was to upgrade **`web3`** into a state-of-the-art, production-grade native landscaping application tailored to New Jersey homeowners, while keeping the legacy `web/` and `web2/` apps intact.

Key milestones achieved:
- **Vision Accuracy**: Transitioned from a fragile single-stage vision prompt to an ensemble 2-stage botanical AI pipeline (Gemini 2.5/Flash normalized detection + Sharp high-res bounding-box crop + Pl@ntNet botanical classification API).
- **Macro Diagnosis**: Added webcam/mobile camera leaf close-up diagnosis combining morphological feature extraction with Pl@ntNet verification.
- **Data Completeness**: Unified disparate plant dictionaries into a single master database of **237 New Jersey plant species**, achieving **100% static image coverage** with high-resolution botanical photography.
- **Reporting & UX**: Implemented client-side direct PDF generation, confidence score badges replacing question marks, instant verification workflows, and an adaptive layout optimized for Mobile, Tablet, and Desktop.

---

## 2. Chronological Changelog of User Requests & Solutions

### Item 1: 1:1 Box & Sidebar Alignment
- **Problem**: Bounding box labels on the yard image were mismatched with the corresponding plants in the "Plants in this frame" sidebar.
- **Solution**:
  - Implemented unified sorting via `sortedDetections` based on status priority (`invasive` $\rightarrow$ `non-native` $\rightarrow$ `keystone` $\rightarrow$ `native`).
  - Passed `orderedDetections={sortedDetections}` into `BoundingBoxOverlay.tsx`.
  - Numbered every bounding box (`#1`, `#2`, `#3`, ...) to match the exact sidebar index.

### Item 2: Full Report Image Overlay with Numbered Tags
- **Problem**: When viewing the full audit report, the yard image was missing the bounding boxes and plant tags.
- **Solution**:
  - Added interactive bounding box overlays and tag modes in [`report-view.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/report-view.tsx):
    - **Full Mode**: Displays number, common name, and short status pill.
    - **Numbers Mode**: Compact number badge for cleaner print export.
  - Added a synchronized **Plant Identification Legend Grid** beneath the photo with hover-highlighting across the image boxes.

### Item 3: Sample Yard Data, Scores, & 5-Column Inventory Tally
- **Problem**: Discrepancies existed between home page sample scores and audit report scores, and plant counts beneath the image did not match detected counts.
- **Solution**:
  - Audited and updated sample datasets in [`sampleDetections.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/sampleDetections.ts) so detections, coordinates, and scores match mathematically.
  - Built the **5-Column Plant Inventory Tally** in [`audit-view.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/audit-view.tsx):
    $$\text{Total Plants} = \text{Keystone} + \text{Native} + \text{Non-Native} + \text{Invasive}$$
  - Displayed native percentage badge (`🌿 X of Y Native (Z%)`) and action insights strip (swaps available, caterpillar host genera, invasive pressure).

### Item 4: True PDF File Export (Direct jsPDF Download)
- **Problem**: Clicking "Download PDF" opened the browser's system print dialog and included the sticky navigation and sign-in top bars in the export.
- **Solution**:
  - Added client-side direct PDF export using `jsPDF` + HTML canvas rendering in [`report-view.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/report-view.tsx).
  - Automatically suppresses navigation headers, auth bars, and toolbar controls via `.no-print` classes.
  - Automatically formats the exported file as `NativeYard-NJ-Report-[ZIP]-[DATE].pdf` and triggers direct browser download.

### Item 5 & 6: 2-Stage Vision Pipeline (Gemini + Sharp Crop + Pl@ntNet)
- **Problem**: Image analysis in `web3` was producing poor results compared to legacy `web`, silently dropping unrecognized plants and incorrectly scaling bounding boxes.
- **Root Cause**:
  1. `web3/lib/plants.ts` was discarding any AI detection whose scientific name did not exist in the local 60-plant dictionary.
  2. `normalizeBox` was clamping 0–100 percentage coordinates as 0–1 fractions, creating zero-width boxes that failed area thresholds.
- **Solution**:
  - Created [`web3/lib/plantnet.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/plantnet.ts) integrating Pl@ntNet Botanical API with project `PLANTNET_API_KEY`.
  - Upgraded [`web3/lib/gemini.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/gemini.ts) with strict structured schema, organ detection, normalized coordinates `[ymin, xmin, ymax, xmax]`, and fallback models (`gemini-2.5-flash` $\rightarrow$ `gemini-1.5-flash`).
  - Rewrote [`web3/app/api/analyze/route.ts`](file:///Users/niravgadhia/LandscapingApp/web3/app/api/analyze/route.ts) to execute the 2-stage ensemble:
    - **Stage 1 (Gemini)**: Detects candidate plant regions, organs, and normalized bounding boxes.
    - **Stage 2 (Sharp + Pl@ntNet)**: High-resolution crops are extracted for each detected box and verified via Pl@ntNet API.
  - Added `getOrCreateFallbackPlant` to [`web3/lib/plants.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/plants.ts) so novel or non-dictionary species are never dropped silently.

### Item 7 & 8: Macro Leaf Close-Up Verification & Rematch System
- **Problem**: Needed capability to snap close-up photos of leaves/flowers to verify plants not clearly identified from wide yard shots, or rematch using pre-populated NJ plants.
- **Solution**:
  - Built endpoint [`web3/app/api/identify-macro/route.ts`](file:///Users/niravgadhia/LandscapingApp/web3/app/api/identify-macro/route.ts):
    - Sends cropped close-up to Pl@ntNet API (`organs=leaf`).
    - Prompts Gemini for botanical morphological diagnosis: `leafType`, `margin`, `arrangement`, `venation`, and distinguishing features.
  - Built [`LiveCameraModal.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/LiveCameraModal.tsx): Live desktop webcam viewfinder with device switching, torch/facing mode handling, and shutter capture.
  - Built [`PlantPickerModal.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/PlantPickerModal.tsx): Search modal across all NJ species with category filter tabs (Suggested, All, Keystone/Native, Invasive, Non-Native).
  - Built [`MacroLeafMatcherModal.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/MacroLeafMatcherModal.tsx): Side-by-side comparison modal displaying user leaf photo vs diagnosed traits and enriched candidate species.
  - Integrated into [`audit-view.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/audit-view.tsx) with native file triggers for mobile cameras and live reactivity.

### Item 9 & 10: Complete New Jersey Flora Catalog & 100% Image Asset Coverage
- **Problem**: Plant data was fragmented across multiple files (`nj-flora.v1.json`, `web/lib/njPlants.js`, `plantImages.ts`), with 52 missing photos and lack of unified curation.
- **Solution**:
  - Consolidated all datasets into [`web3/data/master-nj-plants.json`](file:///Users/niravgadhia/LandscapingApp/web3/data/master-nj-plants.json) containing **237 unique New Jersey plant species**.
  - Built automated image harvester using Wikipedia / Wikimedia Commons API with compliant bot headers and Sharp image optimization.
  - Acquired, optimized, and saved all missing botanical photographs into `web3/public/plants/`. **All 238 plants (100%) now have high-resolution images**.
  - Generated complete image lookup in [`web3/lib/plantImages.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/plantImages.ts).
  - Added `plants` database schema and RLS policies to [`supabase/schema.sql`](file:///Users/niravgadhia/LandscapingApp/supabase/schema.sql) and created batch seeder [`web3/scripts/seed-supabase-plants.js`](file:///Users/niravgadhia/LandscapingApp/web3/scripts/seed-supabase-plants.js).
  - Built Curator Admin Portal at [`web3/app/admin/plants/page.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/app/admin/plants/page.tsx) with search, status/type filters, table view, add/edit modal, and JSON export.

### Item 11: Confidence Scores & Verified Status Badges (Replacing '?')
- **Problem**: Low-confidence plant boxes showed an ambiguous question mark `?`, and user-verified plants did not reflect verified status on the canvas.
- **Solution**:
  - In [`BoundingBoxOverlay.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/canvas/BoundingBoxOverlay.tsx), replaced `?` with the matching confidence score percentage (e.g. `96%`, `74%`, `58%`), color-coded by confidence tier.
  - When verified (via "Confirm Match", Rematch Picker, or Leaf Macro Match):
    - Bounding box updates to a solid green border with a **`✓ Verified`** badge.
    - Hover label updates to `#{number} {Common Name} · Verified`.
  - Added `[Confirm Match]` button in the sidebar inspector for immediate 1-click verification of correct AI predictions.
  - Synchronized verified status across sidebar "Plants in this frame" list and the PDF report view.
  - Updated [`plants.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/plants.ts) so that verified detections automatically clear from `reviewCount`.

### Item 12 & 13: Responsive Adaptive Layout (Phone vs. Tablet vs. Desktop)
- **Problem**: On mobile phones, users were forced to scroll past the large yard image and tally table before seeing their biodiversity score or the plant inspector card.
- **Solution**:
  - Architected `.audit-adaptive-grid` using CSS Grid template areas in [`globals.css`](file:///Users/niravgadhia/LandscapingApp/web3/app/globals.css) and updated [`audit-view.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/audit-view.tsx).
  - **Phone Layout (< 768px)**:
    1. Overall Score Hero Card (ScoreRing + rating + 4 metrics grid).
    2. Plant Inventory Tally (5-column count strip with Total Plants spanning row 1).
    3. Interactive Yard Photo with bounding boxes and confidence scores.
    4. Quick-Jump Horizontal Plant Chips Bar (scrollable `#1`, `#2`, `#3` chips).
    5. Selected Plant Inspector & Action Hub (`Confirm Match`, `Rematch`, `Leaf Snap`).
    6. Complete Plants in Frame List.
    7. Transformation Plan CTA.
    - Added automatic smooth scrolling to `#selected-plant-inspector` whenever a box or chip is tapped on mobile.
  - **Tablet Layout (768px – 1279px)**:
    - Top Row Executive Summary: Score Card (col 1) + Tally Card (col 2) side-by-side.
    - Bottom Split Workspace: Yard Photo (left ~55%) + Inspector & List (right ~45%) with zero vertical scrolling needed.
  - **Desktop Layout (≥ 1280px)**:
    - Left Column (60%): Full-size Yard Photo + Tally Card beneath it.
    - Right Column (40%): Sticky Score Card + Selected Plant Inspector + Scrollable Plant List.

---

## 3. Key File Directory & Reference Map

| Component / Subsystem | Primary Files | Key Role |
| :--- | :--- | :--- |
| **Vision & AI Pipeline** | [`web3/app/api/analyze/route.ts`](file:///Users/niravgadhia/LandscapingApp/web3/app/api/analyze/route.ts)<br>[`web3/lib/gemini.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/gemini.ts)<br>[`web3/lib/plantnet.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/plantnet.ts) | 2-stage ensemble: Gemini organ detection + Sharp crop + Pl@ntNet botanical classification |
| **Macro Leaf Verification** | [`web3/app/api/identify-macro/route.ts`](file:///Users/niravgadhia/LandscapingApp/web3/app/api/identify-macro/route.ts)<br>[`web3/components/LiveCameraModal.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/LiveCameraModal.tsx)<br>[`web3/components/MacroLeafMatcherModal.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/MacroLeafMatcherModal.tsx) | Close-up leaf camera viewfinder, Gemini trait diagnosis, candidate matching modal |
| **Plant Catalog & Picker** | [`web3/components/PlantPickerModal.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/PlantPickerModal.tsx)<br>[`web3/data/master-nj-plants.json`](file:///Users/niravgadhia/LandscapingApp/web3/data/master-nj-plants.json)<br>[`web3/lib/plantImages.ts`](file:///Users/niravgadhia/LandscapingApp/web3/lib/plantImages.ts) | 237-species searchable NJ catalog with category tabs, 100% photo assets |
| **Curator Admin Portal** | [`web3/app/admin/plants/page.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/app/admin/plants/page.tsx)<br>[`web3/scripts/seed-supabase-plants.js`](file:///Users/niravgadhia/LandscapingApp/web3/scripts/seed-supabase-plants.js) | Full database browser, status filters, add/edit modal, and JSON exporter |
| **Audit View & Canvas** | [`web3/components/audit-view.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/audit-view.tsx)<br>[`web3/components/canvas/BoundingBoxOverlay.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/canvas/BoundingBoxOverlay.tsx)<br>[`web3/app/globals.css`](file:///Users/niravgadhia/LandscapingApp/web3/app/globals.css) | Responsive adaptive grid, confidence badges, verification workflow, interactive box editor |
| **Report & PDF Export** | [`web3/components/report-view.tsx`](file:///Users/niravgadhia/LandscapingApp/web3/components/report-view.tsx) | Report view with interactive tags, plant index legend, and direct `jsPDF` file export |

---

## 4. Database & Future Migration Roadmap

1. **Database Schema**:
   - The PostgreSQL table definition and RLS policies are located in [`supabase/schema.sql`](file:///Users/niravgadhia/LandscapingApp/supabase/schema.sql) (Section 6: `plants` table).
2. **Seeding Supabase**:
   - Once the SQL migration is executed in the Supabase SQL Editor, run:
     ```bash
     cd web3 && node scripts/seed-supabase-plants.js
     ```
   - This seeds all 237 curated species directly into Supabase.
3. **Hybrid Caching (`nj-data.ts`)**:
   - The data loader supports seamless fallback: reads from Supabase when connected, and gracefully falls back to local JSON for offline and build environments.

---
*Documentation compiled on November 3, 2026 for NativeYard (`web3`).*
