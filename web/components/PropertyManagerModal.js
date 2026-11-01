"use client";

import { useState } from "react";
import { createProperty, createYardArea } from "@/lib/supabase/properties";

export default function PropertyManagerModal({
  isOpen,
  onClose,
  properties = [],
  selectedPropertyId,
  selectedAreaId,
  onSelectProperty,
  onSelectArea,
  onRefreshProperties,
  onLoadPastScan,
  onShowToast,
}) {
  const [activeTab, setActiveTab] = useState("properties"); // 'properties', 'areas', 'history'

  // New Property Form State
  const [newPropName, setNewPropName] = useState("");
  const [newPropAddress, setNewPropAddress] = useState("");
  const [newPropCity, setNewPropCity] = useState("");
  const [newPropZip, setNewPropZip] = useState("");
  const [isSubmittingProp, setIsSubmittingProp] = useState(false);

  // New Yard Area Form State
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaType, setNewAreaType] = useState("front");
  const [newAreaSun, setNewAreaSun] = useState("partial_sun");
  const [newAreaSoil, setNewAreaSoil] = useState("loam");
  const [isSubmittingArea, setIsSubmittingArea] = useState(false);

  if (!isOpen) return null;

  const currentProperty =
    properties.find((p) => p.id === selectedPropertyId) || properties[0] || null;

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!newPropName.trim()) return;

    try {
      setIsSubmittingProp(true);
      const created = await createProperty({
        name: newPropName.trim(),
        address: newPropAddress.trim(),
        city: newPropCity.trim(),
        state: "NJ",
        zip: newPropZip.trim(),
      });

      onShowToast(`Created property "${created.name}"!`);
      setNewPropName("");
      setNewPropAddress("");
      setNewPropCity("");
      setNewPropZip("");
      await onRefreshProperties();
      if (created.id) onSelectProperty(created.id);
    } catch (err) {
      console.error(err);
      onShowToast(`Error: ${err.message || "Failed to create property"}`);
    } finally {
      setIsSubmittingProp(false);
    }
  };

  const handleCreateArea = async (e) => {
    e.preventDefault();
    if (!currentProperty || !newAreaName.trim()) return;

    try {
      setIsSubmittingArea(true);
      const created = await createYardArea(currentProperty.id, {
        name: newAreaName.trim(),
        area_type: newAreaType,
        sun_exposure: newAreaSun,
        soil_type: newAreaSoil,
      });

      onShowToast(`Added "${created.name}" to ${currentProperty.name}!`);
      setNewAreaName("");
      await onRefreshProperties();
      if (created.id) onSelectArea(created.id);
    } catch (err) {
      console.error(err);
      onShowToast(`Error: ${err.message || "Failed to add yard area"}`);
    } finally {
      setIsSubmittingArea(false);
    }
  };

  // Collect all scans across all areas in the current property
  const allPropertyScans = [];
  currentProperty?.yard_areas?.forEach((area) => {
    area.yard_scans?.forEach((scan) => {
      allPropertyScans.push({
        ...scan,
        areaName: area.name,
      });
    });
  });

  // Sort newest first
  allPropertyScans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card property-manager-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0, marginBottom: "12px" }}>
          <div className="modal-title">
            <span>🏡</span>
            <span>Properties & Yard Areas</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="prop-manager-tabs">
          <button
            type="button"
            className={`prop-tab ${activeTab === "properties" ? "active" : ""}`}
            onClick={() => setActiveTab("properties")}
          >
            🏡 Homes & Addresses ({properties.length})
          </button>
          <button
            type="button"
            className={`prop-tab ${activeTab === "areas" ? "active" : ""}`}
            onClick={() => setActiveTab("areas")}
          >
            🌿 Yard Areas ({currentProperty?.yard_areas?.length || 0})
          </button>
          <button
            type="button"
            className={`prop-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            📊 Saved Audits ({allPropertyScans.length})
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="prop-manager-body" style={{ flex: "1 1 auto", overflowY: "auto", padding: "10px 4px 6px" }}>
          {/* TAB 1: PROPERTIES */}
          {activeTab === "properties" && (
            <div className="tab-pane">
              {/* Existing Properties */}
              <div className="prop-list-grid">
                {properties.map((prop) => {
                  const isSelected = prop.id === currentProperty?.id;
                  const totalAreas = prop.yard_areas?.length || 0;
                  const totalScans =
                    prop.yard_areas?.reduce((acc, a) => acc + (a.yard_scans?.length || 0), 0) || 0;

                  return (
                    <div
                      key={prop.id}
                      className={`prop-item-card ${isSelected ? "selected" : ""}`}
                      onClick={() => onSelectProperty(prop.id)}
                    >
                      <div className="prop-card-top">
                        <div className="prop-card-name">
                          <span>{isSelected ? "⭐️ " : "🏡 "}</span>
                          <strong>{prop.name}</strong>
                        </div>
                        {isSelected && <span className="active-badge">Active</span>}
                      </div>

                      <div className="prop-card-address">
                        {prop.address ? `${prop.address}, ` : ""}
                        {prop.city ? `${prop.city}, ` : ""}
                        {prop.state || "NJ"} {prop.zip || ""}
                      </div>

                      <div className="prop-card-footer">
                        <span>🌿 {totalAreas} Areas</span>
                        <span>📸 {totalScans} Audits</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Property Form */}
              <div className="prop-form-card">
                <div className="prop-form-title">
                  <span>➕ Add a New Property / Address</span>
                </div>
                <form onSubmit={handleCreateProperty} className="prop-grid-form">
                  <div className="form-group full-col">
                    <label>Property Name / Nickname *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Primary Home, Beach House, Rental Cottage"
                      value={newPropName}
                      onChange={(e) => setNewPropName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Street Address</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., 142 Nassau Street"
                      value={newPropAddress}
                      onChange={(e) => setNewPropAddress(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Princeton"
                      value={newPropCity}
                      onChange={(e) => setNewPropCity(e.target.value)}
                    />
                  </div>

                  <div className="form-group half-col">
                    <label>State</label>
                    <input
                      type="text"
                      className="form-input"
                      value="NJ"
                      disabled
                      style={{ opacity: 0.8, background: "#f1f5f9" }}
                    />
                  </div>

                  <div className="form-group half-col">
                    <label>Zip Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="08540"
                      value={newPropZip}
                      onChange={(e) => setNewPropZip(e.target.value)}
                    />
                  </div>

                  <div className="form-actions full-col">
                    <button
                      type="submit"
                      className="btn-camera"
                      disabled={isSubmittingProp || !newPropName.trim()}
                      style={{ width: "100%", justifyContent: "center", padding: "10px" }}
                    >
                      {isSubmittingProp ? "Creating Property..." : "Save Property"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: YARD AREAS */}
          {activeTab === "areas" && (
            <div className="tab-pane">
              <div className="area-current-prop-banner">
                <span>Managing Yard Areas for: <strong>{currentProperty?.name}</strong></span>
              </div>

              {/* Existing Areas */}
              <div className="area-list-grid">
                {currentProperty?.yard_areas?.map((area) => {
                  const isSelected = area.id === selectedAreaId;
                  const scans = area.yard_scans || [];
                  const latestScore = scans.length > 0 ? scans[scans.length - 1].native_score : null;

                  return (
                    <div
                      key={area.id}
                      className={`area-item-card ${isSelected ? "selected" : ""}`}
                      onClick={() => onSelectArea(area.id)}
                    >
                      <div className="area-card-header">
                        <div className="area-card-title">
                          <span>
                            {area.area_type === "front"
                              ? "🌲"
                              : area.area_type === "back"
                              ? "🌻"
                              : area.area_type === "side"
                              ? "🌿"
                              : "🌱"}
                          </span>
                          <strong>{area.name}</strong>
                        </div>
                        {latestScore !== null && (
                          <span className="score-mini-pill">{latestScore} pts</span>
                        )}
                      </div>

                      <div className="area-meta-row">
                        <span>☀️ {area.sun_exposure?.replace("_", " ")}</span>
                        <span>🌱 {area.soil_type}</span>
                        <span>📸 {scans.length} Scans</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Area Form */}
              <div className="prop-form-card" style={{ marginTop: "18px" }}>
                <div className="prop-form-title">
                  <span>➕ Add a New Yard Area</span>
                </div>
                <form onSubmit={handleCreateArea} className="prop-grid-form">
                  <div className="form-group full-col">
                    <label>Yard Area Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Side Woodland Edge, Front Walkway, Raised Beds"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Area Type</label>
                    <select
                      className="form-input"
                      value={newAreaType}
                      onChange={(e) => setNewAreaType(e.target.value)}
                    >
                      <option value="front">🌲 Front Yard</option>
                      <option value="back">🌻 Back Yard</option>
                      <option value="side">🌿 Side Yard</option>
                      <option value="patio">🪴 Patio / Deck</option>
                      <option value="garden">🌸 Pollinator Garden</option>
                      <option value="other">🌱 Other Zone</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Sunlight Exposure</label>
                    <select
                      className="form-input"
                      value={newAreaSun}
                      onChange={(e) => setNewAreaSun(e.target.value)}
                    >
                      <option value="full_sun">Full Sun (6+ hrs)</option>
                      <option value="partial_sun">Partial Sun (3-6 hrs)</option>
                      <option value="shade">Full Shade (&lt;3 hrs)</option>
                    </select>
                  </div>

                  <div className="form-actions full-col">
                    <button
                      type="submit"
                      className="btn-camera"
                      disabled={isSubmittingArea || !newAreaName.trim()}
                      style={{ width: "100%", justifyContent: "center", padding: "10px" }}
                    >
                      {isSubmittingArea ? "Adding Area..." : "Add Yard Area"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SAVED AUDITS & HISTORY */}
          {activeTab === "history" && (
            <div className="tab-pane">
              {allPropertyScans.length === 0 ? (
                <div className="history-empty-state">
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📷</div>
                  <div style={{ fontWeight: "700", fontSize: "15px" }}>No Saved Audits Yet</div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Scan a yard photo and click <strong>"Save to [Yard Area]"</strong> to start tracking your landscape's ecological progress over time!
                  </p>
                </div>
              ) : (
                <div className="history-scans-list">
                  {allPropertyScans.map((scan) => {
                    const formattedDate = new Date(scan.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <div key={scan.id} className="history-scan-card">
                        <div className="history-scan-thumb-wrap">
                          <img
                            src={scan.photo_url}
                            alt="Scan thumbnail"
                            className="history-scan-thumb"
                          />
                          <div className="history-scan-score-badge">
                            {scan.native_score} pts
                          </div>
                        </div>

                        <div className="history-scan-info">
                          <div className="history-scan-header">
                            <span className="history-scan-area">📍 {scan.areaName}</span>
                            <span className="history-scan-date">{formattedDate}</span>
                          </div>

                          <div className="history-scan-grade">
                            <strong>{scan.grade}</strong>
                          </div>

                          <div className="history-scan-counts">
                            <span className="count-tag green">🟢 {scan.native_count} Native</span>
                            <span className="count-tag gold">🌟 {scan.keystone_count} Keystone</span>
                            <span className="count-tag orange">🟠 {scan.non_native_count} Non-Native</span>
                            <span className="count-tag red">🔴 {scan.invasive_count} Invasive</span>
                          </div>

                          <button
                            type="button"
                            className="history-load-btn"
                            onClick={() => {
                              onLoadPastScan(scan);
                              onClose();
                            }}
                          >
                            <span>🔍 Open in Visualizer</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
