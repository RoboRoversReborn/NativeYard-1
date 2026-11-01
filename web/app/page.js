"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { PLANTS } from "@/lib/njPlants";
import { enrichPlant, computeScore, COLOR_MAP } from "@/lib/classify";
import { getPlantImage } from "@/lib/plantImages";
import LiveCameraModal from "@/components/LiveCameraModal";
import { isMobileOrTablet } from "@/lib/camera";

export default function Home() {
  const [selectedSample, setSelectedSample] = useState("front-yard");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [errorMsg, setErrorMsg] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [matchingPlant, setMatchingPlant] = useState(null);
  const [matcherSearch, setMatcherSearch] = useState("");
  const [matcherCategory, setMatcherCategory] = useState("suggested");
  const [showSuggested, setShowSuggested] = useState(true);
  const [macroPlant, setMacroPlant] = useState(null);
  const [macroAnalyzing, setMacroAnalyzing] = useState(false);
  const [macroResult, setMacroResult] = useState(null);
  const [updateToast, setUpdateToast] = useState("");

  // Hybrid Camera State & Hardware Refs
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraConfig, setCameraConfig] = useState({
    mode: "yard",
    title: "Yard Camera Viewfinder",
    subTitle: "Position your camera to capture the yard landscape and click the shutter button",
  });
  const fileInputRef = useRef(null);
  const mobileYardCameraRef = useRef(null);
  const macroInputRef = useRef(null);
  const mobileMacroCameraRef = useRef(null);

  // Load saved key from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("nativeyard_gemini_key") || "";
    if (saved) {
      setGeminiKey(saved);
      setKeyInput(saved);
    }
  }, []);

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    setGeminiKey(trimmed);
    if (trimmed) {
      localStorage.setItem("nativeyard_gemini_key", trimmed);
    } else {
      localStorage.removeItem("nativeyard_gemini_key");
    }
    setShowKeyModal(false);
  };

  // Load sample analysis
  const loadSample = async (sampleId) => {
    try {
      setLoading(true);
      setErrorMsg("");
      setSelectedSample(sampleId);
      setSelectedPlantId(null);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sample analysis");

      setAnalysisData(data);
      if (data.plants?.length > 0) {
        setSelectedPlantId(data.plants[0].id);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process yard photo (from either file upload or live camera capture)
  const processYardPhoto = async (file) => {
    if (!file) return;

    try {
      setLoading(true);
      setErrorMsg("");
      setSelectedSample(null);
      setSelectedPlantId(null);

      const formData = new FormData();
      formData.append("file", file);

      const headers = {};
      if (geminiKey) {
        headers["x-gemini-api-key"] = geminiKey;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze photo");

      setAnalysisData(data);
      if (data.plants?.length > 0) {
        setSelectedPlantId(data.plants[0].id);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (mobileYardCameraRef.current) mobileYardCameraRef.current.value = "";
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processYardPhoto(file);
  };

  useEffect(() => {
    loadSample("front-yard");
  }, []);

  const plants = analysisData?.plants || [];
  const scoreReport = analysisData?.scoreReport || {};
  const selectedPlant = plants.find((p) => p.id === selectedPlantId) || plants[0];

  const nativeCount = plants.filter((p) => p.styling?.type === "native").length;
  const nonNativeCount = plants.filter((p) => p.styling?.type === "non_native").length;
  const invasiveCount = plants.filter((p) => p.styling?.type === "invasive").length;
  const unverifiedCount = plants.filter((p) => p.status === "unknown").length;

  // Filtering
  const filteredPlants = plants.filter((p) => {
    if (filter === "native") return p.styling?.type === "native";
    if (filter === "non_native") return p.styling?.type === "non_native";
    if (filter === "invasive") return p.styling?.type === "invasive";
    if (filter === "unknown") return p.status === "unknown";
    return true;
  });

  const openMatcherForPlant = (plant) => {
    setMatchingPlant(plant);
    setMatcherSearch("");
    setMatcherCategory("suggested");
    setShowSuggested(true);
  };

  const handleSelectSpecies = (dbPlant) => {
    if (!matchingPlant || !analysisData) return;

    const updatedPlants = plants.map((p, idx) => {
      if (p.id === matchingPlant.id) {
        return enrichPlant(
          {
            ...p,
            sci: dbPlant.sci,
            common: dbPlant.common,
            kind: dbPlant.type || p.kind,
            source: "manual_selection",
            confidence: 1.0,
          },
          idx
        );
      }
      return p;
    });

    const newScoreReport = computeScore(updatedPlants);
    setAnalysisData({
      ...analysisData,
      plants: updatedPlants,
      scoreReport: newScoreReport,
    });

    const plantIndex = matchingPlant.index;
    setMatchingPlant(null);
    setUpdateToast(`Updated Plant #${plantIndex} to ${dbPlant.common}!`);
    setTimeout(() => setUpdateToast(""), 4000);
  };

  // Process macro leaf photo
  const processMacroPhoto = async (file, targetPlant = macroPlant) => {
    if (!file || !targetPlant) return;

    const userImageUrl = URL.createObjectURL(file);
    try {
      setMacroAnalyzing(true);
      setErrorMsg("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("hint", targetPlant.common || targetPlant.kind || "");

      const headers = {};
      if (geminiKey) {
        headers["x-gemini-api-key"] = geminiKey;
      }

      const res = await fetch("/api/identify-macro", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze close-up photo");

      setMacroResult({
        userImageUrl,
        observedTraits: data.observedTraits,
        candidates: data.candidates || [],
      });
      setMatchingPlant(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setMacroAnalyzing(false);
      if (macroInputRef.current) macroInputRef.current.value = "";
      if (mobileMacroCameraRef.current) mobileMacroCameraRef.current.value = "";
    }
  };

  const handleMacroUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processMacroPhoto(file, macroPlant);
  };

  // Hybrid Camera Trigger: Hardware camera on mobile/tablet vs In-App Viewfinder on Desktop
  const handleTriggerCamera = (mode = "yard", plant = null) => {
    if (mode === "macro" && plant) {
      setMacroPlant(plant);
    }

    const isMobile = isMobileOrTablet();
    if (isMobile) {
      if (mode === "yard" && mobileYardCameraRef.current) {
        mobileYardCameraRef.current.value = "";
        mobileYardCameraRef.current.click();
      } else if (mode === "macro" && mobileMacroCameraRef.current) {
        mobileMacroCameraRef.current.value = "";
        mobileMacroCameraRef.current.click();
      }
    } else {
      setCameraConfig({
        mode,
        title: mode === "yard" ? "Yard Camera Viewfinder" : `Close-Up Viewfinder: ${plant?.common || "Leaf"}`,
        subTitle:
          mode === "yard"
            ? "Position your camera to capture the yard landscape and click the shutter button"
            : "Hold leaf or flower close to the camera lens in good lighting and click shutter",
      });
      setShowCameraModal(true);
    }
  };

  const handleCameraCapture = (file) => {
    if (cameraConfig.mode === "macro") {
      processMacroPhoto(file, macroPlant);
    } else {
      processYardPhoto(file);
    }
  };

  const startMacroScan = (plant) => {
    handleTriggerCamera("macro", plant);
  };

  const handleConfirmMacroCandidate = (candidate) => {
    if (!macroPlant || !analysisData) return;

    const updatedPlants = plants.map((p, idx) => {
      if (p.id === macroPlant.id) {
        const confirmedStatus = (candidate.status && candidate.status !== "unknown")
          ? candidate.status
          : (candidate.styling?.type && candidate.styling.type !== "unknown")
          ? candidate.styling.type
          : "native";

        return enrichPlant(
          {
            ...p,
            sci: candidate.sci,
            common: candidate.common,
            kind: p.kind,
            source: "macro_leaf_match",
            confidence: candidate.confidence || 0.98,
            status: confirmedStatus,
            styling: candidate.styling,
          },
          idx
        );
      }
      return p;
    });

    const newScoreReport = computeScore(updatedPlants);
    setAnalysisData({
      ...analysisData,
      plants: updatedPlants,
      scoreReport: newScoreReport,
    });

    const plantIndex = macroPlant.index;
    setMacroResult(null);
    setMacroPlant(null);
    setUpdateToast(`Verified Plant #${plantIndex} as ${candidate.common} via visual leaf match!`);
    setTimeout(() => setUpdateToast(""), 4500);
  };

  // Compute suggested plants for the opened plant
  const suggestedPlants = useMemo(() => {
    if (!matchingPlant) return [];
    const kind = (matchingPlant.kind || "").toLowerCase();
    const sciLower = (matchingPlant.sci || "").toLowerCase();
    const commonLower = (matchingPlant.common || "").toLowerCase();

    // 1. Direct or partial name matches
    const nameMatches = PLANTS.filter(
      (p) =>
        (sciLower && p.sci.toLowerCase().includes(sciLower)) ||
        (commonLower && p.common.toLowerCase().includes(commonLower))
    );

    // 2. Kind-specific matches (e.g. shrubs, trees, perennials)
    const kindMatches = PLANTS.filter((p) => p.type === kind);

    // Fallback popular NJ plants
    const popularFallbacks = PLANTS.slice(0, 10);

    const combined = Array.from(new Set([...nameMatches, ...kindMatches, ...popularFallbacks]));
    return combined.slice(0, 8);
  }, [matchingPlant]);

  // Filter the complete database based on search input and active tab
  const databaseDisplayList = useMemo(() => {
    if (matcherSearch.trim()) {
      const q = matcherSearch.toLowerCase().trim();
      return PLANTS.filter(
        (p) =>
          p.common.toLowerCase().includes(q) ||
          p.sci.toLowerCase().includes(q) ||
          (p.synonyms || []).some((s) => s.toLowerCase().includes(q))
      );
    }

    if (matcherCategory === "suggested") {
      return suggestedPlants;
    }
    if (matcherCategory === "invasive") {
      return PLANTS.filter((p) => p.status === "invasive");
    }
    if (matcherCategory === "native") {
      return PLANTS.filter((p) => p.status === "native" || p.status === "keystone");
    }
    if (matcherCategory === "non_native") {
      return PLANTS.filter((p) => p.status === "non_native" || p.status === "na_native");
    }
    return PLANTS;
  }, [matcherCategory, matcherSearch, suggestedPlants]);

  return (
    <div>
      {/* Top Navigation */}
      <header className="app-header">
        <div className="container header-inner">
          <a href="#" className="brand">
            <div className="brand-icon">🌿</div>
            <div className="brand-title">
              Native<span>Yard</span>
            </div>
            <span className="badge-nj">New Jersey Pilot</span>
          </a>

          <div className="header-action-group">
            <button
              type="button"
              className="btn-camera"
              onClick={() => handleTriggerCamera("yard")}
              title="Snap a photo of your yard using your camera"
            >
              📷 Take Photo
            </button>
            <button
              type="button"
              className="btn-upload-file"
              onClick={() => fileInputRef.current?.click()}
              title="Upload an image file from your device"
            >
              📁 Upload File
            </button>
          </div>
        </div>
      </header>

      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>🔑</span>
                <span>Google Gemini API Key</span>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowKeyModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p>
                To analyze your own yard photos, provide a free Gemini API key from Google AI Studio. The key stays securely in your browser's local storage.
              </p>

              <div className="step-card">
                <div><strong>How to get your free key in 30 seconds:</strong></div>
                <div>1. Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio (aistudio.google.com)</a></div>
                <div>2. Sign in with your Google / Gmail account</div>
                <div>3. Click <strong>"Create API key"</strong> and copy it</div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "700", color: "var(--text-main)" }}>
                  Paste Gemini API Key:
                </label>
                <input
                  type="password"
                  className="key-input"
                  placeholder="AIzaSy..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                💡 <em>Developer note:</em> You can also add <code>GEMINI_API_KEY=your_key</code> inside <code>/Users/niravgadhia/LandscapingApp/web/.env.local</code>.
              </div>
            </div>

            <div className="modal-actions">
              {geminiKey && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setKeyInput("");
                    setGeminiKey("");
                    localStorage.removeItem("nativeyard_gemini_key");
                    setShowKeyModal(false);
                  }}
                  style={{ color: "var(--c-invasive)" }}
                >
                  Remove Key
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowKeyModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveKey}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Plant Matcher Modal from Pre-determined NJ Database */}
      {matchingPlant && (
        <div className="modal-backdrop" onClick={() => setMatchingPlant(null)}>
          <div className="modal-card picker-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>🌿</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--text-main)" }}>
                    Identify Plant #{matchingPlant.index}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "normal" }}>
                    Currently: {matchingPlant.common} ({matchingPlant.sci}) ·{" "}
                    {matchingPlant.status === "unknown" ? "⚪ Unverified" : matchingPlant.status}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="macro-trigger-btn"
                  onClick={() => handleTriggerCamera("macro", matchingPlant)}
                  title="Take a live close-up picture of the leaf or flower with your camera"
                >
                  📷 Snap Leaf Photo
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                  onClick={() => {
                    setMacroPlant(matchingPlant);
                    if (macroInputRef.current) {
                      macroInputRef.current.value = "";
                      macroInputRef.current.click();
                    }
                  }}
                  title="Upload leaf photo from your device"
                >
                  📁 Upload Leaf
                </button>
                <button
                  className="modal-close"
                  onClick={() => setMatchingPlant(null)}
                  aria-label="Close plant picker"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Quick Select: Suggested Similar Plants */}
              {suggestedPlants.length > 0 && !matcherSearch && (
                <div className="suggested-section">
                  <div className="suggested-header">
                    <div className="suggested-title">
                      <span>⚡</span>
                      <span>Suggested Similar Plants for this Yard Zone:</span>
                      <span className="suggested-count-pill">{suggestedPlants.length}</span>
                    </div>
                    <button
                      type="button"
                      className="suggested-toggle-btn"
                      onClick={() => setShowSuggested(!showSuggested)}
                      title={showSuggested ? "Hide suggested list to see more of the database" : "Show suggested similar plants"}
                    >
                      {showSuggested ? "▲ Hide" : `▼ Show (${suggestedPlants.length})`}
                    </button>
                  </div>

                  {showSuggested && (
                    <div className="suggested-grid-scroll">
                      <div className="suggested-grid">
                        {suggestedPlants.map((item, idx) => {
                          const isNative = item.status === "native" || item.status === "keystone";
                          const isInvasive = item.status === "invasive";
                          const imgUrl = getPlantImage(item.sci, item.common);
                          return (
                            <button
                              key={idx}
                              className="suggested-card-btn"
                              onClick={() => handleSelectSpecies(item)}
                              title={`Select ${item.common}`}
                            >
                              <div className="suggested-card-img-wrap">
                                {imgUrl ? (
                                  <img
                                    src={imgUrl}
                                    alt={item.common}
                                    className="suggested-card-img"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="suggested-card-placeholder">🌱</div>
                                )}
                              </div>
                              <div className="suggested-card-body">
                                <div className="suggested-card-common">
                                  {item.status === "keystone" && "🌟 "}
                                  {item.common}
                                </div>
                                <div className="suggested-card-sci">
                                  {item.sci} • {item.type}
                                </div>
                                <span
                                  className={`plant-badge ${
                                    isInvasive ? "invasive" : isNative ? "native" : "non-native"
                                  }`}
                                  style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    width: "fit-content",
                                    marginTop: "3px",
                                  }}
                                >
                                  {isInvasive
                                    ? "Invasive (Red)"
                                    : item.status === "keystone"
                                    ? "Keystone Native (Green)"
                                    : isNative
                                    ? "Native (Green)"
                                    : "Non-native (Orange)"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Real-time Search Input */}
              <div className="picker-search-bar">
                <span>🔍</span>
                <input
                  type="text"
                  placeholder="Search 150+ NJ plants by common or botanical name (e.g. Oak, Barberry, Dogwood)..."
                  value={matcherSearch}
                  onChange={(e) => setMatcherSearch(e.target.value)}
                  autoFocus
                />
                {matcherSearch && (
                  <button
                    onClick={() => setMatcherSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Tabs by Ecological Category */}
              {!matcherSearch && (
                <div className="picker-tabs-row">
                  <button
                    className={`picker-tab ${matcherCategory === "suggested" ? "active" : ""}`}
                    onClick={() => setMatcherCategory("suggested")}
                  >
                    Suggested ({suggestedPlants.length})
                  </button>
                  <button
                    className={`picker-tab ${matcherCategory === "all" ? "active" : ""}`}
                    onClick={() => setMatcherCategory("all")}
                  >
                    All NJ Database ({PLANTS.length})
                  </button>
                  <button
                    className={`picker-tab ${matcherCategory === "native" ? "active" : ""}`}
                    onClick={() => setMatcherCategory("native")}
                  >
                    🟢 Natives & Keystones
                  </button>
                  <button
                    className={`picker-tab ${matcherCategory === "invasive" ? "active" : ""}`}
                    onClick={() => setMatcherCategory("invasive")}
                  >
                    🔴 Common Invasives
                  </button>
                  <button
                    className={`picker-tab ${matcherCategory === "non_native" ? "active" : ""}`}
                    onClick={() => setMatcherCategory("non_native")}
                  >
                    🟠 Non-Native Ornamentals
                  </button>
                </div>
              )}

              {/* Scrollable list of matched species */}
              <div className="database-scroll-list">
                {databaseDisplayList.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "28px",
                      color: "var(--text-muted)",
                      fontSize: "13px",
                    }}
                  >
                    No plant found matching "{matcherSearch}". Try another name or clear search.
                  </div>
                ) : (
                  databaseDisplayList.map((item, idx) => {
                    const isNative = item.status === "native" || item.status === "keystone";
                    const isInvasive = item.status === "invasive";
                    const imgUrl = getPlantImage(item.sci, item.common);
                    return (
                      <button
                        key={idx}
                        className="species-row-btn"
                        onClick={() => handleSelectSpecies(item)}
                      >
                        <div className="species-row-left">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={item.common}
                              className="species-thumb"
                              loading="lazy"
                            />
                          ) : (
                            <div className="species-thumb-placeholder">🌿</div>
                          )}
                          <div className="species-info">
                            <span className="species-common">
                              {item.status === "keystone" && "🌟 "}
                              {item.common}
                            </span>
                            <span className="species-sci">
                              {item.sci} • {item.type}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {item.keystone && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#86efac",
                                fontWeight: "600",
                              }}
                            >
                              Hosts {item.caterpillarHosts}+ species
                            </span>
                          )}
                          <span
                            className={`plant-badge ${
                              isInvasive ? "invasive" : isNative ? "native" : "non-native"
                            }`}
                          >
                            {isInvasive
                              ? "Invasive"
                              : item.status === "keystone"
                              ? "Keystone Native"
                              : isNative
                              ? "Native"
                              : "Non-Native"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file & hardware camera inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={mobileYardCameraRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={macroInputRef}
        onChange={handleMacroUpload}
        accept="image/*"
        style={{ display: "none" }}
      />
      <input
        type="file"
        ref={mobileMacroCameraRef}
        onChange={handleMacroUpload}
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
      />

      {/* In-App Live Camera Modal for Desktop/Webcam Viewfinder */}
      <LiveCameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        title={cameraConfig.title}
        subTitle={cameraConfig.subTitle}
        facingMode="environment"
      />

      {/* Analyzing Macro Scan Loading Overlay */}
      {macroAnalyzing && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: "480px", textAlign: "center", padding: "36px 24px" }}>
            <div className="spinner" style={{ margin: "0 auto 20px" }}></div>
            <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)", marginBottom: "8px" }}>
              Analyzing Leaf Morphology...
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
              Examining leaf margins, venation pattern, and arrangement with Gemini Vision to find matching NJ species...
            </p>
          </div>
        </div>
      )}

      {/* Close-Up Visual Leaf Matcher Modal */}
      {macroResult && macroPlant && (
        <div className="modal-backdrop" onClick={() => setMacroResult(null)}>
          <div className="modal-card macro-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>🔬</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--text-main)" }}>
                    Visual Leaf Matcher · Plant #{macroPlant.index}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Compare your close-up photo against candidate leaf styles below
                  </div>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setMacroResult(null)}
                aria-label="Close leaf matcher"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="macro-compare-grid">
                {/* Left Column: Homeowner's Photo & Diagnosed Traits */}
                <div className="macro-left-col">
                  <div className="macro-user-photo-wrap">
                    <img
                      src={macroResult.userImageUrl}
                      alt="Your plant close-up"
                      className="macro-user-photo"
                    />
                    <div className="macro-user-photo-label">📸 Your Close-Up Photo</div>
                  </div>

                  {macroResult.observedTraits && (
                    <div className="macro-traits-card">
                      <div className="macro-traits-head">
                        <span>🌿</span>
                        <span>Observed Leaf Morphology</span>
                      </div>
                      <div className="macro-traits-chips">
                        {macroResult.observedTraits.leafType && (
                          <span className="macro-trait-chip">
                            🍃 {macroResult.observedTraits.leafType}
                          </span>
                        )}
                        {macroResult.observedTraits.margin && (
                          <span className="macro-trait-chip">
                            ✂️ {macroResult.observedTraits.margin}
                          </span>
                        )}
                        {macroResult.observedTraits.arrangement && (
                          <span className="macro-trait-chip">
                            🌿 {macroResult.observedTraits.arrangement}
                          </span>
                        )}
                        {macroResult.observedTraits.venation && (
                          <span className="macro-trait-chip">
                            🔀 {macroResult.observedTraits.venation}
                          </span>
                        )}
                      </div>

                      {macroResult.observedTraits.distinguishingFeatures?.length > 0 && (
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
                            KEY VISUAL CLUES:
                          </div>
                          <ul className="macro-features-list">
                            {macroResult.observedTraits.distinguishingFeatures.map((f, i) => (
                              <li key={i} className="macro-feature-item">
                                <span className="bullet">✓</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "8px", width: "100%", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleTriggerCamera("macro", macroPlant)}
                      style={{ fontSize: "12px", padding: "8px 10px", flex: 1 }}
                    >
                      📷 Retake Photo
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        if (macroInputRef.current) {
                          macroInputRef.current.value = "";
                          macroInputRef.current.click();
                        }
                      }}
                      style={{ fontSize: "12px", padding: "8px 10px", flex: 1 }}
                    >
                      📁 Upload File
                    </button>
                  </div>
                </div>

                {/* Right Column: Comparative Candidates */}
                <div className="macro-right-col">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--c-native)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Top Similar NJ Candidates ({macroResult.candidates.length})
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Pick the one matching your leaf
                    </span>
                  </div>

                  {macroResult.candidates.map((cand, idx) => {
                    const isNative = cand.status === "native" || cand.status === "keystone";
                    const isInvasive = cand.status === "invasive";
                    return (
                      <div key={idx} className="macro-cand-card">
                        <div className="macro-cand-header">
                          {cand.image ? (
                            <img
                              src={cand.image}
                              alt={cand.common}
                              className="macro-cand-thumb"
                              loading="lazy"
                            />
                          ) : (
                            <div className="species-thumb-placeholder" style={{ width: "72px", height: "72px", fontSize: "28px" }}>
                              🌱
                            </div>
                          )}
                          <div className="macro-cand-meta">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "2px" }}>
                              <span className="macro-cand-common">
                                {cand.isKeystone && "🌟 "}
                                {cand.common}
                              </span>
                              <span
                                className={`plant-badge ${
                                  isInvasive ? "invasive" : isNative ? "native" : "non-native"
                                }`}
                              >
                                {cand.styling?.badge || cand.status}
                              </span>
                            </div>
                            <div className="macro-cand-sci">{cand.sci}</div>
                            {cand.leafStyleMatch && (
                              <span style={{ fontSize: "11px", color: "#0369a1", fontWeight: "600" }}>
                                🍃 Leaf Style: {cand.leafStyleMatch}
                              </span>
                            )}
                          </div>
                        </div>

                        {cand.visualDistinction && (
                          <div className="macro-distinction-box">
                            <strong>🔍 Key Distinction:</strong> {cand.visualDistinction}
                          </div>
                        )}

                        <div className="macro-cand-actions">
                          <div className="macro-match-confidence">
                            Match Score: {Math.round((cand.confidence || 0.85) * 100)}%
                            {cand.caterpillarHosts > 0 && ` • Hosts ${cand.caterpillarHosts}+ species`}
                          </div>
                          <button
                            type="button"
                            className="macro-confirm-btn"
                            onClick={() => handleConfirmMacroCandidate(cand)}
                          >
                            ✓ This Matches My Plant
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container">
        {/* Hero & Color Code Legend */}
        <section className="hero">
          <div className="hero-pill">🌱 AI Landscape Biodiversity Audit</div>
          <h1 className="hero-title">
            Identify Native vs. Invasive Plants <em>in Your Yard</em>
          </h1>
          <p className="hero-sub">
            Upload your whole yard photo. Our AI pinpoints every plant and classifies it with color-coded markers to show your ecosystem impact and transition roadmap.
          </p>

          {/* Color-coded legend requested by user */}
          <div className="legend-bar">
            <div className="legend-item">
              <span className="legend-box native"></span>
              <span><strong>Green Box:</strong> Native & Keystone</span>
            </div>
            <div className="legend-item">
              <span className="legend-box non-native"></span>
              <span><strong>Orange Box:</strong> Non-native</span>
            </div>
            <div className="legend-item">
              <span className="legend-box invasive"></span>
              <span><strong>Red Box:</strong> Invasive in NJ</span>
            </div>
          </div>
        </section>

        {/* Quick Sample Selector & Camera Upload Banner */}
        <section className="picker-card">
          <div className="quick-capture-card">
            <div className="capture-info">
              <div className="capture-title">📸 Analyze Your Own Yard or Garden</div>
              <div className="capture-sub">
                Snap a live landscape photo with your phone, iPad, or webcam — or choose a file from your photo library.
              </div>
            </div>
            <div className="capture-buttons">
              <button
                type="button"
                className="btn-camera"
                onClick={() => handleTriggerCamera("yard")}
              >
                📷 Snap Yard Photo
              </button>
              <button
                type="button"
                className="btn-upload-file"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Choose from Files
              </button>
            </div>
          </div>

          <div className="picker-header" style={{ marginTop: "16px" }}>
            <div className="picker-title">
              🏡 Or Explore Sample New Jersey Yards
            </div>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Instant demo with full detection, bounding boxes, and report
            </span>
          </div>

          <div className="samples-grid">
            <button
              className={`sample-btn ${selectedSample === "front-yard" ? "active" : ""}`}
              onClick={() => loadSample("front-yard")}
            >
              <img
                src="/samples/front-yard.jpg"
                alt="Front Yard"
                className="sample-thumb"
              />
              <div>
                <div className="sample-btn-title">Suburban Front Yard</div>
                <div className="sample-btn-desc">Barberry, Burning Bush, Hostas & Red Oak</div>
              </div>
            </button>

            <button
              className={`sample-btn ${selectedSample === "back-yard" ? "active" : ""}`}
              onClick={() => loadSample("back-yard")}
            >
              <img
                src="/samples/back-yard.jpg"
                alt="Backyard"
                className="sample-thumb"
              />
              <div>
                <div className="sample-btn-title">Pollinator Backyard</div>
                <div className="sample-btn-desc">Milkweed, Goldenrod, Aster & Blueberry</div>
              </div>
            </button>

            <button
              className={`sample-btn ${selectedSample === "side-yard" ? "active" : ""}`}
              onClick={() => loadSample("side-yard")}
            >
              <img
                src="/samples/side-yard.jpg"
                alt="Side Yard"
                className="sample-thumb"
              />
              <div>
                <div className="sample-btn-title">Woodland Edge Side Yard</div>
                <div className="sample-btn-desc">Bradford Pear, Privet, Multiflora Rose</div>
              </div>
            </button>
          </div>
        </section>

        {errorMsg && (
          <div style={{
            background: "var(--c-invasive-bg)",
            border: "1px solid var(--c-invasive)",
            color: "var(--c-invasive-text)",
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "24px",
            fontSize: "14px"
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="loader-overlay">
            <div className="spinner"></div>
            <p style={{ color: "var(--c-native)", fontWeight: "700" }}>
              Analyzing yard photo... detecting plant bounding boxes & cross-referencing NJ native species list
            </p>
          </div>
        ) : analysisData ? (
          <div className="viewer-layout">
            {/* Left Column: Interactive Photo Canvas with Bounding Boxes */}
            <div className="photo-canvas-card">
              <div className="canvas-toolbar">
                <span className="toolbar-title">
                  {analysisData.sampleName || "Uploaded Yard Photo"} ({plants.length} plants detected)
                </span>

                <div className="filter-pills">
                  <button
                    className={`filter-pill ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                  >
                    All ({plants.length})
                  </button>
                  <button
                    className={`filter-pill f-native ${filter === "native" ? "active" : ""}`}
                    onClick={() => setFilter("native")}
                  >
                    Green ({nativeCount})
                  </button>
                  <button
                    className={`filter-pill f-nonnative ${filter === "non_native" ? "active" : ""}`}
                    onClick={() => setFilter("non_native")}
                  >
                    Orange ({nonNativeCount})
                  </button>
                  <button
                    className={`filter-pill f-invasive ${filter === "invasive" ? "active" : ""}`}
                    onClick={() => setFilter("invasive")}
                  >
                    Red ({invasiveCount})
                  </button>
                  {unverifiedCount > 0 && (
                    <button
                      className={`filter-pill f-unknown ${filter === "unknown" ? "active" : ""}`}
                      onClick={() => setFilter("unknown")}
                    >
                      ⚪ Unverified ({unverifiedCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Viewport with image and positioned bounding boxes */}
              <div className="photo-viewport">
                <img
                  src={analysisData.imageUrl}
                  alt="Yard layout"
                />

                {filteredPlants.map((plant) => {
                  if (!plant.box || plant.box.length !== 4) return null;
                  const [ymin, xmin, ymax, xmax] = plant.box;
                  const top = ymin / 10;
                  const left = xmin / 10;
                  const height = (ymax - ymin) / 10;
                  const width = (xmax - xmin) / 10;
                  const isSelected = plant.id === selectedPlantId;

                  return (
                    <div
                      key={plant.id}
                      className={`plant-box status-${plant.status} ${isSelected ? "selected" : ""}`}
                      style={{
                        top: `${top}%`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${height}%`,
                      }}
                      onClick={() => {
                        setSelectedPlantId(plant.id);
                        if (plant.status === "unknown") {
                          openMatcherForPlant(plant);
                        }
                      }}
                      title={plant.status === "unknown" ? `Plant #${plant.index} unverified - Click to choose from NJ plant database` : `${plant.common} (${plant.sci}) - Click for details`}
                    >
                      <div className={`box-tag status-${plant.status}`}>
                        <span>#{plant.index}</span>
                        <span>{plant.status === "unknown" ? "⚪ Click to Identify" : plant.common}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Homeowner Native Score Card & Inventory */}
            <div className="report-panel">
              {/* Score Dial Card */}
              <div className="score-card">
                <div className="score-header">
                  <span className="score-title">Homeowner Ecosystem Score</span>
                  <span className="badge-nj">NJ Ecoregion</span>
                </div>

                <div className="score-dial-row">
                  <div
                    className="dial-circle"
                    style={{ "--score-pct": scoreReport.score ?? 50 }}
                  >
                    <div className="dial-circle-inner">
                      <span className="dial-score">{scoreReport.score ?? "--"}</span>
                      <span className="dial-label">/ 100</span>
                    </div>
                  </div>

                  <div className="score-info">
                    <div className="score-grade">
                      {scoreReport.grade}
                    </div>
                    <div className="score-desc">
                      {scoreReport.message}
                    </div>
                  </div>
                </div>

                {/* Counts Breakdown Strip */}
                <div className="metrics-strip">
                  <div className="metric-box">
                    <div className="metric-count green">{nativeCount}</div>
                    <div className="metric-name">Green (Native)</div>
                  </div>
                  <div className="metric-box">
                    <div className="metric-count orange">{nonNativeCount}</div>
                    <div className="metric-name">Orange (Non-native)</div>
                  </div>
                  <div className="metric-box">
                    <div className="metric-count red">{invasiveCount}</div>
                    <div className="metric-name">Red (Invasive)</div>
                  </div>
                </div>

                {/* Keystone Caterpillar Support Callout */}
                {scoreReport.caterpillarSpecies > 0 && (
                  <div className="caterpillar-callout">
                    <div className="caterpillar-icon">🐛</div>
                    <div className="caterpillar-text">
                      Your yard's keystone plants support up to{" "}
                      <strong>{scoreReport.caterpillarSpecies} butterfly & moth caterpillar species</strong>,
                      the vital food source for nesting songbirds!
                    </div>
                  </div>
                )}
              </div>

              {/* Plant Inventory & Actionable Substitutes */}
              <div className="inventory-card">
                <div className="inventory-header">
                  <div className="inventory-title">
                    🌿 Identified Plants
                  </div>
                  <span className="inventory-count">{plants.length} identified</span>
                </div>

                <div className="plant-list">
                  {plants.map((plant) => {
                    const isSelected = plant.id === selectedPlantId;
                    const borderClass =
                      plant.status === "unknown"
                        ? "border-unknown"
                        : plant.styling?.type === "native"
                        ? "border-native"
                        : plant.styling?.type === "non_native"
                        ? "border-nonnative"
                        : "border-invasive";

                    const badgeClass =
                      plant.status === "unknown"
                        ? "unknown"
                        : plant.styling?.type === "native"
                        ? "native"
                        : plant.styling?.type === "non_native"
                        ? "non-native"
                        : "invasive";

                    return (
                      <div
                        key={plant.id}
                        className={`plant-item ${borderClass} ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedPlantId(plant.id)}
                      >
                        <div className="plant-row-top">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                            {getPlantImage(plant.sci, plant.common) ? (
                              <img
                                src={getPlantImage(plant.sci, plant.common)}
                                alt={plant.common}
                                className="species-thumb"
                                style={{ width: "38px", height: "38px" }}
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="species-thumb-placeholder"
                                style={{ width: "38px", height: "38px", fontSize: "16px" }}
                              >
                                {plant.status === "unknown" ? "❓" : "🌿"}
                              </div>
                            )}
                            <div className="plant-names">
                              <span className="plant-common">
                                #{plant.index} {plant.common}
                              </span>
                              <span className="plant-sci">{plant.sci}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                            <span className={`plant-badge ${badgeClass}`}>
                              {plant.styling?.badge || (plant.status === "unknown" ? "⚪ Unverified" : plant.status)}
                            </span>
                            <button
                              className="match-btn-subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                startMacroScan(plant);
                              }}
                              title="Take or upload a close-up photo of leaf/flower"
                            >
                              📸
                            </button>
                            <button
                              className="match-btn-subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMatcherForPlant(plant);
                              }}
                              title="Manually match or change species"
                            >
                              ✏️ Match
                            </button>
                          </div>
                        </div>

                        {plant.status === "unknown" && (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                            <button
                              className="macro-trigger-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                startMacroScan(plant);
                              }}
                            >
                              📸 Scan Close-Up Leaf
                            </button>
                            <button
                              className="match-btn-callout"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMatcherForPlant(plant);
                              }}
                            >
                              🔍 NJ Database
                            </button>
                          </div>
                        )}

                        {plant.note && (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                            ⚠️ {plant.note}
                          </div>
                        )}

                        {/* Native Substitutes recommendation if plant is non-native or invasive */}
                        {plant.substitutes && plant.substitutes.length > 0 && (
                          <div className="substitute-box">
                            <div className="substitute-title">
                              🔄 Recommended Native NJ Substitutes:
                            </div>
                            <div className="sub-chips">
                              {plant.substitutes.map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  className={`sub-chip ${sub.keystone ? "keystone-sub" : ""}`}
                                >
                                  {sub.keystone && "🌟 "}
                                  {sub.common}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Homeowner Detailed Roadmap & Action Plan */}
        {analysisData && (
          <section className="recommendations-section">
            <div className="section-head">
              <h2 className="section-title">Homeowner Transition Roadmap</h2>
              <p className="section-sub">
                Step-by-step action plan to eliminate invasive spreaders and boost your yard's ecological value.
              </p>
            </div>

            <div className="action-cards-grid">
              {/* Priority 1: Remove Invasives */}
              <div className="action-card">
                <div className="action-card-header">
                  <div className="action-icon red">🚨</div>
                  <div>
                    <h3 className="action-title">Phase 1: Remove Invasives</h3>
                    <span style={{ fontSize: "12px", color: "var(--c-invasive-text)", fontWeight: "600" }}>
                      {invasiveCount} invasive species identified
                    </span>
                  </div>
                </div>
                <ul className="action-list">
                  {plants.filter((p) => p.styling?.type === "invasive").length > 0 ? (
                    plants
                      .filter((p) => p.styling?.type === "invasive")
                      .map((p, i) => (
                        <li key={i} className="action-item-box">
                          <strong>Remove #{p.index} {p.common}:</strong> {p.note || "Aggressive spreader in New Jersey ecosystems. Dig up roots or cut-stump before seeds disperse."}
                        </li>
                      ))
                  ) : (
                    <li className="action-item-box" style={{ color: "var(--c-native-text)" }}>
                      ✅ Great news! No invasive species were detected in this yard scan.
                    </li>
                  )}
                </ul>
              </div>

              {/* Priority 2: Replace Non-Natives */}
              <div className="action-card">
                <div className="action-card-header">
                  <div className="action-icon orange">🔄</div>
                  <div>
                    <h3 className="action-title">Phase 2: Transition Ornamentals</h3>
                    <span style={{ fontSize: "12px", color: "var(--c-nonnative-text)", fontWeight: "600" }}>
                      Eco-friendly native swaps
                    </span>
                  </div>
                </div>
                <ul className="action-list">
                  {plants.filter((p) => p.substitutes?.length > 0).slice(0, 3).map((p, i) => (
                    <li key={i} className="action-item-box">
                      <strong>Replace {p.common} with:</strong>{" "}
                      {p.substitutes.map((s) => s.common).join(", ")}.
                    </li>
                  ))}
                </ul>
              </div>

              {/* Priority 3: Plant Keystones */}
              <div className="action-card">
                <div className="action-card-header">
                  <div className="action-icon green">🌟</div>
                  <div>
                    <h3 className="action-title">Phase 3: Add Keystone Species</h3>
                    <span style={{ fontSize: "12px", color: "var(--c-native-text)", fontWeight: "600" }}>
                      Mid-Atlantic Ecoregion Champions
                    </span>
                  </div>
                </div>
                <ul className="action-list">
                  <li className="action-item-box">
                    <strong>Oak Trees (Quercus):</strong> Host over 550 caterpillar species — the #1 powerhouse tree in New Jersey.
                  </li>
                  <li className="action-item-box">
                    <strong>Goldenrod & Asters:</strong> Provide late-season nectar for migrating monarchs and specialist bees until first frost.
                  </li>
                  <li className="action-item-box">
                    <strong>Highbush Blueberry & Serviceberry:</strong> Provide four-season beauty, spring flowers, and delicious summer berries for birds.
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>
            NativeYard prototype · Powered by Gemini Vision & Pl@ntNet botanical classification · Native ranges verified for New Jersey ecoregions.
          </p>
        </div>
      </footer>

      {/* Floating Status Toast */}
      {updateToast && <div className="update-toast">✅ {updateToast}</div>}
    </div>
  );
}
