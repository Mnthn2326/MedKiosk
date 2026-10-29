'use client';

import React from 'react';
import { 
  CheckCircle2, 
  PhoneCall, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight 
} from 'lucide-react';
import type { DispatchStatus } from '@/types/database';

interface LiveDispatchTrackerProps {
  status: DispatchStatus;
  progressPercent?: number;
  driverName: string;
  vehicleNo: string;
  driverPhone: string;
  hospitalStation: string;
  onStepProgress: () => void;
  isAutoSimulating: boolean;
  onToggleAutoSimulate: () => void;
  onCancelDispatch: () => void;
}

const STEPS: Array<{ id: DispatchStatus; label: string; desc: string }> = [
  { id: 'requested', label: 'SOS Broadcast', desc: 'Locating closest available ALS vehicle' },
  { id: 'accepted', label: 'Ambulance Assigned', desc: 'Driver & paramedic team confirmed' },
  { id: 'enroute', label: 'En Route', desc: 'Live GPS navigation & siren active' },
  { id: 'arrived', label: 'On Scene', desc: 'Paramedics arrived at patient address' },
];

export function LiveDispatchTracker({
  status,
  progressPercent: _progressPercent,
  driverName,
  vehicleNo,
  driverPhone,
  hospitalStation,
  onStepProgress,
  isAutoSimulating,
  onToggleAutoSimulate,
  onCancelDispatch,
}: LiveDispatchTrackerProps) {
  const getStepIndex = (s: DispatchStatus) => {
    switch (s) {
      case 'requested': return 0;
      case 'accepted': return 1;
      case 'enroute': return 2;
      case 'arrived': return 3;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(status);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Header with Demo Simulation Toolbar */}
      <div className="p-5 border-b border-border bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <h3 className="font-bold text-base text-text-primary">
              Active Dispatch Mission #{vehicleNo.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}
            </h3>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Station: {hospitalStation}
          </p>
        </div>

        {/* Demo Fast-Forward Simulation Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={onToggleAutoSimulate}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isAutoSimulating
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-primary-light text-primary hover:bg-primary/20'
            }`}
          >
            {isAutoSimulating ? <Pause size={13} /> : <Play size={13} />}
            <span>{isAutoSimulating ? 'Pause Auto-Sim' : 'Auto-Drive Sim'}</span>
          </button>

          {status !== 'arrived' && (
            <button
              type="button"
              onClick={onStepProgress}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <span>Step Closer</span>
              <ChevronRight size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onCancelDispatch}
            className="p-1.5 rounded-lg border border-border text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Cancel / Reset Emergency Mission"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="p-6 border-b border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={step.id} className="relative flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-rose-600 text-white ring-4 ring-rose-100 animate-pulse'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      isCurrent ? 'text-rose-600' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed pl-9">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver & Paramedic Unit Card */}
      <div className="p-6 bg-gray-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {driverName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-text-primary">{driverName}</h4>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                BLS / ALS Certified
              </span>
            </div>
            <p className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
              <span className="font-mono font-medium text-text-primary">{vehicleNo}</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">Oxygen & Defibrillator Equipped</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <a
            href={`tel:${driverPhone}`}
            onClick={(e) => {
              e.preventDefault();
              alert(`Simulated call placed to Driver Vikram (${driverPhone}).`);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-xs font-semibold text-text-primary hover:bg-gray-100 transition-colors shadow-2xs"
          >
            <PhoneCall size={14} className="text-emerald-600" />
            <span>Call Ambulance Driver</span>
          </a>
        </div>
      </div>
    </div>
  );
}
