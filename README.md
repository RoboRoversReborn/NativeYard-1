# 🌱 NativeYard — Smart Yard Ecology & Native Plant Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-Vision%20AI-orange?logo=google)](https://ai.google.dev/)
[![Status](https://img.shields.io/badge/Status-Active%20Development-emerald)](#)

**NativeYard** is an AI-powered landscaping ecology web app that helps homeowners transform standard residential yards into vibrant, biodiversity-rich ecosystems. 

Starting with a single photo of your front or back yard, NativeYard detects individual plants, classifies their ecological status (Native, Keystone, Non-Native, or Invasive) for the **New Jersey & Mid-Atlantic** ecoregion, computes an ecological **Yard Native Score (0–100)**, and provides step-by-step guidance to safely remove invasives and plant keystone species.

---

## 🌟 Key Features

* 📸 **Panoramic Yard Scan**: Upload or snap a wide photo of your yard. Google Gemini Vision automatically detects and pinpoints individual plants with bounding boxes.
* 🔍 **Macro Close-Up Leaf Verification**: Unsure about a plant? Tap **"Take/Upload Leaf Photo"** to inspect leaf margins, venation, and arrangement using a close-up camera or photo upload.
* 🌿 **Ecological Classification Engine**:
  * **⭐ Keystone Natives**: High-impact genera (e.g., Oaks, Cherries, Goldenrods) supporting hundreds of caterpillar and pollinator species based on Dr. Doug Tallamy’s research.
  * **🟢 Native Plants**: Indigenous species that provide essential food and habitat for local wildlife.
  * **🔵 Non-Native / Ornamental**: Harmless cultivated plants (e.g., Hostas, Boxwoods, Daylilies).
  * **🔴 Invasive Threats**: Ecological threats requiring eradication (e.g., Japanese Barberry, English Ivy, Burning Bush).
  * **⚪ Unverified**: Flagged for homeowner confirmation via close-up leaf scan or manual selection.
* 📊 **Yard Native Score (0–100)**: Calculates an ecological grade factoring in native diversity, keystone presence, caterpillar host capacity, and invasive penalties.
* 🔄 **Eco-Smart Substitutes**: Suggests ecologically matched native replacements for ornamental and invasive plants.
* 📱 **Mobile-First & Hybrid Camera**: Built with responsive mobile design, touch scrolling, and an integrated camera system featuring live viewfinder, lens flipping (front/back), and native file pickers.

---

## 🏗️ System Architecture

NativeYard is built as a full-stack Next.js web application utilizing serverless API routes for image processing, computer vision, and ecological data mapping.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NativeYard Client (React 19)                    │
│  - Interactive Yard Photo Canvas & SVG Bounding Boxes                  │
│  - Hybrid Camera Viewfinder (Live Video Stream / File Upload)          │
│  - Yard Native Score & Caterpillar Host Breakdown                      │
│  - Filterable Plant Inventory & Native Replacement Modal               │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │                                │
      HTTP Multipart Form Data                       │ JSON Responses
                    │                                │
┌───────────────────┴────────────────────────────────▼───────────────────┐
│                 Next.js App Router API Layer (Node.js)                  │
├───────────────────────────────────┬────────────────────────────────────┤
│   POST /api/analyze               │   POST /api/identify-macro         │
│   - Whole-yard plant detection    │   - Close-up leaf/flower diagnosis │
│   - Bounding boxes (0-1000 norm)  │   - Morphological trait extraction │
│   - Image optimization via Sharp  │   - Ranked candidate lookalikes    │
└─────────────────┬─────────────────┴──────────────────┬─────────────────┘
                  │                                    │
                  ▼                                    ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│        Vision & AI Services       │ │     Ecological Knowledge Base    │
│  - Google Gemini 2.5 Flash        │ │  - njPlants.js: Curated species  │
│  - Pl@ntNet Botanical API (backup)│ │  - Keystone Genera & Host Counts │
│  - Structured JSON Schemas        │ │  - Genus-level fallback taxonomy │
│                                   │ │  - classify.js: Scoring engine   │
└───────────────────────────────────┘ └──────────────────────────────────┘
```

### Plant Identification & Verification Pipeline

1. **Panoramic Detection (`/api/analyze`)**:
   - The user submits a yard photo.
   - `sharp` auto-orients and optimizes the image.
   - Gemini Vision returns 2D normalized bounding coordinates and initial species guesses.
2. **Close-Up Botanical Diagnosis (`/api/identify-macro`)**:
   - The user selects a detected plant and snaps a close-up photo.
   - The model analyzes structural traits: leaf type, margins (serrated vs. entire), arrangement (alternate vs. opposite), and venation.
   - Returns candidate matches with visual distinction hints.
3. **Classification & Scoring (`classify.js` & `njPlants.js`)**:
   - Species are cross-referenced with the curated New Jersey database.
   - Unlisted species fall back to genus-level classifications (e.g., *Carex*, *Viburnum*, *Iris*).
   - The user selects a confirmed match, locking in the verified status and updating the yard's Native Score in real time.

---

## 📁 Repository Structure

```text
LandscapingApp/
├── README.md                      # Project documentation and guide
├── .gitignore                     # Git ignore rules for node_modules, keys, builds
├── docs/
│   └── SPEC.md                    # Detailed product & technical specification
└── web/                           # Next.js frontend and backend application
    ├── package.json               # Dependencies and scripts
    ├── next.config.mjs            # Next.js configuration
    ├── app/
    │   ├── layout.js              # Root application layout and metadata
    │   ├── page.js                # Main interactive single-page application
    │   ├── globals.css            # Custom design tokens, themes, and animations
    │   └── api/
    │       ├── analyze/
    │       │   └── route.js       # Yard image detection endpoint
    │       └── identify-macro/
    │           └── route.js       # Close-up leaf macro identification endpoint
    └── lib/
        ├── gemini.js              # Google Gemini Vision prompts and schemas
        ├── plantnet.js            # Pl@ntNet botanical fallback integration
        ├── classify.js            # Scoring algorithms and plant enrichment logic
        ├── njPlants.js            # Curated NJ botanical database & genus fallbacks
        └── plantImages.js         # Curated botanical specimen photography
```

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (version 18.18 or later recommended)
* [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
* A **Google Gemini API Key** (obtain free from [Google AI Studio](https://aistudio.google.com/))
* *(Optional)* A **Pl@ntNet API Key** (for secondary botanical fallback)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RoboRoversReborn/NativeYard-1.git
   cd NativeYard-1
   ```

2. **Navigate to the web directory and install dependencies:**
   ```bash
   cd web
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file inside the `web/` folder (or copy from `.env.example`):
   ```env
   # Google Gemini Vision
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash

   # Supabase & Google Authentication (https://supabase.com)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

   # (Optional) Pl@ntNet API Key
   PLANTNET_API_KEY=your_optional_plantnet_key_here
   ```

4. **Initialize Database Schema:**
   - In your Supabase Dashboard, open the **SQL Editor**.
   - Copy and run the SQL commands from [`supabase/schema.sql`](file:///Users/niravgadhia/LandscapingApp/supabase/schema.sql) to create the `profiles`, `properties`, `yard_areas`, `yard_scans` tables and image storage bucket.

5. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser (or access via your local network IP on mobile).

---

## 📖 Usage Guide

1. **Scan Yard**:
   - Click **"Take Yard Photo"** (on mobile/tablet) to launch the camera, or **"Upload File"** to select an existing yard photo.
   - Alternatively, click one of the pre-loaded **Sample Yards** (Front Yard, Back Yard, Side Yard) to test instantly.
2. **Review Plants on the Yard Map**:
   - Hover or tap on the bounding box badges on the photo to highlight matching plants in the inventory.
   - Use the filter tabs (**All**, **Keystone**, **Native**, **Invasive**, **Unverified**) to focus on specific categories.
3. **Verify Ambiguous Plants**:
   - If a plant is marked `⚪ Unverified`, click its card and tap **"Take/Upload Leaf Photo"**.
   - Snap a close-up photo of a leaf or flower.
   - Review the candidate matches with visual clues (e.g. *"Spatulate leaves with nodal thorns"*).
   - Tap **Confirm** to lock in the verified species and upgrade its ecological badge.
4. **Actionable Recommendations**:
   - Check the **Yard Native Score (0–100)** and caterpillar host capacity.
   - Review invasive plants for mechanical and cultural removal advice.
   - Select recommended native substitutes to plan your yard's transition.

---

## ☁️ Deployment

NativeYard can be deployed for free on major serverless hosting providers:

### Vercel (Recommended)
1. Push your code to GitHub.
2. Import the repository on [Vercel](https://vercel.com).
3. Set the **Root Directory** to `web`.
4. Add the following **Environment Variables** in project settings:
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://your-id.supabase.co`).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Public key.
5. In **Google Cloud Console → Credentials → Authorized Redirect URIs**, add your Supabase callback:
   - `https://<your-project-id>.supabase.co/auth/v1/callback`
6. Deploy!

### Other Hosting Platforms
* **Render**: Web Service using Node environment (`cd web && npm install && npm run build`).
* **Netlify**: Next.js runtime plugin with base directory set to `web`.

---

## 📚 Acknowledgements & Ecological References

* **Dr. Doug Tallamy & Homegrown National Park**: Keystone plant research and caterpillar host associations.
* **National Wildlife Federation (NWF)**: Native plant finder data for the Eastern Temperate Forests / Mid-Atlantic region.
* **Rutgers NJAES (New Jersey Agricultural Experiment Station)**: Native plant landscape recommendations and invasive plant advisories.
* **Pl@ntNet**: Open botanical identification API.

---

## 📄 License

This project is licensed under the MIT License — see the repository for details.
