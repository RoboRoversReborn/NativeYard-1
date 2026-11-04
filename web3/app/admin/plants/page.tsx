/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Bug,
  Download,
  Check,
  X,
  Lock,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  LogIn,
  Loader2,
  Database,
  RefreshCw,
  Upload,
  Info,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  Sun,
  Droplet,
  Flower2,
  Layers,
} from "lucide-react";
import { getAllPlants, getStatusMeta } from "@/lib/plants";
import { getPlantImage } from "@/lib/plantImages";
import {
  fetchPlantsFromDb,
  upsertPlantInDb,
  deletePlantFromDb,
  batchSyncPlantsToDb,
  uploadPlantImageToStorage,
} from "@/lib/firebase/plants";
import { checkAdminStatus } from "@/lib/firebase/adminAuth";
import { onAuthChange, signOutUser, signInWithEmail, signInWithGoogle } from "@/lib/firebase/auth";
import type {
  Plant,
  PlantStatus,
  PlantType,
  NjPlantStatus,
  NjGrowthHabit,
  NjDeerResistance,
  NjOrnamentalFeature,
  RemovalProtocol,
} from "@/lib/types";

export default function CuratorPlantsAdminPage() {
  const [plantsList, setPlantsList] = useState<Plant[]>(() => getAllPlants());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Firebase Auth & State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoadedFromDb, setIsLoadedFromDb] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSqlHelp, setShowSqlHelp] = useState(false);

  // Load Admin Status & Firestore Data
  useEffect(() => {
    let isMounted = true;

    async function initializePortal() {
      setAuthLoading(true);
      try {
        const auth = await checkAdminStatus();
        if (!isMounted) return;
        setIsAdmin(auth.isAdmin);
        setCurrentUser(auth.user);
        setAdminRole(auth.adminRole);

        // Fetch flora data from Firestore
        const dbPlants = await fetchPlantsFromDb();
        if (isMounted && dbPlants && dbPlants.length > 0) {
          setPlantsList(dbPlants);
          setIsLoadedFromDb(true);
        }
      } catch (err) {
        console.warn("Curator initialization notice:", err);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }

    initializePortal();

    const unsubscribe = onAuthChange(async (user) => {
      const auth = await checkAdminStatus();
      if (!isMounted) return;
      setIsAdmin(auth.isAdmin);
      setCurrentUser(auth.user);
      setAdminRole(auth.adminRole);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    let keystone = 0;
    let native = 0;
    let nonNative = 0;
    let invasive = 0;
    let withImages = 0;

    for (const p of plantsList) {
      if (p.status === "keystone") keystone++;
      else if (p.status === "native") native++;
      else if (p.status === "non-native") nonNative++;
      else if (p.status === "invasive") invasive++;

      if (getPlantImage(p.scientificName, p.commonName, p.imageUrl)) withImages++;
    }

    return {
      total: plantsList.length,
      keystone,
      native,
      nonNative,
      invasive,
      withImages,
    };
  }, [plantsList]);

  const filteredPlants = useMemo(() => {
    return plantsList.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      return (
        p.commonName.toLowerCase().includes(q) ||
        p.scientificName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [plantsList, statusFilter, typeFilter, searchTerm]);

  async function handleSavePlant(formData: Partial<Plant> & { imageUrl?: string }) {
    if (!isAdmin) {
      setShowLoginModal(true);
      setToastMessage("🔒 Please sign in as a curator to modify plant records.");
      return;
    }

    setIsSavingDb(true);
    const slug = (formData.id || formData.scientificName || formData.commonName || "new-plant")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newRecord: Plant = {
      id: slug,
      scientificName: formData.scientificName || "Species binomial",
      commonName: formData.commonName || "Common name",
      status: formData.status || "native",
      njStatus:
        formData.njStatus ||
        (formData.status === "keystone"
          ? "NATIVE_KEYSTONE"
          : formData.status === "native"
          ? "NATIVE"
          : formData.status === "invasive"
          ? "INVASIVE_REGULATED"
          : "NON_NATIVE_BENIGN"),
      type: formData.type || "Perennial",
      growthHabit: formData.growthHabit || "PERENNIAL_FORB",
      sun: formData.sun || "Full Sun / Partial Shade",
      moisture: formData.moisture || "Medium",
      bloom: formData.bloom || "Summer",
      height: formData.height || "2–4 ft",
      description: formData.description || "Curated New Jersey plant record.",
      lepidoptera: formData.lepidoptera || 0,
      deerResistance: formData.deerResistance || "MODERATE",
      specialistBeeSupport: Boolean(formData.specialistBeeSupport),
      swapIds: formData.swapIds || [],
      removal: formData.removal,
      ornamentalFeatures: formData.ornamentalFeatures || [],
      imageUrl: formData.imageUrl,
    };

    try {
      await upsertPlantInDb(newRecord);
    } catch (err: any) {
      console.error("Save error:", err);
      setToastMessage(`⚠️ Save error: ${err.message}`);
      setIsSavingDb(false);
      return;
    }

    if (isCreatingNew) {
      setPlantsList((prev) => [newRecord, ...prev]);
      setToastMessage(`✓ Added & synced: ${newRecord.commonName}`);
    } else if (editingPlant) {
      setPlantsList((prev) =>
        prev.map((p) => (p.id === editingPlant.id ? newRecord : p))
      );
      setToastMessage(`✓ Saved & synced: ${newRecord.commonName}`);
    }

    setIsSavingDb(false);
    setEditingPlant(null);
    setIsCreatingNew(false);
    setTimeout(() => setToastMessage(""), 4500);
  }

  async function handleDeletePlant(id: string) {
    if (!isAdmin) {
      setShowLoginModal(true);
      setToastMessage("🔒 Please sign in as a curator to remove plant records.");
      return;
    }

    if (!confirm("Are you sure you want to permanently remove this plant from the database?")) return;

    try {
      await deletePlantFromDb(id);
    } catch (error: any) {
      setToastMessage(`⚠️ Delete failed: ${error.message}`);
      return;
    }

    setPlantsList((prev) => prev.filter((p) => p.id !== id));
    setToastMessage("✓ Plant permanently removed from catalog.");
    setTimeout(() => setToastMessage(""), 4000);
  }

  async function handleSyncAllToFirestore() {
    if (!isAdmin) {
      setShowLoginModal(true);
      return;
    }

    setIsSyncing(true);

    try {
      const all = getAllPlants();
      const count = await batchSyncPlantsToDb(all);
      setIsLoadedFromDb(true);
      setPlantsList(all);
      setToastMessage(`✓ Synced ${count} plants to Firestore database!`);
    } catch (err: any) {
      setToastMessage(`⚠️ Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setToastMessage(""), 5000);
    }
  }

  async function handleSignOut() {
    await signOutUser();
    setIsAdmin(false);
    setCurrentUser(null);
    setAdminRole(null);
    setToastMessage("Logged out. Read-only mode active.");
    setTimeout(() => setToastMessage(""), 3500);
  }

  function handleExportSnapshot() {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(plantsList, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `master-nj-plants-snapshot-${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setToastMessage("Exported current snapshot as JSON file.");
    setTimeout(() => setToastMessage(""), 4000);
  }

  return (
    <div className="min-h-screen bg-[#f4f1e6] pb-20 text-[#163f2c]">
      {/* Top Header */}
      <header className="border-b border-[#dcd7c5] bg-[#fbfaf4] px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="grid h-9 w-9 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] transition hover:bg-[#ece8d9]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌿</span>
                <h1 className="font-display text-xl font-bold tracking-tight text-[#163f2c]">
                  New Jersey Flora Curator Portal
                </h1>
                <span className="rounded-full bg-[#163f2c] px-2.5 py-0.5 text-[0.62rem] font-bold text-[#d7f27a]">
                  Catalog v1.5
                </span>
                {isLoadedFromDb && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f2d8] px-2 py-0.5 text-[0.62rem] font-bold text-[#2f7d3a]">
                    <Database className="h-2.5 w-2.5" /> Firestore Live
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6b7a68]">
                Curated New Jersey native, keystone, and invasive flora repository
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={handleSyncAllToFirestore}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#bcd79a] bg-[#e7f2d8] px-3.5 py-2 text-xs font-bold text-[#2f7d3a] transition hover:bg-[#d8eabf] disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sync All to Firestore
              </button>
            )}

            <button
              type="button"
              onClick={handleExportSnapshot}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#c3bc9f] bg-white px-3.5 py-2 text-xs font-bold text-[#163f2c] transition hover:bg-[#f3f0e6]"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isAdmin) {
                  setShowLoginModal(true);
                  return;
                }
                setEditingPlant(null);
                setIsCreatingNew(true);
              }}
              className="btn btn-dark inline-flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              {isAdmin ? (
                <Plus className="h-4 w-4 text-[#d7f27a]" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-[#e7b8a8]" />
              )}
              Add New Species
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 border-l border-[#dcd7c5] pl-3">
                <span className="text-xs font-semibold text-[#556950] hidden sm:inline">
                  {currentUser.email?.split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-xs font-bold text-[#b6533d] hover:underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="border-l border-[#dcd7c5] pl-3">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d3bf] bg-white px-3.5 py-1.5 text-xs font-bold text-[#163f2c] transition hover:bg-[#ece8d9]"
                >
                  <LogIn className="h-3.5 w-3.5 text-[#3f7d45]" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Security Status Banner */}
      <section className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
        {authLoading ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#d8d3bf] bg-[#fbfaf4] p-3 text-xs text-[#6b7a68]">
            <Loader2 className="h-4 w-4 animate-spin text-[#3f7d45]" />
            <span>Checking curator authorization credentials...</span>
          </div>
        ) : isAdmin ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bcd79a] bg-[#edf3e3] p-3.5 text-xs text-[#163f2c]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2f7d3a] text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold">
                  Curator Authorization Active ({adminRole?.toUpperCase() || "ADMIN"})
                </span>
                <span className="block text-[0.7rem] text-[#556950]">
                  Signed in as: <strong>{currentUser?.email}</strong>. All catalog changes sync directly to Cloud Firestore.
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 rounded-full border border-[#c9d9b7] bg-white px-3 py-1.5 text-xs font-bold text-[#b6533d] transition hover:bg-[#fae8e1]"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          </div>
        ) : currentUser ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7d09b] bg-[#faf1dc] p-3.5 text-xs text-[#73531b]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#a87a2c] text-white">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold">Account Authenticated — Read-Only Access</span>
                <span className="block text-[0.7rem] text-[#856529]">
                  Logged in as <strong>{currentUser.email}</strong>, but your UUID has not been added to <code>public.admin_users</code>.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSqlHelp(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#c3bc9f] bg-white px-3 py-1.5 text-xs font-bold text-[#163f2c] transition hover:bg-[#f3f0e6]"
              >
                <Info className="h-3 w-3 text-[#3f7d45]" />
                How to Authorize
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 rounded-full border border-[#c3bc9f] bg-white px-3 py-1.5 text-xs font-bold text-[#b6533d] transition hover:bg-[#fae8e1]"
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d8d3bf] bg-[#fbfaf4] p-3.5 text-xs text-[#5d6b60]">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e8e4d5] text-[#5d6b60]">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-[#163f2c]">Read-Only Catalog Exploration</span>
                <span className="block text-[0.7rem] text-[#6b7a68]">
                  Anyone can search the flora database. Sign in with curator privileges to edit, add, or delete species.
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#163f2c] px-4 py-1.5 text-xs font-bold text-[#f7f4e9] transition hover:bg-[#20573d]"
            >
              <LogIn className="h-3.5 w-3.5 text-[#d7f27a]" />
              Curator Sign In
            </button>
          </div>
        )}
      </section>

      <main className="mx-auto mt-5 max-w-7xl px-4 sm:px-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-[#d8d3bf] bg-[#fbfaf4] p-3.5 text-center">
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-[#6b7a68]">Total Species</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#163f2c]">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-[#bcd79a] bg-[#e7f2d8] p-3.5 text-center">
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-[#2f7d3a]">🌟 Keystone</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#2f7d3a]">{stats.keystone}</p>
          </div>
          <div className="rounded-2xl border border-[#c9d9b7] bg-[#edf3e3] p-3.5 text-center">
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-[#3f7d45]">🟢 Native</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#3f7d45]">{stats.native}</p>
          </div>
          <div className="rounded-2xl border border-[#e7d09b] bg-[#faf1dc] p-3.5 text-center">
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-[#a87a2c]">🟠 Non-Native</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#a87a2c]">{stats.nonNative}</p>
          </div>
          <div className="rounded-2xl border border-[#e7b8a8] bg-[#fae8e1] p-3.5 text-center">
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-[#b6533d]">🔴 Invasive</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#b6533d]">{stats.invasive}</p>
          </div>
          <div className="rounded-2xl border border-[#d8d3bf] bg-[#fbfaf4] p-3.5 text-center">
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-[#6b7a68]">📸 Photo Coverage</p>
            <p className="mt-1 font-display text-2xl font-bold text-[#163f2c]">
              {Math.round((stats.withImages / stats.total) * 100)}%
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#d8d3bf] bg-[#fbfaf4] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9182]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by common name, scientific name, or slug..."
              className="w-full rounded-xl border border-[#d8d3bf] bg-white py-2 pl-10 pr-4 text-xs text-[#163f2c] placeholder:text-[#9a9f91] focus:border-[#3f7d45] focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
            >
              <option value="all">All Ecological Statuses</option>
              <option value="keystone">Keystone Native</option>
              <option value="native">Native</option>
              <option value="non-native">Non-Native</option>
              <option value="invasive">Invasive</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
            >
              <option value="all">All Plant Types</option>
              <option value="Tree">Trees</option>
              <option value="Shrub">Shrubs</option>
              <option value="Perennial">Perennials</option>
              <option value="Vine">Vines</option>
              <option value="Grass">Grasses / Graminoids</option>
              <option value="Fern">Ferns</option>
            </select>
          </div>
        </div>

        {/* Plant Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#d8d3bf] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#e8e4d5] bg-[#f7f4e9] text-[0.68rem] font-bold uppercase tracking-wider text-[#6b7a68]">
                <tr>
                  <th className="px-4 py-3">Species</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Habit & Deer Resistance</th>
                  <th className="px-3 py-3">Ecological Value</th>
                  <th className="px-3 py-3">Swaps</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede2]">
                {filteredPlants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#8b9182]">
                      No plant records match your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPlants.map((plant) => {
                    const statusMeta = getStatusMeta(plant);
                    const imgUrl = getPlantImage(plant.scientificName, plant.commonName, plant.imageUrl);

                    const deerBadge =
                      plant.deerResistance === "HIGH" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f2d8] px-2 py-0.5 text-[0.62rem] font-bold text-[#2f7d3a]" title="High Deer Resistance (Rarely Damaged)">
                          🦌 High
                        </span>
                      ) : plant.deerResistance === "LOW" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fae8e1] px-2 py-0.5 text-[0.62rem] font-bold text-[#b6533d]" title="Low Deer Resistance (Deer Favorite)">
                          🦌 Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#faf1dc] px-2 py-0.5 text-[0.62rem] font-bold text-[#a87a2c]" title="Moderate Deer Resistance">
                          🦌 Mod
                        </span>
                      );

                    return (
                      <tr key={plant.id} className="transition hover:bg-[#faf8f0]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#f0ede2]">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={plant.commonName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full w-full place-items-center text-xs">🌱</div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                {plant.status === "keystone" && <span>🌟</span>}
                                <span className="font-bold text-[#163f2c]">{plant.commonName}</span>
                              </div>
                              <span className="block italic text-[#8b9182]">{plant.scientificName}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[0.62rem] font-bold text-white"
                            style={{ background: statusMeta.color }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-semibold text-[#163f2c]">{plant.type}</span>
                            <div className="flex items-center gap-1.5">
                              {deerBadge}
                              <span className="text-[0.66rem] text-[#8b9182]">
                                {plant.growthHabit?.replace(/_/g, " ") || "Standard"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {plant.lepidoptera ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#edf3e3] px-2 py-0.5 text-[0.66rem] font-bold text-[#2f7d3a]" title={`${plant.lepidoptera} caterpillar host species`}>
                                <Bug className="h-3 w-3" />
                                {plant.lepidoptera}+
                              </span>
                            ) : null}

                            {plant.specialistBeeSupport && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#fff4cc] px-2 py-0.5 text-[0.66rem] font-bold text-[#8a6b10]" title="Specialist Bee Pollen Host">
                                🐝 Bees
                              </span>
                            )}

                            {!plant.lepidoptera && !plant.specialistBeeSupport && (
                              <span className="text-[#8b9182]">—</span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-[#5d6b60]">
                          {plant.swapIds?.length ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#163f2c]">
                              <span>🔄</span> {plant.swapIds.length} native options
                            </span>
                          ) : (
                            <span className="text-[#8b9182]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (!isAdmin) {
                                  setShowLoginModal(true);
                                  return;
                                }
                                setIsCreatingNew(false);
                                setEditingPlant(plant);
                              }}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-[#d8d3bf] bg-white text-[#5d6b60] transition hover:bg-[#f3f0e6] hover:text-[#163f2c]"
                              title={isAdmin ? "Edit plant record" : "Curator login required to edit"}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlant(plant.id)}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-[#e7b8a8] bg-white text-[#b6533d] transition hover:bg-[#fae8e1]"
                              title={isAdmin ? "Delete plant record" : "Curator login required to delete"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modern 5-Tab Plant Edit / Create Modal */}
      {(editingPlant || isCreatingNew) && (
        <PlantEditModal
          isOpen={Boolean(editingPlant || isCreatingNew)}
          onClose={() => {
            setEditingPlant(null);
            setIsCreatingNew(false);
          }}
          plant={editingPlant}
          allPlants={plantsList}
          onSave={handleSavePlant}
          isSaving={isSavingDb}
        />
      )}

      {/* Curator Sign-In Modal */}
      {showLoginModal && (
        <CuratorLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={(email) => {
            setShowLoginModal(false);
            setToastMessage(`✓ Welcome back! Curator session active for ${email}`);
            setTimeout(() => setToastMessage(""), 4000);
          }}
        />
      )}

      {/* SQL Help Modal */}
      {showSqlHelp && (
        <SqlHelpModal
          isOpen={showSqlHelp}
          onClose={() => setShowSqlHelp(false)}
          currentUserId={currentUser?.id}
          currentUserEmail={currentUser?.email}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#2f7d3a] bg-[#163f2c] px-5 py-2.5 text-xs font-bold text-[#f7f4e9] shadow-xl animate-fade-in">
          <Check className="h-4 w-4 text-[#d7f27a]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Enhanced 5-Tab Plant Edit & Curator Studio Modal
   ========================================================================= */

interface PlantEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: Plant | null;
  allPlants: Plant[];
  onSave: (data: Partial<Plant> & { imageUrl?: string }) => void;
  isSaving: boolean;
}

type CuratorTab = "taxonomy" | "conditions" | "wildlife" | "swaps" | "photo";

const ALL_ORNAMENTALS: { id: NjOrnamentalFeature; label: string; icon: string }[] = [
  { id: "SHOWY_BLOOMS", label: "Showy Blooms", icon: "🌸" },
  { id: "RED_FALL_FOLIAGE", label: "Red Fall Foliage", icon: "🍁" },
  { id: "WINTER_BERRIES", label: "Winter Berries", icon: "🍒" },
  { id: "FRAGRANT", label: "Fragrant", icon: "👃" },
  { id: "EVERGREEN", label: "Evergreen", icon: "🌲" },
];

function PlantEditModal({
  isOpen,
  onClose,
  plant,
  allPlants,
  onSave,
  isSaving,
}: PlantEditModalProps) {
  const [activeTab, setActiveTab] = useState<CuratorTab>("taxonomy");

  // Tab 1: Taxonomy & Identification
  const [commonName, setCommonName] = useState(plant?.commonName || "");
  const [scientificName, setScientificName] = useState(plant?.scientificName || "");
  const [status, setStatus] = useState<PlantStatus>(plant?.status || "native");
  const [njStatus, setNjStatus] = useState<NjPlantStatus>(
    plant?.njStatus ||
      (plant?.status === "keystone"
        ? "NATIVE_KEYSTONE"
        : plant?.status === "native"
        ? "NATIVE"
        : plant?.status === "invasive"
        ? "INVASIVE_REGULATED"
        : "NON_NATIVE_BENIGN")
  );
  const [type, setType] = useState<PlantType>(plant?.type || "Perennial");
  const [growthHabit, setGrowthHabit] = useState<NjGrowthHabit>(
    plant?.growthHabit || "PERENNIAL_FORB"
  );
  const [description, setDescription] = useState(plant?.description || "");

  // Tab 2: Growing Conditions
  const [sun, setSun] = useState(plant?.sun || "Full Sun / Partial Shade");
  const [moisture, setMoisture] = useState(plant?.moisture || "Medium");
  const [height, setHeight] = useState(plant?.height || "2–4 ft");
  const [bloom, setBloom] = useState(plant?.bloom || "Summer");
  const [ornamentalFeatures, setOrnamentalFeatures] = useState<NjOrnamentalFeature[]>(
    plant?.ornamentalFeatures || []
  );

  // Tab 3: Wildlife & Deer Resistance
  const [deerResistance, setDeerResistance] = useState<NjDeerResistance>(
    plant?.deerResistance || "MODERATE"
  );
  const [lepidoptera, setLepidoptera] = useState<number>(plant?.lepidoptera || 0);
  const [specialistBeeSupport, setSpecialistBeeSupport] = useState<boolean>(
    plant?.specialistBeeSupport || false
  );

  // Tab 4: Native Swaps & Eradication
  const [swapIds, setSwapIds] = useState<string[]>(plant?.swapIds || []);
  const [swapSearchTerm, setSwapSearchTerm] = useState("");
  const [removalMethod, setRemovalMethod] = useState(plant?.removal?.method || "");
  const [removalTiming, setRemovalTiming] = useState(plant?.removal?.timing || "");
  const [removalSafety, setRemovalSafety] = useState(plant?.removal?.safety || "");
  const [removalDisposal, setRemovalDisposal] = useState(plant?.removal?.disposal || "");

  // Tab 5: Botanical Photography
  const [customImageUrl, setCustomImageUrl] = useState(plant?.imageUrl || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!isOpen) return null;

  // Filter available native plants for swap selection
  const availableNativePlants = allPlants.filter(
    (p) =>
      p.id !== plant?.id &&
      (p.status === "native" || p.status === "keystone") &&
      !swapIds.includes(p.id)
  );

  const filteredNativeSwaps = availableNativePlants.filter((p) => {
    if (!swapSearchTerm.trim()) return true;
    const q = swapSearchTerm.toLowerCase();
    return (
      p.commonName.toLowerCase().includes(q) ||
      p.scientificName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  // Quick same-habit native suggestions
  const habitSuggestions = availableNativePlants
    .filter((p) => p.type === type && !swapIds.includes(p.id))
    .slice(0, 3);

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const plantId = (scientificName || commonName || "plant")
        .replace(/\s+/g, "_")
        .toLowerCase();
      const downloadUrl = await uploadPlantImageToStorage(file, plantId);
      setCustomImageUrl(downloadUrl);
    } catch (err: any) {
      alert(`Photo upload failed: ${err.message || err}`);
    } finally {
      setUploadingImage(false);
    }
  }

  function toggleOrnamentalFeature(feat: NjOrnamentalFeature) {
    setOrnamentalFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  }

  function handleAddSwap(id: string) {
    if (!swapIds.includes(id)) {
      setSwapIds((prev) => [...prev, id]);
    }
  }

  function handleRemoveSwap(id: string) {
    setSwapIds((prev) => prev.filter((s) => s !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const removalObj: RemovalProtocol | undefined =
      status === "invasive" &&
      (removalMethod || removalTiming || removalSafety || removalDisposal)
        ? {
            method: removalMethod || "Mechanical digging / manual uprooting.",
            timing: removalTiming || "Before summer flowering & seed dispersal.",
            safety: removalSafety || "Wear durable garden gloves and eye protection.",
            disposal: removalDisposal || "Bag in contractor sacks; do NOT compost.",
          }
        : undefined;

    onSave({
      commonName,
      scientificName,
      status,
      njStatus,
      type,
      growthHabit,
      lepidoptera,
      sun,
      moisture,
      height,
      bloom,
      description,
      deerResistance,
      specialistBeeSupport,
      swapIds,
      removal: removalObj,
      ornamentalFeatures,
      imageUrl: customImageUrl || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-[#d5cfbd] bg-[#fbfaf4] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e8e4d5] px-6 py-4 bg-white/80">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#edf3e3] text-xl">
              🌿
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-[#163f2c]">
                {plant ? `Edit ${plant.commonName}` : "Add New New Jersey Flora Record"}
              </h3>
              <p className="text-[0.7rem] text-[#6b7a68]">
                {scientificName || "Taxonomic Species Record"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#f3f0e6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Curator Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-[#e8e4d5] bg-[#f7f4e9] px-6 text-xs font-bold text-[#6b7a68]">
          <button
            type="button"
            onClick={() => setActiveTab("taxonomy")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 whitespace-nowrap transition ${
              activeTab === "taxonomy"
                ? "border-[#163f2c] text-[#163f2c]"
                : "border-transparent hover:text-[#163f2c]"
            }`}
          >
            <span>🌿</span> 1. Taxonomy & Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("conditions")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 whitespace-nowrap transition ${
              activeTab === "conditions"
                ? "border-[#163f2c] text-[#163f2c]"
                : "border-transparent hover:text-[#163f2c]"
            }`}
          >
            <span>☀️</span> 2. Growing Conditions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("wildlife")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 whitespace-nowrap transition ${
              activeTab === "wildlife"
                ? "border-[#163f2c] text-[#163f2c]"
                : "border-transparent hover:text-[#163f2c]"
            }`}
          >
            <span>🦌</span> 3. Wildlife & Deer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("swaps")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 whitespace-nowrap transition ${
              activeTab === "swaps"
                ? "border-[#163f2c] text-[#163f2c]"
                : "border-transparent hover:text-[#163f2c]"
            }`}
          >
            <span>🔄</span> 4. Native Swaps & Eradication
            {swapIds.length > 0 && (
              <span className="rounded-full bg-[#163f2c] px-1.5 py-0.2 text-[0.6rem] text-[#d7f27a]">
                {swapIds.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("photo")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 whitespace-nowrap transition ${
              activeTab === "photo"
                ? "border-[#163f2c] text-[#163f2c]"
                : "border-transparent hover:text-[#163f2c]"
            }`}
          >
            <span>📸</span> 5. Photography
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* TAB 1: Taxonomy & Identification */}
          {activeTab === "taxonomy" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1">Common English Name</label>
                  <input
                    type="text"
                    required
                    value={commonName}
                    onChange={(e) => setCommonName(e.target.value)}
                    placeholder="e.g. Purple Coneflower"
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3.5 py-2.5 text-xs text-[#163f2c] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1">Scientific Binomial</label>
                  <input
                    type="text"
                    required
                    value={scientificName}
                    onChange={(e) => setScientificName(e.target.value)}
                    placeholder="e.g. Echinacea purpurea"
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3.5 py-2.5 text-xs text-[#163f2c] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1">Broad Ecological Status</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const nextStatus = e.target.value as PlantStatus;
                      setStatus(nextStatus);
                      if (nextStatus === "keystone") setNjStatus("NATIVE_KEYSTONE");
                      else if (nextStatus === "native") setNjStatus("NATIVE");
                      else if (nextStatus === "invasive") setNjStatus("INVASIVE_REGULATED");
                      else setNjStatus("NON_NATIVE_BENIGN");
                    }}
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
                  >
                    <option value="keystone">🌟 Keystone Native</option>
                    <option value="native">🟢 Native</option>
                    <option value="non-native">🟠 Non-Native Benign</option>
                    <option value="invasive">🔴 Invasive Species</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1">NJ Regulatory Sub-Classification</label>
                  <select
                    value={njStatus}
                    onChange={(e) => setNjStatus(e.target.value as NjPlantStatus)}
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
                  >
                    <option value="NATIVE_KEYSTONE">🌟 Keystone Native (Doug Tallamy Top 5%)</option>
                    <option value="NATIVE">🟢 Native to New Jersey Eco-Regions</option>
                    <option value="NON_NATIVE_BENIGN">🟠 Non-Native Benign (Ornamental / Non-Spreading)</option>
                    <option value="INVASIVE_REGULATED">🔴 Invasive Regulated (Prohibited by NJ Statute)</option>
                    <option value="INVASIVE_WATCHLIST">⚠️ Invasive Watchlist (High Risk Emerging)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1">Plant Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PlantType)}
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
                  >
                    <option value="Tree">Tree</option>
                    <option value="Shrub">Shrub</option>
                    <option value="Perennial">Perennial / Wildflower</option>
                    <option value="Vine">Vine</option>
                    <option value="Grass">Grass / Graminoid</option>
                    <option value="Fern">Fern</option>
                    <option value="Groundcover">Groundcover</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1">NJ Structural Growth Habit</label>
                  <select
                    value={growthHabit}
                    onChange={(e) => setGrowthHabit(e.target.value as NjGrowthHabit)}
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
                  >
                    <option value="CANOPY_TREE">Overstory Canopy Tree (&gt;50 ft)</option>
                    <option value="UNDERSTORY_TREE">Understory Small Tree (15–35 ft)</option>
                    <option value="SHRUB">Woody Shrub (3–15 ft)</option>
                    <option value="PERENNIAL_FORB">Perennial Herbaceous Forb</option>
                    <option value="GRAMINOID">Graminoid (Grass, Sedge, Rush)</option>
                    <option value="VINE">Climbing / Twining Vine</option>
                    <option value="GROUNDCOVER">Low Spreading Groundcover</option>
                    <option value="FERN">Fern / Spore-Bearing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#5d6b60] mb-1">
                  Botanical Description & Distinctive Diagnostic Traits
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Distinctive visual leaf margins, flower traits, bark characteristics, and ecological niche..."
                  className="w-full rounded-xl border border-[#d8d3bf] bg-white p-3 text-xs text-[#163f2c] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Growing Conditions & Ornamental Features */}
          {activeTab === "conditions" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1 flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-[#a87a2c]" /> Sun Exposure
                  </label>
                  <input
                    type="text"
                    value={sun}
                    onChange={(e) => setSun(e.target.value)}
                    placeholder="e.g. Full Sun / Partial Shade / Shade"
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1 flex items-center gap-1.5">
                    <Droplet className="h-3.5 w-3.5 text-[#3b7ea1]" /> Soil Moisture
                  </label>
                  <input
                    type="text"
                    value={moisture}
                    onChange={(e) => setMoisture(e.target.value)}
                    placeholder="e.g. Medium to Wet / Drought Tolerant"
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#5d6b60]" /> Mature Height
                  </label>
                  <input
                    type="text"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="e.g. 3–5 ft (or 40–70 ft for trees)"
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#5d6b60] mb-1 flex items-center gap-1.5">
                    <Flower2 className="h-3.5 w-3.5 text-[#b6533d]" /> Bloom Period
                  </label>
                  <input
                    type="text"
                    value={bloom}
                    onChange={(e) => setBloom(e.target.value)}
                    placeholder="e.g. Mid Summer to Early Autumn (July–Sept)"
                    className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Ornamental Features Multi-Select */}
              <div className="rounded-2xl border border-[#d8d3bf] bg-white p-4">
                <label className="block font-bold text-[#163f2c] mb-1">
                  Notable Landscape & Ornamental Features
                </label>
                <p className="text-[0.68rem] text-[#6b7a68] mb-3">
                  Select ornamental highlights that make this species attractive for homeowner yards.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_ORNAMENTALS.map((feat) => {
                    const isSelected = ornamentalFeatures.includes(feat.id);
                    return (
                      <button
                        key={feat.id}
                        type="button"
                        onClick={() => toggleOrnamentalFeature(feat.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? "bg-[#163f2c] text-[#d7f27a] shadow-xs"
                            : "border border-[#d8d3bf] bg-[#fbfaf4] text-[#5d6b60] hover:bg-[#f0ede2]"
                        }`}
                      >
                        <span>{feat.icon}</span>
                        <span>{feat.label}</span>
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Wildlife, Lepidoptera & Deer Resistance */}
          {activeTab === "wildlife" && (
            <div className="space-y-5 animate-fade-in">
              {/* Deer Resistance Selector */}
              <div>
                <label className="block font-bold text-[#163f2c] mb-1">
                  🦌 Deer Resistance Rating (New Jersey Suburban Browsing)
                </label>
                <p className="text-[0.68rem] text-[#6b7a68] mb-3">
                  Deer overpopulation is a critical factor for NJ homeowners. Select the susceptibility rating:
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setDeerResistance("HIGH")}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      deerResistance === "HIGH"
                        ? "border-[#2f7d3a] bg-[#e7f2d8] ring-2 ring-[#2f7d3a]/30"
                        : "border-[#d8d3bf] bg-white hover:bg-[#faf8f0]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">🦌 🟢</span>
                      <span className="text-[0.62rem] font-bold uppercase tracking-wider text-[#2f7d3a]">
                        Top Choice
                      </span>
                    </div>
                    <p className="font-bold text-xs text-[#163f2c] mt-1.5">High Resistance</p>
                    <p className="text-[0.68rem] text-[#556950] mt-0.5 leading-snug">
                      Aromatic, fuzzy, prickly, or unpalatable foliage rarely damaged by deer.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeerResistance("MODERATE")}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      deerResistance === "MODERATE"
                        ? "border-[#a87a2c] bg-[#faf1dc] ring-2 ring-[#a87a2c]/30"
                        : "border-[#d8d3bf] bg-white hover:bg-[#faf8f0]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">🦌 🟡</span>
                      <span className="text-[0.62rem] font-bold uppercase tracking-wider text-[#a87a2c]">
                        Occasional
                      </span>
                    </div>
                    <p className="font-bold text-xs text-[#163f2c] mt-1.5">Moderate Resistance</p>
                    <p className="text-[0.68rem] text-[#73531b] mt-0.5 leading-snug">
                      Browsed occasionally during harsh winters or in high deer density corridors.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeerResistance("LOW")}
                    className={`rounded-2xl border p-3.5 text-left transition ${
                      deerResistance === "LOW"
                        ? "border-[#b6533d] bg-[#fae8e1] ring-2 ring-[#b6533d]/30"
                        : "border-[#d8d3bf] bg-white hover:bg-[#faf8f0]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">🦌 🔴</span>
                      <span className="text-[0.62rem] font-bold uppercase tracking-wider text-[#b6533d]">
                        Vulnerable
                      </span>
                    </div>
                    <p className="font-bold text-xs text-[#163f2c] mt-1.5">Low (Deer Favorite)</p>
                    <p className="text-[0.68rem] text-[#843625] mt-0.5 leading-snug">
                      Highly palatable; requires protective wire caging or repellent sprays to establish.
                    </p>
                  </button>
                </div>
              </div>

              {/* Lepidoptera Caterpillar Host Count */}
              <div className="rounded-2xl border border-[#d8d3bf] bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="block font-bold text-[#163f2c] flex items-center gap-1.5">
                      <Bug className="h-4 w-4 text-[#2f7d3a]" /> Caterpillar Host Count (Lepidoptera Species)
                    </label>
                    <p className="text-[0.68rem] text-[#6b7a68] mt-0.5">
                      Number of butterfly &amp; moth caterpillar species hosted in NJ (Doug Tallamy / NWF index).
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={lepidoptera}
                    onChange={(e) => setLepidoptera(Number(e.target.value) || 0)}
                    placeholder="e.g. 557"
                    className="w-24 rounded-xl border border-[#d8d3bf] bg-[#fbfaf4] px-3 py-2 text-center text-sm font-bold text-[#163f2c] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Specialist Bee Pollinator Host Switch */}
              <div
                onClick={() => setSpecialistBeeSupport(!specialistBeeSupport)}
                className={`cursor-pointer rounded-2xl border p-4 transition flex items-start gap-3.5 ${
                  specialistBeeSupport
                    ? "border-[#2f7d3a] bg-[#edf3e3] ring-1 ring-[#2f7d3a]"
                    : "border-[#d8d3bf] bg-white hover:bg-[#faf8f0]"
                }`}
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#d7f27a] text-lg shrink-0">
                  🐝
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#163f2c]">
                      Specialist Bee Pollen Host (Oligolectic Bees)
                    </span>
                    <input
                      type="checkbox"
                      checked={specialistBeeSupport}
                      onChange={(e) => setSpecialistBeeSupport(e.target.checked)}
                      className="h-4 w-4 accent-[#2f7d3a] cursor-pointer"
                    />
                  </div>
                  <p className="text-[0.68rem] text-[#556950] mt-0.5 leading-snug">
                    Provides essential specialized pollen for native solitary bees (e.g. <em>Colletes</em>, <em>Andrena</em>, <em>Melissodes</em>) that cannot feed offspring on non-native pollen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Native Swaps & Invasive Eradication */}
          {activeTab === "swaps" && (
            <div className="space-y-5 animate-fade-in">
              {/* Native Swap Replacement Selector */}
              <div className="rounded-2xl border border-[#d8d3bf] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-[#163f2c]">
                      🔄 Recommended Native Replacement Swaps
                    </label>
                    <p className="text-[0.68rem] text-[#6b7a68]">
                      Suggested native alternatives shown to homeowners when this plant is flagged.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#163f2c] px-2.5 py-0.5 text-[0.62rem] font-bold text-[#d7f27a]">
                    {swapIds.length} Linked
                  </span>
                </div>

                {/* Selected Swaps Chips Bar */}
                {swapIds.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#d8d3bf] bg-[#faf8f0] p-3 text-center text-xs text-[#8b9182]">
                    No native swaps assigned yet. Use the search box below to add replacements.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {swapIds.map((id) => {
                      const match = allPlants.find((p) => p.id === id);
                      const img = getPlantImage(match?.scientificName, match?.commonName, match?.imageUrl);

                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#bcd79a] bg-[#edf3e3] py-1 pl-1.5 pr-2.5 text-xs text-[#163f2c]"
                        >
                          <div className="h-6 w-6 rounded-lg overflow-hidden bg-white shrink-0">
                            {img ? (
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="grid place-items-center h-full text-[10px]">🌱</span>
                            )}
                          </div>
                          <span className="font-bold">{match?.commonName || id}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSwap(id)}
                            className="text-[#8b9182] hover:text-[#b6533d]"
                            title="Remove swap"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Quick Same-Habit Suggestions */}
                {habitSuggestions.length > 0 && (
                  <div className="pt-2 border-t border-[#f0ede2]">
                    <span className="text-[0.66rem] font-bold text-[#6b7a68] uppercase tracking-wider block mb-1.5">
                      Suggested Native {type}s:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {habitSuggestions.map((sug) => (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() => handleAddSwap(sug.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#d8d3bf] bg-[#fbfaf4] px-2.5 py-1 text-[0.68rem] font-bold text-[#163f2c] transition hover:border-[#2f7d3a] hover:bg-[#e7f2d8]"
                        >
                          <Plus className="h-3 w-3 text-[#2f7d3a]" />
                          {sug.commonName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search & Add Native Species */}
                <div className="pt-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b9182]" />
                    <input
                      type="text"
                      value={swapSearchTerm}
                      onChange={(e) => setSwapSearchTerm(e.target.value)}
                      placeholder="Search catalog for native replacement species to add..."
                      className="w-full rounded-xl border border-[#d8d3bf] bg-[#fbfaf4] py-2 pl-9 pr-3 text-xs text-[#163f2c] focus:outline-hidden"
                    />
                  </div>

                  {filteredNativeSwaps.length > 0 && (
                    <div className="mt-2 divide-y divide-[#f0ede2] rounded-xl border border-[#d8d3bf] bg-white overflow-hidden max-h-48 overflow-y-auto">
                      {filteredNativeSwaps.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 hover:bg-[#faf8f0]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs">
                              {item.status === "keystone" ? "🌟" : "🟢"}
                            </span>
                            <div>
                              <p className="font-bold text-xs text-[#163f2c]">{item.commonName}</p>
                              <p className="text-[0.66rem] italic text-[#8b9182]">{item.scientificName}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddSwap(item.id);
                              setSwapSearchTerm("");
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-[#163f2c] px-2.5 py-1 text-[0.68rem] font-bold text-[#f7f4e9] hover:bg-[#20573d]"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional Invasive Eradication & Removal Protocol */}
              <div
                className={`rounded-2xl border p-4 transition space-y-3 ${
                  status === "invasive"
                    ? "border-[#e7b8a8] bg-[#fae8e1]"
                    : "border-[#d8d3bf] bg-white opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      status === "invasive" ? "text-[#b6533d]" : "text-[#8b9182]"
                    }`}
                  />
                  <h4 className="font-bold text-xs text-[#163f2c]">
                    Invasive Eradication &amp; Disposal Protocol
                  </h4>
                  {status !== "invasive" && (
                    <span className="text-[0.65rem] text-[#8b9182] italic">
                      (Applies only when Ecological Status is set to Invasive)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block font-bold text-[#5d6b60] mb-1">Eradication Method</label>
                    <input
                      type="text"
                      disabled={status !== "invasive"}
                      value={removalMethod}
                      onChange={(e) => setRemovalMethod(e.target.value)}
                      placeholder="e.g. Dig root crown; cut-and-daub herbicide"
                      className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#5d6b60] mb-1">Optimal Timing Season</label>
                    <input
                      type="text"
                      disabled={status !== "invasive"}
                      value={removalTiming}
                      onChange={(e) => setRemovalTiming(e.target.value)}
                      placeholder="e.g. Mid-summer before seed maturation"
                      className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#5d6b60] mb-1">Safety &amp; PPE Precautions</label>
                    <input
                      type="text"
                      disabled={status !== "invasive"}
                      value={removalSafety}
                      onChange={(e) => setRemovalSafety(e.target.value)}
                      placeholder="e.g. Wear durable leather gloves to prevent thorn injury"
                      className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#5d6b60] mb-1">Disposal Protocol</label>
                    <input
                      type="text"
                      disabled={status !== "invasive"}
                      value={removalDisposal}
                      onChange={(e) => setRemovalDisposal(e.target.value)}
                      placeholder="e.g. Bag in heavy contractor bags; do NOT compost"
                      className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Botanical Photography */}
          {activeTab === "photo" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-[#d8d3bf] bg-white p-4">
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-[#d8d3bf] bg-[#f0ede2]">
                  {customImageUrl || getPlantImage(scientificName, commonName) ? (
                    <img
                      src={customImageUrl || getPlantImage(scientificName, commonName) || ""}
                      alt={commonName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-3xl">🌱</div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-[#163f2c]">Botanical Photography Management</h4>
                    <p className="text-[0.68rem] text-[#6b7a68]">
                      Upload high-resolution photography directly to the Firebase Cloud Storage bucket, or link an external CDN image.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#bcd79a] bg-[#e7f2d8] px-4 py-2 text-xs font-bold text-[#2f7d3a] transition hover:bg-[#d8eabf]">
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span>Upload Botanical Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setCustomImageUrl("")}
                      className="rounded-full border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-bold text-[#5d6b60] hover:bg-[#f3f0e6]"
                    >
                      Clear Custom URL
                    </button>
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-bold text-[#5d6b60] mb-1">
                      Direct Image URL (Firebase Storage or External Source):
                    </label>
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="https://firebasestorage.googleapis.com/..."
                      className="w-full rounded-xl border border-[#d8d3bf] bg-[#fbfaf4] px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e4d5] pt-4">
            <div className="flex items-center gap-2">
              {activeTab !== "taxonomy" && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: CuratorTab[] = ["taxonomy", "conditions", "wildlife", "swaps", "photo"];
                    const idx = tabs.indexOf(activeTab);
                    if (idx > 0) setActiveTab(tabs[idx - 1]);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#d8d3bf] bg-white px-3 py-1.5 text-xs font-bold text-[#5d6b60] hover:bg-[#f3f0e6]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
              )}

              {activeTab !== "photo" && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: CuratorTab[] = ["taxonomy", "conditions", "wildlife", "swaps", "photo"];
                    const idx = tabs.indexOf(activeTab);
                    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#d8d3bf] bg-white px-3 py-1.5 text-xs font-bold text-[#163f2c] hover:bg-[#f3f0e6]"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-full border border-[#d8d3bf] bg-white px-4 py-2 text-xs font-bold text-[#5d6b60] hover:bg-[#f3f0e6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-dark inline-flex items-center gap-2 px-6 py-2 text-xs font-bold"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save &amp; Sync Record
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   Curator Sign-In Modal
   ========================================================================= */

interface CuratorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

function CuratorLoginModal({ isOpen, onClose, onSuccess }: CuratorLoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      await signInWithEmail(email.trim(), password);

      // Check whether user is in admin_users
      const auth = await checkAdminStatus();
      if (!auth.isAdmin) {
        setErrorMsg(
          `Logged in as ${email}, but this account is not registered in the 'admin_users' collection. Read-only permissions remain active.`
        );
        setLoading(false);
        return;
      }

      onSuccess(email);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMsg("");
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      const auth = await checkAdminStatus();
      if (!auth.isAdmin) {
        setErrorMsg(
          `Signed in as ${user.email}, but this account is not registered in the 'admin_users' collection. Read-only permissions remain active.`
        );
        setLoading(false);
        return;
      }
      onSuccess(user.email || "Curator");
    } catch (err: any) {
      setErrorMsg(err.message || "Google sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-[#d5cfbd] bg-[#fbfaf4] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e8e4d5] pb-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#163f2c] text-[#d7f27a]">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#163f2c]">
                Curator Portal Access
              </h3>
              <p className="text-[0.68rem] text-[#6b7a68]">
                Sign in to edit, add, or delete master flora records
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#f3f0e6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-[#e7b8a8] bg-[#fae8e1] p-3 text-[0.72rem] text-[#b6533d]">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-[#d5cfbd] bg-white py-2.5 px-4 font-bold text-[#163f2c] shadow-xs hover:bg-[#f3f0e6] transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   SQL Help / Instructions Modal
   ========================================================================= */

interface SqlHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentUserEmail?: string;
}

function SqlHelpModal({ isOpen, onClose, currentUserId, currentUserEmail }: SqlHelpModalProps) {
  if (!isOpen) return null;

  const firestoreDocPath = `admin_users/${currentUserId || "<YOUR_AUTH_USER_UID>"}`;
  const firestoreSnippet = `{
  "email": "${currentUserEmail || "<YOUR_EMAIL>"}",
  "role": "admin",
  "created_at": "${new Date().toISOString()}"
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-[#d5cfbd] bg-[#fbfaf4] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e8e4d5] pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#3f7d45]" />
            <h3 className="font-display text-base font-bold text-[#163f2c]">
              How to Authorize Admin Users
            </h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#f3f0e6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs text-[#5d6b60]">
          <p>
            NativeYard uses Cloud Firestore Security Rules. Only authenticated users whose Auth UID exists in the{" "}
            <code>admin_users</code> collection are authorized to insert, edit, or delete flora records.
          </p>

          <p className="font-bold text-[#163f2c]">Document Path in Firebase Firestore:</p>
          <div className="overflow-x-auto rounded-xl border border-[#d8d3bf] bg-[#163f2c] p-2.5 text-[0.7rem] font-mono text-[#d7f27a]">
            {firestoreDocPath}
          </div>

          <p className="font-bold text-[#163f2c]">Document Data:</p>
          <pre className="overflow-x-auto rounded-xl border border-[#d8d3bf] bg-[#163f2c] p-3 text-[0.7rem] font-mono text-[#d7f27a]">
            {firestoreSnippet}
          </pre>

          <p className="text-[0.68rem] text-[#8b9182]">
            Add this document in your Firebase Console under Firestore Database to instantly grant full curator privileges.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full border border-[#d8d3bf] bg-white px-4 py-1.5 text-xs font-bold text-[#163f2c] hover:bg-[#f3f0e6]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
