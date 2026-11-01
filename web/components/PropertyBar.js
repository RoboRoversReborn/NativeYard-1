"use client";

import { useMemo } from "react";

export default function PropertyBar({
  user,
  properties = [],
  selectedPropertyId,
  selectedAreaId,
  onSelectProperty,
  onSelectArea,
  onOpenManager,
  onSaveCurrentScan,
  isSavingScan,
  hasCurrentAnalysis,
  onSignIn,
}) {
  const currentProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || properties[0] || null;
  }, [properties, selectedPropertyId]);

  const currentArea = useMemo(() => {
    if (!currentProperty) return null;
    return (
      currentProperty.yard_areas?.find((a) => a.id === selectedAreaId) ||
      currentProperty.yard_areas?.[0] ||
      null
    );
  }, [currentProperty, selectedAreaId]);

  // If user is not signed in, show a friendly prompt with sample property context
  if (!user) {
    return (
      <div className="property-banner-guest">
        <div className="property-guest-text">
          <span className="property-guest-icon">🏡</span>
          <div>
            <strong>Organize by Property & Yard Area:</strong> Sign in with Google to name custom zones (e.g., <em>Back Yard, Front Garden, Side Yard</em>) and save multiple home addresses.
          </div>
        </div>
        <button
          type="button"
          className="btn-google-signin"
          onClick={onSignIn}
          style={{ padding: "5px 12px", fontSize: "12px", flexShrink: 0 }}
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="property-bar-container">
      {/* Property & Area Selectors */}
      <div className="property-bar-left">
        {/* Property Dropdown Selector */}
        <div className="property-selector-wrap">
          <label className="property-label">Active Property:</label>
          <div className="property-select-box">
            <span className="property-icon">🏡</span>
            <select
              className="property-dropdown"
              value={currentProperty?.id || ""}
              onChange={(e) => onSelectProperty(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.city ? `(${p.city}, ${p.state || "NJ"})` : ""}
                </option>
              ))}
              {properties.length === 0 && (
                <option value="">No properties yet</option>
              )}
            </select>
            <span className="dropdown-arrow">▼</span>
          </div>
        </div>

        {/* Yard Area Pills */}
        <div className="yard-areas-strip">
          <label className="property-label">Yard Area:</label>
          <div className="yard-pills-row">
            {currentProperty?.yard_areas?.map((area) => {
              const isActive = area.id === currentArea?.id;
              const scanCount = area.yard_scans?.length || 0;
              const latestScan = area.yard_scans?.[0];
              return (
                <button
                  key={area.id}
                  type="button"
                  className={`yard-area-pill ${isActive ? "active" : ""}`}
                  onClick={() => onSelectArea(area.id)}
                  title={`${area.name} (${scanCount} saved audits)`}
                >
                  <span className="area-icon">
                    {area.area_type === "front"
                      ? "🌲"
                      : area.area_type === "back"
                      ? "🌻"
                      : area.area_type === "side"
                      ? "🌿"
                      : "🌱"}
                  </span>
                  <span>{area.name}</span>
                  {scanCount > 0 && (
                    <span className="area-badge">
                      {latestScan ? `${latestScan.native_score} pts` : scanCount}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              className="yard-area-pill add-btn"
              onClick={onOpenManager}
              title="Add a new yard area or manage properties"
            >
              <span>+ Add Area</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons: Save Scan & Manage */}
      <div className="property-bar-right">
        {hasCurrentAnalysis && (
          <button
            type="button"
            className="btn-save-audit"
            onClick={onSaveCurrentScan}
            disabled={isSavingScan || !currentArea}
            title={
              currentArea
                ? `Save this photo & analysis to ${currentArea.name}`
                : "Select an area to save"
            }
          >
            {isSavingScan ? (
              <>⏳ Saving...</>
            ) : (
              <>
                <span>💾</span>
                <span>Save to {currentArea?.name || "Yard"}</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          className="btn-manage-properties"
          onClick={onOpenManager}
          title="Manage homes, addresses, and yard areas"
        >
          <span>⚙️</span>
          <span className="manage-btn-text">Manage Homes</span>
        </button>
      </div>
    </div>
  );
}
