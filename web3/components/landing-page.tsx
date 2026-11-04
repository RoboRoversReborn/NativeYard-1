/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bird,
  Bug,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Flower2,
  Home,
  Leaf,
  LogIn,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TreePine,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { AppHeader } from "./AppHeader";
import { Brand } from "./brand";
import { StatusBadge } from "./status-badge";
import {
  buildSamplePreview,
  getPlant,
  isNjZip,
  NJ_DATA_VERSION,
  regionForZip,
} from "@/lib/plants";
import {
  SAMPLE_YARDS,
  buildSampleAudit,
  SampleYardKey,
} from "@/lib/sampleDetections";
import type { Property, YardArea } from "@/lib/types";

type LandingPageProps = {
  photo: string | null;
  zip: string;
  error: string;
  isSample: boolean;
  onPhoto: (file: File) => void;
  onSample: () => void;
  onSelectSample?: (key: "front-yard" | "back-yard" | "side-yard") => void;
  onLaunchSample?: (key?: "front-yard" | "back-yard" | "side-yard") => void;
  selectedSampleKey?: string;
  onClearPhoto: () => void;
  onZip: (value: string) => void;
  onStart: () => void;
  onTriggerCamera?: () => void;
  user?: any;
  properties?: Property[];
  selectedProperty?: Property | null;
  selectedArea?: YardArea | null;
  onSelectProperty?: (property: Property) => void;
  onSelectArea?: (area: YardArea) => void;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenPropertyManager?: () => void;
};

export function LandingPage({
  photo,
  zip,
  error,
  isSample,
  onPhoto,
  onSample,
  onSelectSample,
  onLaunchSample,
  selectedSampleKey,
  onClearPhoto,
  onZip,
  onStart,
  onTriggerCamera,
  user,
  properties = [],
  selectedProperty = null,
  selectedArea = null,
  onSelectProperty,
  onSelectArea,
  onOpenAuth,
  onSignOut,
  onOpenPropertyManager,
}: LandingPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [launchpadMode, setLaunchpadMode] = useState<"upload" | "sample">(isSample ? "sample" : "upload");
  const region = regionForZip(zip);
  const zipInvalid = zip.length === 5 && !isNjZip(zip);
  const currentKey: SampleYardKey = (selectedSampleKey as SampleYardKey) || "front-yard";
  const currentSampleConfig = SAMPLE_YARDS[currentKey] || SAMPLE_YARDS["front-yard"];
  const sample = useMemo(() => buildSampleAudit(currentKey, zip), [currentKey, zip]);

  const handleLaunch = (key?: SampleYardKey) => {
    const targetKey = key || currentKey;
    if (onLaunchSample) {
      onLaunchSample(targetKey);
    } else {
      onSample();
    }
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#faf9f5] text-[#18231c]">
      <AppHeader
        stage="landing"
        user={user}
        onOpenAuth={onOpenAuth}
        onSignOut={onSignOut}
        onOpenPropertyManager={onOpenPropertyManager}
      />

      <main>
        <section className="hero" id="top">
          <div className="hero-glow hero-glow--one" />
          <div className="hero-glow hero-glow--two" />
          <div className="container-shell relative z-10 py-8 sm:py-12 lg:py-16">
            {/* Hero Top Copy */}
            <div className="mx-auto max-w-3xl text-center">
              <div className="eyebrow mb-4 inline-flex items-center gap-2 rounded-full border border-[#d8d3bf] bg-[#fbfaf4]/90 px-3.5 py-1.5 text-xs text-[#425445] backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6c9a62] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3f7d45]" />
                </span>
                {user ? (
                  <span>
                    Welcome back, <strong>{user.email?.split("@")[0]}</strong> · NativeYard NJ Homeowner
                  </span>
                ) : (
                  <span>A New Jersey yard audit for the living world</span>
                )}
              </div>

              <h1 className="font-display text-[clamp(2.75rem,5.5vw,4.75rem)] font-semibold leading-[0.93] tracking-[-0.05em] text-[#163f2c]">
                See your yard through{" "}
                <span className="italic text-[#4f7c4a]">nature&apos;s</span> eyes.
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-[0.98rem] leading-7 text-[#536257] sm:text-[1.08rem] sm:leading-8">
                One photo. A New Jersey plant-by-plant audit that separates keystone natives
                from regulated invasives—handing you a tailored plan that feeds birds and pollinators.
              </p>

              {/* Status & Trust Badges */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#bcd79a] bg-[#edf3e3] px-3.5 py-1.5 text-xs text-[#163f2c]">
                  <span className="flex h-2 w-2 rounded-full bg-[#2f7d3a]" />
                  <span className="font-bold">Instant Free Audit</span>
                  <span className="text-[#a5b89a]">•</span>
                  <span className="text-[#556950]">No sign-up required to scan</span>
                </div>

                {user ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#bcd79a] bg-white px-3.5 py-1.5 text-xs font-bold text-[#2f7d3a]">
                    <span>💾 Historical Progress Active</span>
                    <span className="text-[#a5b89a]">•</span>
                    <span className="font-normal text-[#556950]">Scans auto-save to your account</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d8d3bf] bg-[#fbfaf4] px-3.5 py-1.5 text-xs text-[#56665a]">
                    <span className="text-xs">💾</span>
                    <span>Sign in anytime to save &amp; reload over seasons</span>
                  </div>
                )}
              </div>
            </div>

            {/* UNIFIED ALL-IN-ONE AUDIT LAUNCHPAD CARD */}
            <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-[2rem] border border-[#d8d3bf] bg-[#fbfaf4] shadow-[0_24px_70px_rgba(45,61,42,0.12)]" id="audit">
              {/* Segmented Mode Switcher */}
              <div className="flex border-b border-[#e8e4d5] bg-[#f2efe4] p-1.5 sm:p-2 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setLaunchpadMode("upload")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    launchpadMode === "upload"
                      ? "bg-[#163f2c] text-[#d7f27a] shadow-xs"
                      : "bg-transparent text-[#5d6b60] hover:bg-[#e5e0d1] hover:text-[#163f2c]"
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload Your Yard Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLaunchpadMode("sample")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    launchpadMode === "sample"
                      ? "bg-[#163f2c] text-[#d7f27a] shadow-xs"
                      : "bg-transparent text-[#5d6b60] hover:bg-[#e5e0d1] hover:text-[#163f2c]"
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Try 3 Live NJ Sample Yards</span>
                </button>
              </div>

              {/* Mode 1: Upload Your Yard Photo */}
              {launchpadMode === "upload" && (
                <div className="p-5 sm:p-7 space-y-4 animate-fade-in">
                  {/* Property & Area Target Bar (Signed In Users Only) */}
                  {user && (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#bcd79a] bg-[#edf3e3] p-3 text-xs text-[#163f2c]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Home className="h-4 w-4 text-[#2f7d3a]" />
                          Saving scan to:
                        </span>
                        {properties.length > 0 ? (
                          <select
                            value={selectedProperty?.id || ""}
                            onChange={(e) => {
                              const p = properties.find((item) => item.id === e.target.value);
                              if (p && onSelectProperty) onSelectProperty(p);
                            }}
                            className="rounded-lg border border-[#bcd79a] bg-white px-2.5 py-1 text-xs font-bold text-[#163f2c] focus:outline-none"
                          >
                            {properties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-bold">Primary Residence</span>
                        )}

                        {selectedProperty?.yard_areas && selectedProperty.yard_areas.length > 0 && (
                          <select
                            value={selectedArea?.id || ""}
                            onChange={(e) => {
                              const a = selectedProperty.yard_areas?.find((item) => item.id === e.target.value);
                              if (a && onSelectArea) onSelectArea(a);
                            }}
                            className="rounded-lg border border-[#bcd79a] bg-white px-2.5 py-1 text-xs font-bold text-[#163f2c] focus:outline-none"
                          >
                            {selectedProperty.yard_areas.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {onOpenPropertyManager && (
                        <button
                          type="button"
                          onClick={onOpenPropertyManager}
                          className="font-bold text-[#2f7d3a] hover:underline text-[11px]"
                        >
                          Manage Properties &amp; Past Scans
                        </button>
                      )}
                    </div>
                  )}

                  {/* Dropzone Container */}
                  <div
                    className={`dropzone ${dragging ? "is-dragging" : ""} ${
                      photo ? "has-photo" : ""
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      const file = event.dataTransfer.files?.[0];
                      if (file) onPhoto(file);
                    }}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        inputRef.current?.click();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload a yard photo"
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onPhoto(file);
                        event.target.value = "";
                      }}
                    />

                    {photo ? (
                      <>
                        <img
                          src={photo}
                          alt="Selected yard preview"
                          className="dropzone__preview"
                        />
                        <div className="dropzone__overlay">
                          <div className="flex items-center gap-2 rounded-full bg-[#f7f4e9]/95 px-3 py-1.5 text-[0.72rem] font-bold text-[#163f2c] shadow-sm">
                            <Check className="h-3.5 w-3.5 text-[#3f7d45]" />
                            {isSample ? "Sample yard loaded" : "Photo ready to audit"}
                          </div>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#163f2c]/80 text-[#f7f4e9] backdrop-blur transition hover:bg-[#163f2c]"
                            onClick={(event) => {
                              event.stopPropagation();
                              onClearPhoto();
                            }}
                            aria-label="Remove photo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center px-5 py-8 text-center">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e7efdc] text-[#3f7d45]">
                          <UploadCloud className="h-6 w-6" />
                        </span>
                        <p className="mt-3 text-sm font-bold text-[#263b2b]">
                          Drop your yard photo here, or click to browse
                        </p>
                        <p className="mt-1 text-xs text-[#7a806e]">
                          Wide-angle daytime photos of your garden bed work best
                        </p>

                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              inputRef.current?.click();
                            }}
                            className="btn bg-[#163f2c] text-[#d7f27a] font-bold text-xs px-4 py-2 hover:bg-[#1e4d37] shadow-xs"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                            Choose Photo File
                          </button>
                          {onTriggerCamera && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTriggerCamera();
                              }}
                              className="btn bg-white text-[#163f2c] border border-[#ede7d5] font-bold text-xs px-4 py-2 hover:bg-[#ede7d5]/50 shadow-xs"
                            >
                              <Camera className="h-3.5 w-3.5 text-[#3f7d45]" />
                              Take Snap with Camera
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ZIP & Action Row */}
                  <div className="flex flex-col gap-2.5 sm:flex-row pt-1">
                    <label className="zip-field flex-1">
                      <MapPin className="h-4 w-4 shrink-0 text-[#6b7a68]" />
                      <span className="sr-only">ZIP code</span>
                      <input
                        name="yard-location-code"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={zip}
                        onChange={(event) =>
                          onZip(event.target.value.replace(/\D/g, "").slice(0, 5))
                        }
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="NJ ZIP"
                        aria-label="Yard ZIP code"
                      />
                      <span className="whitespace-nowrap text-[0.64rem] font-bold uppercase tracking-[0.1em] text-[#8b9182]">
                        {region.county && region.county !== "New Jersey"
                          ? `${region.county} County`
                          : `Zone ${region.zone}`}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={onStart}
                      className="btn btn-lime justify-center px-6 py-3 text-xs sm:text-sm font-bold sm:min-w-[12rem]"
                    >
                      Audit my yard now
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>

                  {zipInvalid ? (
                    <p className="rounded-xl bg-[#fae8e1] px-3 py-2 text-[0.76rem] font-semibold text-[#a34832]">
                      NativeYard NJ is calibrated for New Jersey ZIP codes (07000–08999). Try 07645 for the sample region.
                    </p>
                  ) : region.notice ? (
                    <p className="rounded-xl bg-[#faf1dc] px-3 py-2 text-[0.72rem] font-semibold leading-5 text-[#7b6228]">
                      {region.notice}
                    </p>
                  ) : null}

                  {error ? (
                    <p className="rounded-xl bg-[#fae8e1] px-3 py-2 text-[0.76rem] font-semibold text-[#a34832]">
                      {error}
                    </p>
                  ) : null}

                  {/* Footer Context / Privacy Line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ede7d5] pt-3 text-[0.72rem] text-[#6b7a68]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#2f7d3a]" />
                      {user
                        ? `Authenticated as ${user.email} · Scans auto-save to your account`
                        : "Runs instantly in your browser session"}
                    </span>
                    {!user && onOpenAuth && (
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="font-bold text-[#163f2c] hover:text-[#2f7d3a] underline underline-offset-2"
                      >
                        Want to save &amp; reload later? Sign in
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Try Live NJ Sample Yards */}
              {launchpadMode === "sample" && (
                <div className="p-5 sm:p-7 space-y-4 animate-fade-in">
                  {/* Scenario switcher pills */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {(["front-yard", "back-yard", "side-yard"] as const).map((key) => {
                      const cfg = SAMPLE_YARDS[key];
                      const isSelected = currentKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onSelectSample?.(key)}
                          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-2.5 rounded-xl text-xs font-bold transition ${
                            isSelected
                              ? "bg-[#163f2c] text-[#d7f27a] shadow-sm ring-1 ring-[#163f2c]"
                              : "bg-[#ede7d5]/60 text-[#3a4d3f] hover:bg-[#ede7d5] border border-[#d8d3bf]/60"
                          }`}
                        >
                          <span>{key === "front-yard" ? "🏡 Front Yard" : key === "back-yard" ? "🌸 Backyard" : "🌲 Side Yard"}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected ? "bg-[#25523b] text-[#d7f27a]" : "bg-black/5 text-[#5d6b60]"
                            }`}
                          >
                            Score {cfg.initialScore}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Sample Photo Preview */}
                  <div
                    onClick={() => handleLaunch(currentKey)}
                    className="relative h-[22rem] sm:h-[25rem] w-full overflow-hidden rounded-2xl border border-[#d8d3bf] bg-[#dfe7d3] shadow-md cursor-pointer group"
                    title={`Click to open ${currentSampleConfig.name} audit report`}
                  >
                    <img
                      src={currentSampleConfig.filename}
                      alt={currentSampleConfig.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10291d]/80 via-transparent to-[#10291d]/20" />

                    <div className="absolute left-3.5 top-3.5 flex items-center gap-2 rounded-full border border-white/20 bg-[#10291d]/85 px-3 py-1.5 text-xs font-bold text-[#f7f4e9] backdrop-blur">
                      <ScanLine className="h-3.5 w-3.5 text-[#d7f27a]" />
                      <span>{currentSampleConfig.name}</span>
                    </div>

                    <div className="absolute right-3.5 top-3.5 hidden sm:flex items-center gap-1.5 rounded-full border border-white/20 bg-[#10291d]/85 px-3 py-1.5 text-[11px] font-bold text-[#d7f27a] backdrop-blur transition group-hover:bg-[#163f2c]">
                      <span>Open audit</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>

                    {/* Floating Sample Plant Tags */}
                    {sample.detections.slice(0, 3).map((det, idx) => {
                      const plant = getPlant(det.plantId);
                      if (!plant) return null;
                      const chipClass =
                        plant.status === "invasive"
                          ? "detection-chip--invasive"
                          : plant.status === "keystone"
                            ? "detection-chip--keystone"
                            : "detection-chip--native";
                      const posClass =
                        idx === 0
                          ? "right-4 top-[22%]"
                          : idx === 1
                            ? "left-[8%] top-[38%]"
                            : "right-[12%] top-[48%]";

                      return (
                        <div key={det.id} className={`absolute ${posClass} detection-chip ${chipClass}`}>
                          <span className="detection-chip__dot" />
                          {plant.commonName}
                          <span className="detection-chip__status">
                            {plant.status === "keystone" ? "Keystone" : plant.status === "invasive" ? "Invasive" : "Native"}
                          </span>
                        </div>
                      );
                    })}

                    {/* Clean Score Bar Overlay */}
                    <div className="absolute inset-x-3.5 bottom-3.5 rounded-xl border border-white/20 bg-[#f7f4e9]/95 p-3.5 shadow-xl backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-[#7a806e]">
                            Yard biodiversity score
                          </p>
                          <p className="mt-0.5 font-display text-2xl font-bold text-[#163f2c]">
                            {sample.score}
                            <span className="text-xs font-normal text-[#8b9182]">/100</span>
                          </p>
                        </div>
                        <span className="rounded-full bg-[#faf1dc] px-2.5 py-1 text-[0.65rem] font-bold uppercase text-[#a87a2c]">
                          {sample.scoreLabel}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-[#6b7a68]">
                        <span>{sample.detections.length} plants cataloged</span>
                        <span>{sample.swaps.length} native replacements</span>
                      </div>
                    </div>
                  </div>

                  {/* Single Minimalistic Action Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleLaunch(currentKey)}
                      className="btn btn-lime w-full justify-center py-3.5 text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Open {currentSampleConfig.name} Audit Report</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-y border-[#ddd8c7] bg-[#f0ecdf]">
          <div className="container-shell grid grid-cols-2 gap-x-6 gap-y-7 py-8 sm:grid-cols-4 sm:py-10">
            {[
              ["40M", "acres of lawn across the U.S."],
              ["96%", "of land birds feed insects to young"],
              ["500+", "caterpillar species on one white oak"],
              ["1 photo", "to start your yard's transition"],
            ].map(([stat, label]) => (
              <div key={label}>
                <p className="font-display text-[1.8rem] font-semibold tracking-[-0.04em] text-[#163f2c] sm:text-[2.2rem]">
                  {stat}
                </p>
                <p className="mt-1 max-w-[12rem] text-[0.72rem] leading-5 text-[#6b7a68]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="section-pad">
          <div className="container-shell">
            <div className="max-w-[42rem]">
              <p className="eyebrow text-[#6b7a68]">How it works</p>
              <h2 className="mt-3 font-display text-[clamp(2.4rem,4.4vw,3.7rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-[#163f2c]">
                A yard audit in three acts.
              </h2>
              <p className="mt-4 max-w-[35rem] text-[0.98rem] leading-7 text-[#5d6b60]">
                No plant taxonomy degree required. NativeYard reads the photo,
                matches species to your New Jersey physiographic province, and
                turns the results into a plan you can actually do this weekend.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: Camera,
                  title: "Snap your yard",
                  copy: "Take one wide photo from a corner or upload a panorama. Include trees, hedges, beds, and the ground layer.",
                  color: "#3f7d45",
                },
                {
                  step: "02",
                  icon: ScanLine,
                  title: "Read the ecology",
                  copy: "We tag each plant as a NJ keystone native, native, low-risk non-native, regulated invasive, or watchlist invasive—calibrated to your ZIP and physiographic province.",
                  color: "#a87a2c",
                },
                {
                  step: "03",
                  icon: FileText,
                  title: "Get the plan",
                  copy: "Download a prioritized removal protocol and a 1-to-1 native swap blueprint, with planting windows and local nursery leads.",
                  color: "#b6533d",
                },
              ].map((item) => (
                <article
                  key={item.step}
                  className="group rounded-[1.6rem] border border-[#d9d4c4] bg-[#fbfaf4] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(45,61,42,0.09)]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-full"
                      style={{ background: `${item.color}16`, color: item.color }}
                    >
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-[1.55rem] font-semibold text-[#d6d2c2]">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-[#163f2c]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[0.84rem] leading-6 text-[#667368]">
                    {item.copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="verdicts" className="section-pad border-y border-[#ddd8c7] bg-[#f0ecdf]">
          <div className="container-shell">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="eyebrow text-[#6b7a68]">Every plant gets a verdict</p>
                <h2 className="mt-3 font-display text-[clamp(2.35rem,4vw,3.4rem)] font-semibold leading-[1] tracking-[-0.045em] text-[#163f2c]">
                  Not all green is good.
                </h2>
              </div>
              <p className="max-w-[35rem] text-[0.94rem] leading-7 text-[#5d6b60] lg:justify-self-end">
                A plant can be beautiful, well-behaved, and still ecologically
                empty. NativeYard separates visual appeal from habitat value so
                you can make trade-offs with your eyes open.
              </p>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  status: "keystone" as const,
                  title: "NJ keystone native",
                  copy: "Supports 90%+ of local caterpillar species. These are the plants that hold the New Jersey food web together.",
                  action: "Preserve & celebrate",
                  icon: TreePine,
                },
                {
                  status: "native" as const,
                  title: "New Jersey native",
                  copy: "Occurred here before European settlement. Good habitat value and adapted to local rainfall and soils.",
                  action: "Preserve",
                  icon: Leaf,
                },
                {
                  status: "non-native" as const,
                  title: "Non-native, low risk",
                  copy: "An introduced ornamental that is not currently listed as invasive in NJ. Fine to keep, but an optional upgrade.",
                  action: "Optional swap",
                  icon: Flower2,
                },
                {
                  status: "invasive" as const,
                  title: "NJ regulated invasive",
                  copy: "Spreads aggressively, displaces native flora, and degrades habitat. Removal is the highest-leverage action.",
                  action: "Prioritize removal",
                  icon: Bug,
                },
              ].map((item) => (
                <article
                  key={item.status}
                  className="rounded-[1.4rem] border border-[#d9d4c4] bg-[#fbfaf4] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <StatusBadge status={item.status} />
                    <item.icon className="h-5 w-5 text-[#a8ad9e]" />
                  </div>
                  <h3 className="mt-4 font-display text-[1.22rem] font-semibold tracking-[-0.025em] text-[#163f2c]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[0.8rem] leading-6 text-[#667368]">
                    {item.copy}
                  </p>
                  <p className="mt-4 border-t border-[#e4dfd0] pt-3 text-[0.66rem] font-bold uppercase tracking-[0.11em] text-[#7a806e]">
                    {item.action}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="keystone" className="section-pad">
          <div className="container-shell grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.8rem] border border-[#d9d2bc]">
                <Image
                  src="/images/garden-lush.jpg"
                  alt="A dense garden with layers of foliage and flowers"
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10291d]/55 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                  <p className="max-w-[16rem] font-display text-[1.35rem] leading-tight text-[#f7f4e9]">
                    Plant the plants that feed the most mouths.
                  </p>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d7f27a] text-[#163f2c]">
                    <Leaf className="h-4 w-4" />
                  </span>
                </div>
              </div>
              <div className="absolute -right-3 -top-3 hidden rounded-2xl border border-[#d8d3bf] bg-[#fbfaf4] px-4 py-3 shadow-lg sm:block">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.11em] text-[#7a806e]">
                  Native plant power
                </p>
                <p className="mt-1 font-display text-xl font-semibold text-[#163f2c]">
                  90% of caterpillars
                </p>
              </div>
            </div>

            <div>
              <p className="eyebrow text-[#6b7a68]">Why native, why now</p>
              <h2 className="mt-3 font-display text-[clamp(2.35rem,4.2vw,3.55rem)] font-semibold leading-[0.99] tracking-[-0.045em] text-[#163f2c]">
                A pollinator garden is a food web, not a flower bed.
              </h2>
              <p className="mt-4 text-[0.96rem] leading-7 text-[#5d6b60]">
                Most caterpillars can eat only a few native plant lineages.
                Replace those plants with exotic ornamentals and the insects
                disappear—followed by the birds that need them. Keystone natives
                do the heaviest lifting.
              </p>

              <div className="mt-6 space-y-2.5">
                {[
                  {
                    name: "White Oak",
                    latin: "Quercus alba",
                    value: "500+",
                    label: "caterpillar species",
                    icon: TreePine,
                  },
                  {
                    name: "Wrinkleleaf Goldenrod",
                    latin: "Solidago rugosa",
                    value: "115+",
                    label: "caterpillar species",
                    icon: Flower2,
                  },
                  {
                    name: "Highbush Blueberry",
                    latin: "Vaccinium corymbosum",
                    value: "211+",
                    label: "caterpillar species",
                    icon: Leaf,
                  },
                ].map((plant) => (
                  <div
                    key={plant.name}
                    className="flex items-center gap-4 rounded-2xl border border-[#d9d4c4] bg-[#fbfaf4] px-4 py-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e7efdc] text-[#3f7d45]">
                      <plant.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.85rem] font-bold text-[#263b2b]">
                        {plant.name}
                      </p>
                      <p className="text-[0.7rem] italic text-[#8b9182]">
                        {plant.latin}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[1.15rem] font-semibold leading-none text-[#3f7d45]">
                        {plant.value}
                      </p>
                      <p className="mt-1 text-[0.6rem] uppercase tracking-[0.08em] text-[#8b9182]">
                        {plant.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="#audit"
                className="mt-6 inline-flex items-center gap-2 text-[0.82rem] font-bold text-[#3f7d45] underline decoration-[#b9d19a] decoration-2 underline-offset-4 transition hover:text-[#163f2c]"
              >
                See what your yard is missing
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="container-shell relative overflow-hidden rounded-[2rem] bg-[#163f2c] px-6 py-12 text-[#f7f4e9] sm:px-10 sm:py-16">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#d7f27a]/15 blur-2xl" />
            <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#a9c67a]/10 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="eyebrow text-[#a9c67a]">Your yard is habitat</p>
                <h2 className="mt-3 max-w-[42rem] font-display text-[clamp(2.4rem,4.6vw,4.1rem)] font-semibold leading-[0.96] tracking-[-0.05em]">
                  The smallest patch can be part of the biggest recovery.
                </h2>
                <p className="mt-4 max-w-[34rem] text-[0.95rem] leading-7 text-[#d6ddcc]">
                  Start with one photo and one swap. NativeYard shows you where
                  the ecological leverage is—and what to plant in its place.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <a href="#audit" className="btn btn-lime px-5 py-3.5">
                  Run a free yard audit
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <p className="text-[0.68rem] text-[#a9b59e]">
                  No account. No email. Just your yard.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#ddd8c7] bg-[#f0ecdf]">
        <div className="container-shell flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Brand />
            <span className="hidden text-[0.68rem] text-[#8b9182] sm:inline">
              A working MVP for New Jersey native-yard transitions.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.68rem] text-[#7a806e]">
            <span>Built for New Jersey · Zone 6b</span>
            <span className="hidden h-3 w-px bg-[#d0cbb9] sm:block" />
            <span>Local NJ flora snapshot v{NJ_DATA_VERSION}</span>
          </div>
        </div>
        <div className="container-shell pb-6 text-[0.62rem] leading-5 text-[#9a9f91]">
          Ecological references: Native Plant Society of New Jersey county
          lists; Jersey-Friendly Yards / Barnegat Bay Partnership; NJDEP and NJDA
          invasive species lists; National Wildlife Federation keystone plant
          research; Doug Tallamy, Nature&apos;s Best Hope; EPA Level III/IV
          ecoregions. Sample photo via Pexels. Always verify plant ID and local
          regulations with your county extension office before removing or
          planting.
        </div>
      </footer>
    </div>
  );
}
