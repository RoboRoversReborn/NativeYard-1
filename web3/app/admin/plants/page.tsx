/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  Sparkles,
  Bug,
  Leaf,
  Download,
  Check,
  X,
  Camera,
  ExternalLink,
} from "lucide-react";
import { getAllPlants, getStatusMeta } from "@/lib/plants";
import { getPlantImage } from "@/lib/plantImages";
import type { Plant, PlantStatus, PlantType, NjGrowthHabit, NjDeerResistance } from "@/lib/types";

export default function CuratorPlantsAdminPage() {
  const [plantsList, setPlantsList] = useState<Plant[]>(() => getAllPlants());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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

      if (getPlantImage(p.scientificName, p.commonName)) withImages++;
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

  function handleSavePlant(formData: Partial<Plant>) {
    if (isCreatingNew) {
      const slug = (formData.scientificName || formData.commonName || "new-plant")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const newPlant: Plant = {
        id: slug,
        scientificName: formData.scientificName || "Species binomial",
        commonName: formData.commonName || "Common name",
        status: formData.status || "native",
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
      };

      setPlantsList((prev) => [newPlant, ...prev]);
      setToastMessage(`Created new plant: ${newPlant.commonName}`);
    } else if (editingPlant) {
      setPlantsList((prev) =>
        prev.map((p) =>
          p.id === editingPlant.id ? ({ ...p, ...formData } as Plant) : p
        )
      );
      setToastMessage(`Saved changes for ${formData.commonName || editingPlant.commonName}`);
    }

    setEditingPlant(null);
    setIsCreatingNew(false);
    setTimeout(() => setToastMessage(""), 4000);
  }

  function handleDeletePlant(id: string) {
    if (!confirm("Are you sure you want to remove this plant from the catalog?")) return;
    setPlantsList((prev) => prev.filter((p) => p.id !== id));
    setToastMessage("Plant removed from catalog.");
    setTimeout(() => setToastMessage(""), 4000);
  }

  function handleExportSnapshot() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plantsList, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `master-nj-plants-snapshot-${Date.now()}.json`);
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
        <div className="mx-auto flex max-w-7xl items-center justify-between">
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
              </div>
              <p className="text-xs text-[#6b7a68]">
                Unified database for plant identification, photo library, and native swap rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
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
                setEditingPlant(null);
                setIsCreatingNew(true);
              }}
              className="btn btn-dark inline-flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              <Plus className="h-4 w-4 text-[#d7f27a]" />
              Add New Species
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
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
                  <th className="px-3 py-3">Classification</th>
                  <th className="px-3 py-3">Habit & Type</th>
                  <th className="px-3 py-3">Lepidoptera</th>
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
                    const imgUrl = getPlantImage(plant.scientificName, plant.commonName);

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
                          <span className="font-semibold text-[#163f2c]">{plant.type}</span>
                          <span className="block text-[0.66rem] text-[#8b9182]">
                            {plant.growthHabit || "Standard"}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          {plant.lepidoptera ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#edf3e3] px-2 py-0.5 text-[0.66rem] font-bold text-[#2f7d3a]">
                              <Bug className="h-3 w-3" />
                              {plant.lepidoptera}+
                            </span>
                          ) : (
                            <span className="text-[#8b9182]">—</span>
                          )}
                        </td>

                        <td className="px-3 py-3 text-[#5d6b60]">
                          {plant.swapIds?.length ? (
                            <span className="font-semibold text-[#163f2c]">
                              {plant.swapIds.length} native options
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
                                setIsCreatingNew(false);
                                setEditingPlant(plant);
                              }}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-[#d8d3bf] bg-white text-[#5d6b60] transition hover:bg-[#f3f0e6] hover:text-[#163f2c]"
                              title="Edit plant"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePlant(plant.id)}
                              className="grid h-7 w-7 place-items-center rounded-lg border border-[#e7b8a8] bg-white text-[#b6533d] transition hover:bg-[#fae8e1]"
                              title="Delete plant"
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

      {/* Edit / Create Plant Modal */}
      {(editingPlant || isCreatingNew) && (
        <PlantEditModal
          isOpen={Boolean(editingPlant || isCreatingNew)}
          onClose={() => {
            setEditingPlant(null);
            setIsCreatingNew(false);
          }}
          plant={editingPlant}
          onSave={handleSavePlant}
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

interface PlantEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  plant: Plant | null;
  onSave: (data: Partial<Plant>) => void;
}

function PlantEditModal({ isOpen, onClose, plant, onSave }: PlantEditModalProps) {
  const [commonName, setCommonName] = useState(plant?.commonName || "");
  const [scientificName, setScientificName] = useState(plant?.scientificName || "");
  const [status, setStatus] = useState<PlantStatus>(plant?.status || "native");
  const [type, setType] = useState<PlantType>(plant?.type || "Perennial");
  const [growthHabit, setGrowthHabit] = useState<NjGrowthHabit>(plant?.growthHabit || "PERENNIAL_FORB");
  const [lepidoptera, setLepidoptera] = useState<number>(plant?.lepidoptera || 0);
  const [sun, setSun] = useState(plant?.sun || "Full Sun / Partial Shade");
  const [moisture, setMoisture] = useState(plant?.moisture || "Medium");
  const [height, setHeight] = useState(plant?.height || "2–4 ft");
  const [bloom, setBloom] = useState(plant?.bloom || "Summer");
  const [description, setDescription] = useState(plant?.description || "");
  const [deerResistance, setDeerResistance] = useState<NjDeerResistance>(plant?.deerResistance || "MODERATE");
  const [specialistBeeSupport, setSpecialistBeeSupport] = useState<boolean>(plant?.specialistBeeSupport || false);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      commonName,
      scientificName,
      status,
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
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-[#d5cfbd] bg-[#fbfaf4] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e8e4d5] px-6 py-4">
          <h3 className="font-display text-lg font-bold text-[#163f2c]">
            {plant ? `Edit ${plant.commonName}` : "Add New New Jersey Species"}
          </h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#f3f0e6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-[#5d6b60] mb-1">Common English Name</label>
              <input
                type="text"
                required
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
                placeholder="e.g. Purple Coneflower"
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
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
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-[#5d6b60] mb-1">NJ Ecological Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlantStatus)}
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
              >
                <option value="keystone">🌟 Keystone Native</option>
                <option value="native">🟢 Native</option>
                <option value="non-native">🟠 Non-Native Benign</option>
                <option value="invasive">🔴 Invasive Species</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#5d6b60] mb-1">Plant Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlantType)}
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs font-semibold text-[#163f2c] focus:outline-hidden"
              >
                <option value="Tree">Tree</option>
                <option value="Shrub">Shrub</option>
                <option value="Perennial">Perennial</option>
                <option value="Vine">Vine</option>
                <option value="Grass">Grass / Graminoid</option>
                <option value="Fern">Fern</option>
                <option value="Groundcover">Groundcover</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#5d6b60] mb-1">Caterpillar Hosts</label>
              <input
                type="number"
                value={lepidoptera}
                onChange={(e) => setLepidoptera(Number(e.target.value) || 0)}
                placeholder="e.g. 557"
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-bold text-[#5d6b60] mb-1">Sun Requirements</label>
              <input
                type="text"
                value={sun}
                onChange={(e) => setSun(e.target.value)}
                placeholder="e.g. Full sun"
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#5d6b60] mb-1">Soil Moisture</label>
              <input
                type="text"
                value={moisture}
                onChange={(e) => setMoisture(e.target.value)}
                placeholder="e.g. Medium to Dry"
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#5d6b60] mb-1">Mature Height</label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 3–5 ft"
                className="w-full rounded-xl border border-[#d8d3bf] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#5d6b60] mb-1">Botanical Description & Distinctive Traits</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Distinctive visual leaf margins, flower traits, and ecological role..."
              className="w-full rounded-xl border border-[#d8d3bf] bg-white p-3 text-xs text-[#163f2c] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#e8e4d5] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#d8d3bf] bg-white px-4 py-2 text-xs font-bold text-[#5d6b60] hover:bg-[#f3f0e6]"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-dark px-6 py-2 text-xs font-bold">
              Save Plant Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
