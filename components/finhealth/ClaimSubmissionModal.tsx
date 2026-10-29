'use client';

import React, { useState } from 'react';
import { Upload, X, Shield, FileText, CheckCircle2, CreditCard } from 'lucide-react';

interface ClaimSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitClaim: (claimData: {
    hospitalName: string;
    insurerName: string;
    amount: number;
    claimType: string;
    fileName?: string;
    payFirstWithRazorpay: boolean;
  }) => void;
}

const INSURERS = [
  'Star Health & Allied Insurance',
  'HDFC ERGO Health Insurance',
  'Care Health Insurance',
  'Niva Bupa Health Insurance',
  'ICICI Lombard General Insurance',
  'Bajaj Allianz General Insurance',
];

const QUICK_HOSPITALS = [
  'Apollo Hospitals',
  'Max Super Speciality Hospital',
  'Fortis Healthcare',
  'City Multi-Specialty Clinic',
];

export function ClaimSubmissionModal({
  isOpen,
  onClose,
  onSubmitClaim,
}: ClaimSubmissionModalProps) {
  const [hospitalName, setHospitalName] = useState('Apollo Hospitals');
  const [insurerName, setInsurerName] = useState(INSURERS[0]);
  const [amount, setAmount] = useState('18500');
  const [claimType, setClaimType] = useState('Emergency Hospitalization');
  const [fileName, setFileName] = useState('Hospital_Discharge_Invoice_APL_882.pdf');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (payFirstWithRazorpay: boolean) => {
    const parsedAmount = parseFloat(amount);
    if (!hospitalName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please provide a valid hospital name and positive bill amount.');
      return;
    }

    onSubmitClaim({
      hospitalName: hospitalName.trim(),
      insurerName,
      amount: parsedAmount,
      claimType,
      fileName,
      payFirstWithRazorpay,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-primary-light/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary text-white">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary">File Medical Insurance Claim</h3>
              <p className="text-xs text-text-muted">Simulate test insurance adjudication & Razorpay settlement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Hospital Name */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Treating Hospital / Diagnostic Center
            </label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Apollo Hospitals"
              required
            />
            {/* Quick hospital chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_HOSPITALS.map((hosp) => (
                <button
                  key={hosp}
                  type="button"
                  onClick={() => setHospitalName(hosp)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                    hospitalName === hosp
                      ? 'bg-primary text-white border-primary'
                      : 'bg-gray-50 text-text-muted hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  {hosp}
                </button>
              ))}
            </div>
          </div>

          {/* Insurer Selection & Claim Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Insurance Provider
              </label>
              <select
                value={insurerName}
                onChange={(e) => setInsurerName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {INSURERS.map((ins) => (
                  <option key={ins} value={ins}>
                    {ins}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Treatment Category
              </label>
              <select
                value={claimType}
                onChange={(e) => setClaimType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>Emergency Hospitalization</option>
                <option>Diagnostic & Lab Scans</option>
                <option>Outpatient Consultation</option>
                <option>Prescription Medications</option>
                <option>Daycare Surgical Procedure</option>
              </select>
            </div>
          </div>

          {/* Bill Amount */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Total Hospital Invoice Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono font-medium"
                placeholder="15000"
                required
              />
            </div>
          </div>

          {/* Simulated File Attachment */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Upload Discharge Summary / Medical Bill Receipt
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  setFileName(e.dataTransfer.files[0].name);
                }
              }}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-primary bg-primary-light/50' : 'border-gray-200 hover:border-primary/50 bg-gray-50/50'
              }`}
              onClick={() => {
                const sampleFiles = [
                  'Apollo_Discharge_Invoice_2026.pdf',
                  'Max_Lab_Diagnostics_Summary.pdf',
                  'Emergency_Care_Bill_Receipt.pdf',
                ];
                setFileName(sampleFiles[Math.floor(Math.random() * sampleFiles.length)]);
              }}
            >
              <Upload size={24} className="mx-auto text-text-muted mb-1.5" />
              <p className="text-xs font-medium text-text-primary">
                Drag & drop bill invoice here, or click to browse
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                PDF, JPG or PNG up to 15MB (Simulated test attachment)
              </p>

              {fileName && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-border text-xs text-primary font-medium shadow-xs">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Test Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-800">
            <Shield size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">Simulated Test Mode Active:</span> All claim submissions and payment authorizations are mocked in test mode. No actual debit occurs.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-border bg-gray-50 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-text-muted hover:text-text-primary rounded-xl border border-border bg-white hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-primary bg-primary-light hover:bg-primary/20 rounded-xl transition-colors"
          >
            Submit Claim Only
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-[#0b3844] rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <CreditCard size={15} />
            <span>Pay with Razorpay (Test) & Submit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
