"use client";

import { useEffect, useState, useRef } from "react";
import { LandingPage } from "@/components/landing-page";
import { AnalyzingView } from "@/components/analyzing-view";
import { AuditView } from "@/components/audit-view";
import { ReportView } from "@/components/report-view";
import { CameraModal } from "@/components/camera/CameraModal";
import { PropertyBar } from "@/components/property/PropertyBar";
import { PropertyManagerModal } from "@/components/property/PropertyManagerModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { buildDemoAudit } from "@/lib/plants";
import { isNjZip } from "@/lib/nj-data";
import { compressImageFile, isMobileOrTablet } from "@/lib/camera";
import { createClient } from "@/lib/supabase/client";
import {
  getPropertiesWithAreas,
  createProperty,
  createYardArea,
  saveYardScan,
} from "@/lib/supabase/properties";
import { SAMPLE_YARDS, buildSampleAudit, SampleYardKey } from "@/lib/sampleDetections";
import type { Audit, Property, YardArea, YardScan } from "@/lib/types";

type Stage = "landing" | "analyzing" | "audit" | "report";

const DEFAULT_ZIP = "07645";

export default function NativeYardV3() {
  const [stage, setStage] = useState<Stage>("landing");
  const [selectedSampleKey, setSelectedSampleKey] = useState<SampleYardKey>("front-yard");
  const [photo, setPhoto] = useState<string | null>(null);
  const [zip, setZip] = useState(DEFAULT_ZIP);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [isSample, setIsSample] = useState(false);

  // Modals, Camera & Global Upload
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Supabase Auth & Property State
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedArea, setSelectedArea] = useState<YardArea | null>(null);
  const [isSavingScan, setIsSavingScan] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stage]);

  // Check auth & load properties
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadProperties();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        loadProperties();
      } else {
        setProperties([]);
        setSelectedProperty(null);
        setSelectedArea(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProperties() {
    try {
      const data = await getPropertiesWithAreas();
      setProperties(data);
      if (data.length > 0) {
        setSelectedProperty(data[0]);
        if (data[0].yard_areas && data[0].yard_areas.length > 0) {
          setSelectedArea(data[0].yard_areas[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load properties:", e);
    }
  }

  // Handle uploaded/captured photo
  async function handlePhoto(file: File) {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("That file is not an image. Try a JPEG, PNG, WEBP, or HEIC photo.");
      return;
    }

    try {
      // Compress client-side to prevent 413s and Safari timeouts
      const compressed = (await compressImageFile(file, 1600, 0.85)) as File;
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result as string);
        setIsSample(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err: any) {
      setError("Could not process this image. Try another photo.");
    }
  }

  function handleTriggerCamera() {
    if (isMobileOrTablet() && mobileInputRef.current) {
      mobileInputRef.current.value = "";
      mobileInputRef.current.click();
    } else {
      setShowCameraModal(true);
    }
  }

  function handleSelectSampleYard(sampleKey: SampleYardKey) {
    const sampleConfig = SAMPLE_YARDS[sampleKey] || SAMPLE_YARDS["front-yard"];
    setSelectedSampleKey(sampleKey);
    setPhoto(sampleConfig.filename);
    setIsSample(true);
    setError("");

    // If already in audit view or user clicked from top bar, re-generate audit
    if (stage === "audit" || stage === "report") {
      setAudit(buildSampleAudit(sampleKey, zip));
    }
  }

  function handleSample() {
    handleSelectSampleYard("front-yard");
  }

  function handleClearPhoto() {
    setPhoto(null);
    setIsSample(false);
    setError("");
  }

  async function handleStart() {
    if (!/^\d{5}$/.test(zip) || !isNjZip(zip)) {
      setError("Enter a 5-digit New Jersey ZIP code (07000–08999).");
      return;
    }

    const currentSampleConfig = SAMPLE_YARDS[selectedSampleKey] || SAMPLE_YARDS["front-yard"];
    const usingSample = !photo || !photo.startsWith("data:") || isSample;
    const activePhoto = photo ?? currentSampleConfig.filename;

    if (usingSample && !photo) {
      setPhoto(currentSampleConfig.filename);
      setIsSample(true);
    }

    setError("");
    setStage("analyzing");
    setScanStep(0);

    const progress = window.setInterval(() => {
      setScanStep((current) => Math.min(current + 1, 3));
    }, 620);

    const startedAt = Date.now();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip,
          image: usingSample ? null : activePhoto,
          sample: usingSample,
          sampleKey: selectedSampleKey,
          sampleId: selectedSampleKey,
        }),
      });

      let payload: (Audit & { error?: string }) | null = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(payload?.error || "Analysis service error.");
      }

      if (!payload?.detections?.length) {
        throw new Error("No distinct plants recognized. Try a wider daytime photo.");
      }

      await waitFor(Math.max(0, 1800 - (Date.now() - startedAt)));
      if (payload.imageUrl) {
        setPhoto(payload.imageUrl);
      }
      setAudit(payload);
      setScanStep(3);
      setStage("audit");
    } catch (caught: any) {
      if (usingSample) {
        const fallback = buildDemoAudit(zip);
        fallback.notice =
          "Sample illustrative audit loaded. Upload a garden photo to run live Gemini vision identification.";
        await waitFor(Math.max(0, 1200 - (Date.now() - startedAt)));
        setAudit(fallback);
        setScanStep(3);
        setStage("audit");
      } else {
        await waitFor(Math.max(0, 800 - (Date.now() - startedAt)));
        setError(caught.message || "Failed to analyze photo.");
        setStage("landing");
      }
    } finally {
      window.clearInterval(progress);
    }
  }

  async function handleSaveCurrentScan() {
    if (!selectedArea || !audit || !photo) return;
    try {
      setIsSavingScan(true);
      await saveYardScan(selectedArea.id, {
        imageBlobOrDataUrl: photo,
        score: audit.score,
        scoreLabel: audit.scoreLabel,
        detections: audit.detections,
        counts: {
          native: audit.detections.filter((d) => d.plantId && !d.plantId.includes("invasive")).length,
          invasive: audit.detections.filter((d) => d.plantId && d.plantId.includes("invasive")).length,
        },
      });
      await loadProperties();
      alert(`Scan successfully saved to ${selectedArea.name}!`);
    } catch (err: any) {
      alert(err.message || "Failed to save scan");
    } finally {
      setIsSavingScan(false);
    }
  }

  function handleRestoreScan(scan: YardScan) {
    if (!scan.photo_url) return;
    setPhoto(scan.photo_url);
    setIsSample(false);

    // Reconstruct audit object from saved scan
    const fallback = buildDemoAudit(selectedProperty?.zip || DEFAULT_ZIP);
    fallback.score = scan.native_score;
    fallback.scoreLabel = scan.grade || "Saved Yard Audit";
    if (scan.detected_plants && Array.isArray(scan.detected_plants)) {
      fallback.detections = scan.detected_plants;
    }
    fallback.notice = `Restored scan from ${new Date(scan.created_at).toLocaleDateString()}`;

    setAudit(fallback);
    setStage("audit");
  }

  function handleReset() {
    setStage("landing");
    setPhoto(null);
    setIsSample(false);
    setAudit(null);
    setError("");
    setScanStep(0);
  }

  return (
    <div className="min-h-screen bg-[#f7f4e9] text-[#1d2a21] flex flex-col">
      {/* Sticky Top Property & Account Bar (hidden during report & PDF export) */}
      {stage !== "report" && (
        <PropertyBar
          properties={properties}
          selectedProperty={selectedProperty}
          selectedArea={selectedArea}
          onSelectProperty={(prop) => {
            setSelectedProperty(prop);
            if (prop.yard_areas && prop.yard_areas.length > 0) {
              setSelectedArea(prop.yard_areas[0]);
            }
          }}
          onSelectArea={setSelectedArea}
          onOpenPropertyManager={() => setShowPropertyModal(true)}
          onSaveCurrentScan={handleSaveCurrentScan}
          isSavingScan={isSavingScan}
          canSaveScan={Boolean(audit && stage === "audit")}
          user={user}
          onOpenAuth={() => setShowAuthModal(true)}
          onSignOut={async () => {
            const supabase = createClient();
            if (supabase) await supabase.auth.signOut();
          }}
          onTriggerCamera={handleTriggerCamera}
          onTriggerUpload={() => uploadInputRef.current?.click()}
          onSelectSampleYard={(key) => {
            handleSelectSampleYard(key);
            setStage("audit");
          }}
          selectedSampleKey={selectedSampleKey}
        />
      )}

      {/* Hidden Global Upload Trigger */}
      <input
        type="file"
        ref={uploadInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhoto(file);
          e.target.value = "";
        }}
      />

      {/* Hidden Mobile Native Camera Trigger */}
      <input
        type="file"
        ref={mobileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhoto(file);
          e.target.value = "";
        }}
      />

      {/* Main View Router */}
      <div className="flex-1">
        {stage === "analyzing" && (
          <AnalyzingView photo={photo ?? SAMPLE_YARDS[selectedSampleKey].filename} step={scanStep} />
        )}

        {stage === "audit" && audit && (
          <AuditView
            audit={audit}
            photo={photo ?? SAMPLE_YARDS[selectedSampleKey].filename}
            onAuditChange={setAudit}
            onReport={() => setStage("report")}
            onReset={handleReset}
            onHome={() => setStage("landing")}
          />
        )}

        {stage === "report" && audit && (
          <ReportView
            audit={audit}
            photo={photo ?? SAMPLE_YARDS[selectedSampleKey].filename}
            onBack={() => setStage("audit")}
            onReset={handleReset}
            onHome={() => setStage("landing")}
          />
        )}

        {stage === "landing" && (
          <LandingPage
            photo={photo}
            zip={zip}
            error={error}
            isSample={isSample}
            onPhoto={handlePhoto}
            onSample={handleSample}
            onSelectSample={handleSelectSampleYard}
            selectedSampleKey={selectedSampleKey}
            onClearPhoto={handleClearPhoto}
            onZip={(value) => {
              setZip(value);
              setError("");
            }}
            onStart={handleStart}
            onTriggerCamera={handleTriggerCamera}
          />
        )}
      </div>

      {/* Modals */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(file) => handlePhoto(file)}
      />

      <PropertyManagerModal
        isOpen={showPropertyModal}
        onClose={() => setShowPropertyModal(false)}
        properties={properties}
        selectedProperty={selectedProperty}
        selectedArea={selectedArea}
        onSelectProperty={setSelectedProperty}
        onSelectArea={setSelectedArea}
        onCreateProperty={async (data) => {
          const newProp = await createProperty(data);
          await loadProperties();
          setSelectedProperty(newProp);
        }}
        onCreateYardArea={async (propId, data) => {
          await createYardArea(propId, data);
          await loadProperties();
        }}
        onRestoreScan={handleRestoreScan}
      />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

function waitFor(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
