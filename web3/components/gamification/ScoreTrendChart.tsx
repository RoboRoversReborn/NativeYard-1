"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Calendar, Leaf, TrendingUp } from "lucide-react";
import type { ScoreHistoryPoint } from "@/lib/types";

interface ScoreTrendChartProps {
  history: ScoreHistoryPoint[];
}

export function ScoreTrendChart({ history }: ScoreTrendChartProps) {
  const areaOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const pt of history) {
      if (!map.has(pt.areaId)) {
        map.set(pt.areaId, `${pt.areaName} (${pt.propertyName})`);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [history]);

  const [selectedAreaId, setSelectedAreaId] = useState<string>("ALL");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (selectedAreaId === "ALL") return history;
    return history.filter((pt) => pt.areaId === selectedAreaId);
  }, [history, selectedAreaId]);

  if (history.length === 0) {
    return (
      <div className="rounded-3xl border border-[#e2dec9] bg-white p-8 text-center shadow-2xs">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f0e6] text-[#2f7d3a]">
          <TrendingUp className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-lg font-bold text-[#163f2c]">
          No Saved Yard Scans Yet
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#5d6b60]">
          Run a yard audit and click <strong>Save Scan</strong> to start tracking your
          Native Score progression over time.
        </p>
      </div>
    );
  }

  const chartW = 680;
  const chartH = 220;
  const padL = 36;
  const padR = 20;
  const padT = 18;
  const padB = 30;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const coords = filtered.map((pt, idx) => {
    const x =
      filtered.length === 1
        ? padL + innerW / 2
        : padL + (idx / (filtered.length - 1)) * innerW;
    const clampedScore = Math.max(0, Math.min(100, pt.score));
    const y = padT + innerH - (clampedScore / 100) * innerH;
    return { x, y, pt };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padT + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : "";

  const activePoint =
    hoveredIdx !== null && coords[hoveredIdx]
      ? coords[hoveredIdx].pt
      : filtered[filtered.length - 1];

  const firstScore = filtered[0]?.score ?? 0;
  const latestScore = filtered[filtered.length - 1]?.score ?? 0;
  const netChange = filtered.length > 1 ? latestScore - firstScore : null;

  return (
    <div className="space-y-5">
      {/* Header & Filter */}
      <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#163f2c]">
              Yard Native Score Over Time
            </h2>
            <p className="text-xs text-[#5d6b60]">
              Track ecological progress across re-scans as you replace invasives with natives.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {netChange !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  netChange >= 0
                    ? "bg-[#e8f5e9] text-[#2f7d3a]"
                    : "bg-[#fdecea] text-[#b42318]"
                }`}
              >
                {netChange >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {netChange >= 0 ? `+${netChange}` : netChange} pts net
              </span>
            )}

            <select
              value={selectedAreaId}
              onChange={(e) => {
                setSelectedAreaId(e.target.value);
                setHoveredIdx(null);
              }}
              className="rounded-full border border-[#e2dec9] bg-[#faf9f5] px-3.5 py-1.5 text-xs font-semibold text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#2f7d3a]"
            >
              <option value="ALL">All Yard Areas ({history.length} scans)</option>
              {areaOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full min-w-[460px] h-auto select-none"
            role="img"
            aria-label="Yard Native Score trend chart"
          >
            <defs>
              <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2f7d3a" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#2f7d3a" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = padT + innerH - (tick / 100) * innerH;
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                    stroke="#e9e5d6"
                    strokeDasharray={tick === 0 ? undefined : "4 4"}
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#7a806e"
                    fontWeight="600"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            {coords.length > 1 && <path d={areaPath} fill="url(#scoreAreaGrad)" />}

            {/* Line */}
            {coords.length > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke="#163f2c"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {coords.map((c, idx) => {
              const isSelected =
                hoveredIdx === idx || (hoveredIdx === null && idx === coords.length - 1);
              return (
                <g
                  key={c.pt.scanId}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onClick={() => setHoveredIdx(idx)}
                >
                  <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isSelected ? "6.5" : "4.5"}
                    fill={isSelected ? "#d7f27a" : "#ffffff"}
                    stroke="#163f2c"
                    strokeWidth="2.5"
                  />
                  <text
                    x={c.x}
                    y={chartH - 8}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#7a806e"
                  >
                    {new Date(c.pt.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Active Scan Summary Bar */}
        {activePoint && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e2dec9] bg-[#faf9f5] px-4 py-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#163f2c] font-serif text-sm font-bold text-[#d7f27a]">
                {activePoint.score}
              </span>
              <div>
                <div className="font-bold text-[#163f2c]">
                  {activePoint.areaName} · {activePoint.grade}
                </div>
                <div className="flex items-center gap-1.5 text-[#5d6b60]">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(activePoint.createdAt).toLocaleDateString()}</span>
                  {activePoint.deltaFromPrevious !== null && (
                    <span
                      className={`font-bold ${
                        activePoint.deltaFromPrevious >= 0
                          ? "text-[#2f7d3a]"
                          : "text-[#b42318]"
                      }`}
                    >
                      ({activePoint.deltaFromPrevious >= 0 ? "+" : ""}
                      {activePoint.deltaFromPrevious} vs prior scan)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-semibold text-[#425445]">
              <span>⭐ {activePoint.keystoneCount} Keystones</span>
              <span>🟢 {activePoint.nativeCount} Natives</span>
              <span>🔴 {activePoint.invasiveCount} Invasives</span>
            </div>
          </div>
        )}
      </div>

      {/* Scan Timeline List */}
      <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 sm:p-6 shadow-2xs">
        <h3 className="font-serif text-base font-bold text-[#163f2c] mb-3">
          Scan Log ({filtered.length})
        </h3>
        <div className="divide-y divide-[#efeadd]">
          {[...filtered].reverse().map((pt) => (
            <div
              key={pt.scanId}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f0e6] font-bold text-[#163f2c]">
                  {pt.score}
                </span>
                <div>
                  <div className="font-bold text-[#163f2c]">
                    {pt.areaName}{" "}
                    <span className="font-normal text-[#7a806e]">({pt.propertyName})</span>
                  </div>
                  <div className="text-[#5d6b60]">
                    {new Date(pt.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {pt.plantsCount} plants detected
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pt.deltaFromPrevious !== null && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-bold ${
                      pt.deltaFromPrevious >= 0
                        ? "bg-[#e8f5e9] text-[#2f7d3a]"
                        : "bg-[#fdecea] text-[#b42318]"
                    }`}
                  >
                    {pt.deltaFromPrevious >= 0 ? "+" : ""}
                    {pt.deltaFromPrevious} pts
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-[#faf9f5] border border-[#e2dec9] px-2.5 py-0.5 font-semibold text-[#425445]">
                  <Leaf className="h-3 w-3 text-[#2f7d3a]" />
                  {pt.nativeCount} native
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
