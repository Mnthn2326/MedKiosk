'use client';

import React, { useState, useEffect } from 'react';
import { Siren, MapPin, PhoneCall, ShieldAlert, HeartPulse, LocateFixed } from 'lucide-react';

interface CallAmbulanceCardProps {
  onTriggerEmergency: (locationData: {
    address: string;
    lat: number;
    lng: number;
    chiefEmergency: string;
  }) => void;
  patientCode: string;
}

export function CallAmbulanceCard({
  onTriggerEmergency,
  patientCode,
}: CallAmbulanceCardProps) {
  const [address, setAddress] = useState('Sector 62, Electronic City, Noida (Near Metro Gate 2)');
  const [lat, setLat] = useState(28.6280);
  const [lng, setLng] = useState(77.3649);
  const [locating, setLocating] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('Severe Chest Pain & Acute Dyspnea');

  const detectLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setAddress(`Current GPS Fix (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setLocating(false);
        },
        () => {
          // Graceful fallback to default landmark
          setLocating(false);
        },
        { timeout: 5000 }
      );
    }
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handleCall = () => {
    onTriggerEmergency({
      address: address.trim(),
      lat,
      lng,
      chiefEmergency: emergencyReason,
    });
  };

  return (
    <div className="bg-surface-card rounded-2xl border-2 border-rose-200/80 dark:border-rose-900/40 shadow-md p-6 sm:p-8 relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full bg-rose-500/5 dark:bg-rose-500/10 pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Left Column: Big Emergency Call Action */}
        <div className="lg:col-span-1 flex flex-col items-center text-center">
          <div className="relative mb-5">
            {/* Pulsing Emergency Rings */}
            <span className="absolute -inset-3 rounded-full bg-rose-500/20 dark:bg-rose-500/30 animate-ping" style={{ animationDuration: '2s' }} />
            <span className="absolute -inset-1.5 rounded-full bg-rose-500/30 dark:bg-rose-500/40 animate-pulse" />
            
            <button
              type="button"
              onClick={handleCall}
              className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#E11D48] to-[#B91C1C] dark:from-[#F43F5E] dark:to-[#BE123C] text-white flex flex-col items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer group border-4 border-white dark:border-slate-800"
              aria-label="Request Emergency Ambulance"
            >
              <Siren size={36} className="animate-bounce" />
              <span className="text-[11px] font-black tracking-widest uppercase mt-1">
                SOS
              </span>
            </button>
          </div>

          <h3 className="font-extrabold text-lg text-rose-950 dark:text-rose-100">
            One-Touch Ambulance Dispatch
          </h3>
          <p className="text-xs text-text-muted mt-1 max-w-xs">
            Tap SOS to broadcast instant telemetry to the nearest Advanced Life Support (ALS) vehicle.
          </p>

          <button
            type="button"
            onClick={handleCall}
            className="mt-4 w-full py-3 px-4 rounded-xl bg-[#E11D48] hover:bg-[#B91C1C] dark:bg-[#F43F5E] dark:hover:bg-[#BE123C] text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Siren size={18} />
            <span>DISPATCH AMBULANCE NOW</span>
          </button>
        </div>

        {/* Center Column: Location & Chief Complaint */}
        <div className="lg:col-span-1 space-y-4 border-y lg:border-y-0 lg:border-x border-border py-4 lg:py-0 lg:px-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <MapPin size={14} className="text-rose-600 dark:text-rose-400" />
                <span>Pickup Address / Landmark</span>
              </label>
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <LocateFixed size={12} className={locating ? 'animate-spin' : ''} />
                <span>Auto-Locate GPS</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-900/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-text-primary"
            />
            <div className="flex items-center justify-between text-[11px] text-text-muted mt-1">
              <span>GPS Coordinates:</span>
              <span className="font-mono">{lat.toFixed(4)}° N, {lng.toFixed(4)}° E</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">
              Reported Chief Emergency Condition
            </label>
            <select
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              className="w-full text-xs p-2.5 bg-gray-50 dark:bg-slate-900/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-text-primary"
            >
              <option>Severe Chest Pain & Acute Dyspnea</option>
              <option>Trauma / Road Accident Collision</option>
              <option>Unconscious / Non-Responsive Patient</option>
              <option>Severe Stroke Symptoms / Facial Droop</option>
              <option>High Fever with Convulsions</option>
            </select>
          </div>
        </div>

        {/* Right Column: Emergency Health Passport & Hotlines */}
        <div className="lg:col-span-1 flex flex-col justify-between space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <HeartPulse size={14} className="text-rose-600 dark:text-rose-400" />
                <span>Emergency Passport</span>
              </span>
              <span className="font-mono text-xs font-bold text-primary">{patientCode}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-text-muted block">Blood Group</span>
                <span className="font-bold text-rose-700 dark:text-rose-400 text-sm">O Positive (O+)</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-text-muted block">Critical Allergy</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 text-sm">Penicillin</span>
              </div>
            </div>

            <p className="text-[10px] text-text-muted mt-2">
              Automatically broadcast to the assigned paramedic tablet on dispatch acceptance.
            </p>
          </div>

          {/* Quick Dial Helplines */}
          <div className="flex items-center gap-2">
            <a
              href="tel:108"
              className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <PhoneCall size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Call 108 (Ambulance)</span>
            </a>
            <a
              href="tel:112"
              className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShieldAlert size={14} className="text-rose-600 dark:text-rose-400" />
              <span>Call 112 (National)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
