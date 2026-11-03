"use client";

import { useState } from "react";
import { X, Home, Layers, Plus, Calendar, ArrowRight, Trash2, CheckCircle2 } from "lucide-react";
import type { Property, YardArea, YardScan } from "@/lib/types";

type PropertyManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  selectedProperty: Property | null;
  selectedArea: YardArea | null;
  onSelectProperty: (property: Property) => void;
  onSelectArea: (area: YardArea) => void;
  onCreateProperty: (data: { name: string; address: string; zip: string }) => Promise<void>;
  onCreateYardArea: (propertyId: string, data: { name: string; area_type: any }) => Promise<void>;
  onRestoreScan: (scan: YardScan) => void;
};

export function PropertyManagerModal({
  isOpen,
  onClose,
  properties,
  selectedProperty,
  selectedArea,
  onSelectProperty,
  onSelectArea,
  onCreateProperty,
  onCreateYardArea,
  onRestoreScan,
}: PropertyManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "new_prop" | "new_area">("overview");
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propZip, setPropZip] = useState("07645");
  const [areaName, setAreaName] = useState("");
  const [areaType, setAreaType] = useState<"front" | "back" | "side" | "patio" | "other">("back");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!isOpen) return null;

  const handleCreatePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propName.trim()) return;
    try {
      setLoading(true);
      await onCreateProperty({ name: propName, address: propAddress, zip: propZip });
      setPropName("");
      setPropAddress("");
      setActiveTab("overview");
      setMsg("Property created successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(err.message || "Failed to create property");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !areaName.trim()) return;
    try {
      setLoading(true);
      await onCreateYardArea(selectedProperty.id, { name: areaName, area_type: areaType });
      setAreaName("");
      setActiveTab("overview");
      setMsg("Yard area created successfully!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(err.message || "Failed to create yard area");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#ede7d5] bg-[#fbfaf4] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ede7d5] bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#163f2c] text-white">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#163f2c]">Property & Yard Area Manager</h3>
              <p className="text-xs text-[#8b9182]">Organize multiple yards and revisit audit timelines</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#8b9182] hover:bg-[#ede7d5] hover:text-[#163f2c]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#ede7d5] bg-[#fbfaf4] px-6">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "overview"
                ? "border-[#163f2c] text-[#163f2c]"
                : "border-transparent text-[#8b9182] hover:text-[#163f2c]"
            }`}
          >
            Properties & Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new_prop")}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "new_prop"
                ? "border-[#163f2c] text-[#163f2c]"
                : "border-transparent text-[#8b9182] hover:text-[#163f2c]"
            }`}
          >
            + New Property
          </button>
          {selectedProperty && (
            <button
              type="button"
              onClick={() => setActiveTab("new_area")}
              className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === "new_area"
                  ? "border-[#163f2c] text-[#163f2c]"
                  : "border-transparent text-[#8b9182] hover:text-[#163f2c]"
              }`}
            >
              + New Yard Area
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="max-h-[65vh] overflow-y-auto p-6">
          {msg && (
            <div className="mb-4 rounded-xl border border-[#3f7d45]/30 bg-[#3f7d45]/10 p-3 text-xs font-semibold text-[#163f2c]">
              {msg}
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Properties Grid */}
              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8b9182]">
                  Select Active Property
                </h4>
                {properties.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#ede7d5] p-6 text-center text-xs text-[#8b9182]">
                    No properties added yet. Click &quot;+ New Property&quot; above to add your first address.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {properties.map((prop) => {
                      const isSelected = selectedProperty?.id === prop.id;
                      return (
                        <div
                          key={prop.id}
                          onClick={() => onSelectProperty(prop)}
                          className={`cursor-pointer rounded-xl border p-3 transition-all ${
                            isSelected
                              ? "border-[#163f2c] bg-[#163f2c]/5 shadow-xs"
                              : "border-[#ede7d5] bg-white hover:border-[#163f2c]/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#163f2c]">{prop.name}</span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-[#3f7d45]" />}
                          </div>
                          <p className="text-[11px] text-[#8b9182] mt-0.5 truncate">
                            {prop.address || "New Jersey"} · ZIP {prop.zip || "07000"}
                          </p>
                          <div className="mt-2 text-[10px] text-[#3f7d45] font-semibold">
                            {prop.yard_areas?.length || 0} Yard Areas
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Yard Areas & Scan History */}
              {selectedProperty && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8b9182]">
                    Yard Areas & Scan History ({selectedProperty.name})
                  </h4>
                  <div className="space-y-3">
                    {selectedProperty.yard_areas?.map((area) => {
                      const isSelectedArea = selectedArea?.id === area.id;
                      const scans = area.yard_scans || [];
                      return (
                        <div
                          key={area.id}
                          className={`rounded-xl border p-3 ${
                            isSelectedArea
                              ? "border-[#3f7d45] bg-white shadow-xs"
                              : "border-[#ede7d5] bg-[#fbfaf4]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#163f2c]">{area.name}</span>
                              <span className="rounded-full bg-[#ede7d5] px-2 py-0.5 text-[9px] font-semibold text-[#163f2c]">
                                {area.area_type}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectArea(area)}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isSelectedArea
                                  ? "bg-[#163f2c] text-[#d7f27a]"
                                  : "bg-[#ede7d5] text-[#163f2c] hover:bg-[#e0d8bf]"
                              }`}
                            >
                              {isSelectedArea ? "Active Area" : "Set Active"}
                            </button>
                          </div>

                          {/* Scans Timeline */}
                          {scans.length === 0 ? (
                            <p className="text-[11px] text-[#8b9182] italic">
                              No saved scans for this yard area yet. Audit this bed and click &quot;Save to Yard&quot;.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-1.5 border-t border-[#ede7d5] pt-2">
                              {scans.map((scan) => (
                                <div
                                  key={scan.id}
                                  className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-[#ede7d5]"
                                >
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-[#8b9182]" />
                                    <span className="font-medium text-[#163f2c]">
                                      {new Date(scan.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="rounded-full bg-[#d7f27a] px-2 py-0.5 text-[10px] font-bold text-[#163f2c]">
                                      {scan.native_score}/100
                                    </span>
                                    <span className="text-[11px] text-[#8b9182]">
                                      {scan.plants_count} plants ({scan.invasive_count} invasive)
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onRestoreScan(scan);
                                      onClose();
                                    }}
                                    className="flex items-center gap-1 rounded bg-[#163f2c] px-2 py-1 text-[10px] font-bold text-[#d7f27a] hover:bg-[#1e4d37]"
                                    title="Load this scan's photo and bounding boxes onto the visualizer"
                                  >
                                    Restore Scan
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "new_prop" && (
            <form onSubmit={handleCreatePropertySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#163f2c] mb-1">
                  Property Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Residence or Mountain Retreat"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#163f2c] mb-1">
                  Street Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104 Oak Ridge Road"
                  value={propAddress}
                  onChange={(e) => setPropAddress(e.target.value)}
                  className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#163f2c] mb-1">
                  NJ ZIP Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="07645"
                  value={propZip}
                  onChange={(e) => setPropZip(e.target.value)}
                  className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn w-full bg-[#163f2c] text-[#d7f27a] font-bold py-2.5 text-xs hover:bg-[#1e4d37]"
              >
                {loading ? "Creating..." : "Save Property"}
              </button>
            </form>
          )}

          {activeTab === "new_area" && selectedProperty && (
            <form onSubmit={handleCreateAreaSubmit} className="space-y-4">
              <div className="rounded-xl bg-[#163f2c]/5 p-3 text-xs text-[#163f2c]">
                Adding yard area to: <strong>{selectedProperty.name}</strong>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#163f2c] mb-1">
                  Yard Area Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. South Perennial Bed, Shady Woodland Edge, Patio Island"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#163f2c] mb-1">
                  Area Type
                </label>
                <select
                  value={areaType}
                  onChange={(e: any) => setAreaType(e.target.value)}
                  className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
                >
                  <option value="front">Front Yard</option>
                  <option value="back">Back Yard</option>
                  <option value="side">Side Garden</option>
                  <option value="patio">Patio / Container Bed</option>
                  <option value="other">Woodland / Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn w-full bg-[#163f2c] text-[#d7f27a] font-bold py-2.5 text-xs hover:bg-[#1e4d37]"
              >
                {loading ? "Creating..." : "Save Yard Area"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
