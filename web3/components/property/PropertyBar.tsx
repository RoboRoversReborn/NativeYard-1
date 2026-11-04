"use client";

import { useState } from "react";
import {
  Home,
  Layers,
  Plus,
  Save,
  User,
  LogIn,
  ChevronDown,
  Check,
  Camera,
  UploadCloud,
  Sparkles,
} from "lucide-react";
import type { Property, YardArea } from "@/lib/types";

type PropertyBarProps = {
  properties: Property[];
  selectedProperty: Property | null;
  selectedArea: YardArea | null;
  onSelectProperty: (property: Property) => void;
  onSelectArea: (area: YardArea) => void;
  onOpenPropertyManager: () => void;
  onSaveCurrentScan: () => Promise<void>;
  isSavingScan: boolean;
  canSaveScan: boolean;
  user: any;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onTriggerCamera?: () => void;
  onTriggerUpload?: () => void;
  onSelectSampleYard?: (key: "front-yard" | "back-yard" | "side-yard") => void;
  selectedSampleKey?: string;
};

export function PropertyBar({
  properties,
  selectedProperty,
  selectedArea,
  onSelectProperty,
  onSelectArea,
  onOpenPropertyManager,
  onSaveCurrentScan,
  isSavingScan,
  canSaveScan,
  user,
  onOpenAuth,
  onSignOut,
  onTriggerCamera,
  onTriggerUpload,
  onSelectSampleYard,
  selectedSampleKey,
}: PropertyBarProps) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <div className="no-print w-full border-b border-[#e2dec9] bg-[#faf9f5]/95 backdrop-blur-md sticky top-14 sm:top-16 z-30 transition-all">
      <div className="container-shell flex flex-wrap items-center justify-between gap-3 py-2.5">
        {/* Left: Property & Area Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              {/* Property Selector */}
              <div className="flex items-center gap-1.5 rounded-lg border border-[#ede7d5] bg-white px-2.5 py-1 text-xs text-[#163f2c] shadow-xs">
                <Home className="h-3.5 w-3.5 text-[#3f7d45]" />
                {properties.length > 0 ? (
                  <select
                    value={selectedProperty?.id || ""}
                    onChange={(e) => {
                      const prop = properties.find((p) => p.id === e.target.value);
                      if (prop) onSelectProperty(prop);
                    }}
                    className="bg-transparent font-bold focus:outline-none cursor-pointer max-w-[160px] truncate"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold">No property</span>
                )}
                <button
                  type="button"
                  onClick={onOpenPropertyManager}
                  className="ml-1 text-[11px] font-semibold text-[#3f7d45] hover:underline"
                >
                  Manage
                </button>
              </div>

              {/* Yard Area Tabs */}
              {selectedProperty?.yard_areas && selectedProperty.yard_areas.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                  {selectedProperty.yard_areas.map((area) => {
                    const isSelected = selectedArea?.id === area.id;
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => onSelectArea(area)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-all ${
                          isSelected
                            ? "bg-[#163f2c] text-[#d7f27a] shadow-xs"
                            : "bg-white text-[#163f2c] border border-[#ede7d5] hover:bg-[#ede7d5]/50"
                        }`}
                      >
                        {area.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={onOpenPropertyManager}
                    className="flex items-center gap-0.5 rounded-full border border-dashed border-[#8b9182] px-2 py-0.5 text-[10px] text-[#8b9182] hover:border-[#163f2c] hover:text-[#163f2c]"
                    title="Add new yard area"
                  >
                    <Plus className="h-3 w-3" />
                    Area
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#8b9182]">
              <span className="flex h-2 w-2 rounded-full bg-[#3f7d45]" />
              <span>Sign in above to save yard areas &amp; track historical scans</span>
            </div>
          )}
        </div>

        {/* Right: Quick Capture, 3 Sample Yards & Save Scan */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 3 Sample Yards Quick Switcher */}
          {onSelectSampleYard && (
            <div className="hidden sm:flex items-center gap-1 bg-[#ede7d5]/50 p-1 rounded-xl border border-[#ede7d5]">
              <span className="text-[10px] font-bold text-[#8b9182] px-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#3f7d45]" />
                Demo Yards:
              </span>
              <button
                type="button"
                onClick={() => onSelectSampleYard("front-yard")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  selectedSampleKey === "front-yard"
                    ? "bg-[#163f2c] text-[#d7f27a] shadow-xs"
                    : "text-[#163f2c] hover:bg-white"
                }`}
                title="Suburban Front Yard sample with Oak and Barberry"
              >
                Front Yard
              </button>
              <button
                type="button"
                onClick={() => onSelectSampleYard("back-yard")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  selectedSampleKey === "back-yard"
                    ? "bg-[#163f2c] text-[#d7f27a] shadow-xs"
                    : "text-[#163f2c] hover:bg-white"
                }`}
                title="Pollinator Backyard sample with Milkweed and Ivy"
              >
                Backyard
              </button>
              <button
                type="button"
                onClick={() => onSelectSampleYard("side-yard")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                  selectedSampleKey === "side-yard"
                    ? "bg-[#163f2c] text-[#d7f27a] shadow-xs"
                    : "text-[#163f2c] hover:bg-white"
                }`}
                title="Woodland Edge sample with Dogwood and Callery Pear"
              >
                Side Yard
              </button>
            </div>
          )}

          {/* Quick Photo & Upload Triggers */}
          {onTriggerCamera && (
            <button
              type="button"
              onClick={onTriggerCamera}
              className="btn bg-white text-[#163f2c] border border-[#ede7d5] hover:bg-[#ede7d5]/40 px-2.5 py-1 text-xs font-bold shadow-xs"
              title="Snap a photo with your camera"
            >
              <Camera className="h-3.5 w-3.5 text-[#3f7d45]" />
              <span className="hidden sm:inline">Take</span> Snap
            </button>
          )}

          {onTriggerUpload && (
            <button
              type="button"
              onClick={onTriggerUpload}
              className="btn bg-white text-[#163f2c] border border-[#ede7d5] hover:bg-[#ede7d5]/40 px-2.5 py-1 text-xs font-bold shadow-xs"
              title="Upload an image file from your device"
            >
              <UploadCloud className="h-3.5 w-3.5 text-[#3f7d45]" />
              Upload
            </button>
          )}

          {canSaveScan && user && (
            <button
              type="button"
              onClick={onSaveCurrentScan}
              disabled={isSavingScan}
              className="btn bg-[#d7f27a] text-[#163f2c] font-bold px-3 py-1.5 text-xs shadow-xs hover:bg-[#e2f796]"
            >
              <Save className="h-3.5 w-3.5" />
              {isSavingScan ? "Saving..." : `Save to ${selectedArea?.name || "Yard"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
