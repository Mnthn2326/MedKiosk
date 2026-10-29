'use client';

import React from 'react';
import { Compass, Radio } from 'lucide-react';
import type { DispatchStatus } from '@/types/database';

interface EmergencyRadarMapProps {
  status: DispatchStatus;
  progressPercent: number; // 0 (at station) to 100 (arrived at patient)
  patientLat?: number;
  patientLng?: number;
  driverLat: number;
  driverLng: number;
  distanceKm: number;
  etaMinutes: number;
}

export function EmergencyRadarMap({
  status,
  progressPercent,
  patientLat: _patientLat,
  patientLng: _patientLng,
  driverLat,
  driverLng,
  distanceKm,
  etaMinutes,
}: EmergencyRadarMapProps) {
  // Interpolated ambulance position on the SVG route canvas
  // Start at (120, 80), End at (680, 240)
  const startX = 140;
  const startY = 80;
  const endX = 660;
  const endY = 240;

  // Bezier curve control points
  const p = Math.max(0, Math.min(100, progressPercent)) / 100;
  
  // Quadratic bezier interpolation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const cpX = 420;
  const cpY = 60;
  const currentX = (1 - p) * (1 - p) * startX + 2 * (1 - p) * p * cpX + p * p * endX;
  const currentY = (1 - p) * (1 - p) * startY + 2 * (1 - p) * p * cpY + p * p * endY;

  return (
    <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-800 shadow-xl text-white">
      {/* Map Top Bar */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-200">Live GPS Telemetry</span>
          <span className="text-slate-500 font-mono">OpenStreetMap Layer</span>
        </div>

        <div className="flex items-center gap-4 text-slate-300">
          <div className="flex items-center gap-1.5 font-mono">
            <Radio size={14} className="text-emerald-400 animate-pulse" />
            <span>4G Cellular Fix</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-mono">
            <Compass size={14} className="text-sky-400" />
            <span>GPS: {driverLat.toFixed(4)}° N, {driverLng.toFixed(4)}° E</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Map with Grid & Route */}
      <div className="relative w-full h-[320px] sm:h-[380px] bg-[#0c1322] select-none overflow-hidden">
        {/* Subtle Map Grid Lines */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), radial-gradient(#38bdf8 1px, #0c1322 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />

        {/* Radar concentric range rings centered on patient */}
        <div className="absolute right-[12%] bottom-[15%] w-64 h-64 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
          <div className="w-full h-full rounded-full border border-sky-400 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-4 rounded-full border border-sky-400" />
          <div className="absolute inset-16 rounded-full border border-sky-400" />
        </div>

        {/* Route SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Road Corridor Background */}
          <path
            d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Planned Trajectory */}
          <path
            d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
            fill="none"
            stroke="url(#routeGrad)"
            strokeWidth="4"
            strokeDasharray="6 6"
            strokeLinecap="round"
            className="opacity-70"
          />

          {/* Traveled Route Line */}
          {p > 0 && (
            <path
              d={`M ${startX} ${startY} Q ${startX + (cpX - startX) * p} ${startY + (cpY - startY) * p} ${currentX} ${currentY}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          )}

          {/* Hospital Station Base (Start) */}
          <g transform={`translate(${startX}, ${startY})`}>
            <circle r="18" fill="#0284c7" className="opacity-30 animate-pulse" />
            <circle r="12" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">H</text>
            <text x="0" y="30" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">Base Station</text>
          </g>

          {/* Patient Location (End Destination) */}
          <g transform={`translate(${endX}, ${endY})`}>
            <circle r="22" fill="#ef4444" className="opacity-25 animate-ping" />
            <circle r="14" fill="#dc2626" stroke="#fca5a5" strokeWidth="2.5" />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="12">★</text>
            <text x="0" y="32" textAnchor="middle" fill="#f87171" fontSize="12" fontWeight="bold">Patient SOS</text>
          </g>

          {/* Moving Ambulance Vehicle Marker */}
          <g transform={`translate(${currentX}, ${currentY})`}>
            {/* Siren Light Pulsing Halo */}
            <circle r="20" fill="#38bdf8" className="opacity-40 animate-ping" />
            <circle r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="2.5" filter="url(#glow)" />
            {/* Red / Blue Siren Mini Light */}
            <circle cx="-3" cy="-3" r="3" fill="#ef4444" />
            <circle cx="3" cy="-3" r="3" fill="#38bdf8" />
            <text x="0" y="5" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">AMB</text>
            
            {/* Tooltip on top of ambulance */}
            <g transform="translate(0, -28)">
              <rect x="-45" y="-12" width="90" height="20" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
              <text x="0" y="2" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
                {status === 'arrived' ? 'ARRIVED' : `${etaMinutes} min away`}
              </text>
            </g>
          </g>
        </svg>

        {/* HUD Overlay Stats Card */}
        <div className="absolute left-4 bottom-4 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/80 shadow-lg text-xs space-y-2 max-w-[240px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Remaining Dist.</span>
            <span className="font-mono font-bold text-white text-sm">
              {status === 'arrived' ? '0.0 km' : `${distanceKm.toFixed(1)} km`}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">ETA to Scene</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {status === 'arrived' ? 'On Scene' : `~${etaMinutes} mins`}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
            <span className="text-slate-400">Vehicle Speed</span>
            <span className="font-mono font-semibold text-slate-200">
              {status === 'arrived' ? '0 km/h' : '52 km/h'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
