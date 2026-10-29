'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CallAmbulanceCard } from '@/components/emergency/CallAmbulanceCard';
import { LiveDispatchTracker } from '@/components/emergency/LiveDispatchTracker';
import { EmergencyRadarMap } from '@/components/emergency/EmergencyRadarMap';
import { toast } from 'sonner';
import type { DispatchStatus } from '@/types/database';

interface EmergencyClientProps {
  patientCode: string;
  patientName?: string;
  patientId: string;
}

export default function EmergencyClient({
  patientCode,
  patientName: _patientName,
  patientId: _patientId,
}: EmergencyClientProps) {
  const [hasActiveSos, setHasActiveSos] = useState(false);
  const [status, setStatus] = useState<DispatchStatus>('requested');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);

  // Geo state
  const [patientCoords, setPatientCoords] = useState({
    lat: 28.6280,
    lng: 77.3649,
    address: 'Sector 62, Electronic City, Noida',
  });

  const baseDriverCoords = { lat: 28.5800, lng: 77.3100 };
  const [distanceKm, setDistanceKm] = useState(4.8);
  const [etaMinutes, setEtaMinutes] = useState(8);

  const driverDetails = {
    driverName: 'Vikram Singh',
    vehicleNo: 'DL-01-AM-9921',
    driverPhone: '+91 98765 43210',
    hospitalStation: 'Apollo Emergency Trauma Care, Hub 4',
  };

  // SOS Trigger
  const handleTriggerEmergency = (data: {
    address: string;
    lat: number;
    lng: number;
    chiefEmergency: string;
  }) => {
    setPatientCoords({
      address: data.address,
      lat: data.lat,
      lng: data.lng,
    });
    setHasActiveSos(true);
    setStatus('requested');
    setProgressPercent(10);
    setDistanceKm(4.8);
    setEtaMinutes(8);

    toast.warning('EMERGENCY SOS BROADCASTED! Locating nearest ALS ambulance...');

    // Auto-transition to accepted after short delay
    setTimeout(() => {
      setStatus('accepted');
      setProgressPercent(25);
      toast.success('Ambulance Assigned: DL-01-AM-9921 (Driver Vikram Singh).');
    }, 1400);
  };

  // Step Progress
  const handleStepProgress = useCallback(() => {
    if (status === 'requested') {
      setStatus('accepted');
      setProgressPercent(25);
      setDistanceKm(3.8);
      setEtaMinutes(7);
      toast.info('Ambulance confirmed & dispatched from Trauma Hub.');
    } else if (status === 'accepted') {
      setStatus('enroute');
      setProgressPercent(55);
      setDistanceKm(2.1);
      setEtaMinutes(4);
      toast.info('Ambulance en route. Approaching Sector 62.');
    } else if (status === 'enroute' && progressPercent < 85) {
      setProgressPercent(85);
      setDistanceKm(0.7);
      setEtaMinutes(1);
      toast.info('Ambulance 1 minute away! Siren audible.');
    } else {
      setStatus('arrived');
      setProgressPercent(100);
      setDistanceKm(0);
      setEtaMinutes(0);
      setIsAutoSimulating(false);
      toast.success('AMBULANCE ARRIVED ON SCENE. Paramedics deploying equipment.');
    }
  }, [status, progressPercent]);

  // Auto-drive simulation loop
  useEffect(() => {
    if (!isAutoSimulating || status === 'arrived') return;

    const timer = setInterval(() => {
      handleStepProgress();
    }, 2500);

    return () => clearInterval(timer);
  }, [isAutoSimulating, status, handleStepProgress]);

  const handleToggleAutoSimulate = () => {
    if (status === 'arrived') {
      toast.info('Ambulance already arrived at destination.');
      return;
    }
    const nextVal = !isAutoSimulating;
    setIsAutoSimulating(nextVal);
    if (nextVal) {
      toast.info('Auto-Drive simulation started. Ambulance advancing in real time...');
    }
  };

  const handleCancelDispatch = () => {
    setHasActiveSos(false);
    setStatus('requested');
    setProgressPercent(0);
    setIsAutoSimulating(false);
    setDistanceKm(4.8);
    setEtaMinutes(8);
    toast.info('Emergency mission concluded / reset for test demo.');
  };

  // Interpolate GPS coordinates based on progressPercent
  const currentDriverLat = baseDriverCoords.lat + (patientCoords.lat - baseDriverCoords.lat) * (progressPercent / 100);
  const currentDriverLng = baseDriverCoords.lng + (patientCoords.lng - baseDriverCoords.lng) * (progressPercent / 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Emergency SOS & Live Ambulance Dispatch
            </h1>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
              Module 3 • Realtime Dispatch
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Rapid trauma ambulance dispatch with real-time GPS tracking and emergency medical passports.
          </p>
        </div>

        {hasActiveSos && (
          <button
            type="button"
            onClick={handleCancelDispatch}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Reset SOS Simulator
          </button>
        )}
      </div>

      {/* Primary Interaction: Call Ambulance SOS Card or Active Dispatch */}
      {!hasActiveSos ? (
        <CallAmbulanceCard
          onTriggerEmergency={handleTriggerEmergency}
          patientCode={patientCode}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Tracker */}
          <LiveDispatchTracker
            status={status}
            progressPercent={progressPercent}
            driverName={driverDetails.driverName}
            vehicleNo={driverDetails.vehicleNo}
            driverPhone={driverDetails.driverPhone}
            hospitalStation={driverDetails.hospitalStation}
            onStepProgress={handleStepProgress}
            isAutoSimulating={isAutoSimulating}
            onToggleAutoSimulate={handleToggleAutoSimulate}
            onCancelDispatch={handleCancelDispatch}
          />

          {/* Live Radar Route Map */}
          <EmergencyRadarMap
            status={status}
            progressPercent={progressPercent}
            patientLat={patientCoords.lat}
            patientLng={patientCoords.lng}
            driverLat={currentDriverLat}
            driverLng={currentDriverLng}
            distanceKm={distanceKm}
            etaMinutes={etaMinutes}
          />
        </div>
      )}
    </div>
  );
}
