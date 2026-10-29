'use client';

import React, { useState } from 'react';
import { CreditCardWidget } from '@/components/finhealth/CreditCardWidget';
import { ClaimsTracker } from '@/components/finhealth/ClaimsTracker';
import { ClaimSubmissionModal } from '@/components/finhealth/ClaimSubmissionModal';
import { RazorpayModal } from '@/components/finhealth/RazorpayModal';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import type { Claim, ClaimStatus, PatientCredit } from '@/types/database';

interface FinHealthClientProps {
  initialClaims: Claim[];
  initialCredit: PatientCredit;
  patientCode: string;
  patientName?: string;
  patientId: string;
}

const DEFAULT_DEMO_CLAIMS: Claim[] = [
  {
    id: 'clm-88219-01',
    patient_id: 'default',
    hospital_bill_amount: 14200,
    insurer_name: 'Star Health & Allied Insurance',
    status: 'under_review',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'clm-88219-02',
    patient_id: 'default',
    hospital_bill_amount: 8500,
    insurer_name: 'HDFC ERGO Health Insurance',
    status: 'approved',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'clm-88219-03',
    patient_id: 'default',
    hospital_bill_amount: 4200,
    insurer_name: 'Care Health Insurance',
    status: 'submitted',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

export default function FinHealthClient({
  initialClaims,
  initialCredit,
  patientCode,
  patientName,
  patientId,
}: FinHealthClientProps) {
  const [claims, setClaims] = useState<Claim[]>(
    initialClaims && initialClaims.length > 0 ? initialClaims : DEFAULT_DEMO_CLAIMS
  );

  const [credit, setCredit] = useState<PatientCredit>(
    initialCredit || {
      patient_id: patientId,
      credit_limit: 50000,
      used_amount: 14200,
    }
  );

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    hospitalName: string;
    insurerName: string;
    amount: number;
    claimType: string;
    fileName?: string;
  } | null>(null);

  // File Claim Handler
  const handleStartSubmit = (data: {
    hospitalName: string;
    insurerName: string;
    amount: number;
    claimType: string;
    fileName?: string;
    payFirstWithRazorpay: boolean;
  }) => {
    setIsClaimModalOpen(false);

    if (data.payFirstWithRazorpay) {
      setPendingPayment({
        hospitalName: data.hospitalName,
        insurerName: data.insurerName,
        amount: data.amount,
        claimType: data.claimType,
        fileName: data.fileName,
      });
      setIsRazorpayModalOpen(true);
    } else {
      createClaimRecord(data.hospitalName, data.insurerName, data.amount, false);
    }
  };

  const handleRazorpaySuccess = (paymentId: string) => {
    if (!pendingPayment) return;
    createClaimRecord(
      pendingPayment.hospitalName,
      pendingPayment.insurerName,
      pendingPayment.amount,
      true,
      paymentId
    );
    setPendingPayment(null);
  };

  const createClaimRecord = (
    hospitalName: string,
    insurerName: string,
    amount: number,
    paidViaRazorpay: boolean,
    _paymentRef?: string
  ) => {
    const newClaim: Claim = {
      id: `clm-${Math.random().toString(36).substring(2, 9)}`,
      patient_id: patientId,
      hospital_bill_amount: amount,
      insurer_name: insurerName,
      status: 'submitted',
      created_at: new Date().toISOString(),
    };

    setClaims((prev) => [newClaim, ...prev]);

    // Update utilized credit if paid via credit bridge
    setCredit((prev) => ({
      ...prev,
      used_amount: Math.min(prev.credit_limit, prev.used_amount + amount),
    }));

    if (paidViaRazorpay) {
      toast.success(
        `Payment of ₹${amount.toLocaleString('en-IN')} authorized via Razorpay Test Mode! Claim filed.`
      );
    } else {
      toast.success(`Claim for ₹${amount.toLocaleString('en-IN')} submitted to ${insurerName}.`);
    }
  };

  // Status Progression Simulation
  const handleAdvanceStatus = (claimId: string, nextStatus: ClaimStatus) => {
    setClaims((prev) =>
      prev.map((c) => {
        if (c.id === claimId) {
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );

    const targetClaim = claims.find((c) => c.id === claimId);
    const amount = targetClaim ? Number(targetClaim.hospital_bill_amount) : 0;

    if (nextStatus === 'approved') {
      // Reimburse: reduce used credit amount
      setCredit((prev) => ({
        ...prev,
        used_amount: Math.max(0, prev.used_amount - amount),
      }));
      toast.success(`Claim #${claimId.substring(0, 8)} approved! ₹${amount.toLocaleString('en-IN')} settled to credit balance.`);
    } else if (nextStatus === 'rejected') {
      toast.error(`Claim #${claimId.substring(0, 8)} declined by insurer adjudication.`);
    } else {
      toast.info(`Claim #${claimId.substring(0, 8)} moved to under review.`);
    }
  };

  const handleTopUpCredit = () => {
    setCredit((prev) => ({
      ...prev,
      credit_limit: prev.credit_limit + 25000,
    }));
    toast.success('Medical credit line increased by ₹25,000 (Test Simulation).');
  };

  const handleResetClaims = () => {
    setClaims(DEFAULT_DEMO_CLAIMS);
    setCredit({
      patient_id: patientId,
      credit_limit: 50000,
      used_amount: 14200,
    });
    toast.info('FinHealth simulation reset to initial demo parameters.');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              FinHealth Insurance & Credit Bridge
            </h1>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-primary-light text-primary border border-primary/20">
              Module 2 • Simulated Test Mode
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Cashless hospitalization credit line and real-time medical claim status tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsClaimModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-[#0c3c48] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle size={16} />
          <span>File New Claim</span>
        </button>
      </div>

      {/* Credit Line Widget */}
      <CreditCardWidget
        credit={credit}
        patientCode={patientCode}
        patientName={patientName}
        onTopUpCredit={handleTopUpCredit}
      />

      {/* Claims Ledger & Status Progression Tracker */}
      <ClaimsTracker
        claims={claims}
        onAdvanceStatus={handleAdvanceStatus}
        onResetClaims={handleResetClaims}
      />

      {/* Modals */}
      <ClaimSubmissionModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onSubmitClaim={handleStartSubmit}
      />

      <RazorpayModal
        isOpen={isRazorpayModalOpen}
        onClose={() => {
          setIsRazorpayModalOpen(false);
          setPendingPayment(null);
        }}
        amount={pendingPayment?.amount || 0}
        hospitalName={pendingPayment?.hospitalName || ''}
        insurerName={pendingPayment?.insurerName || ''}
        onSuccess={handleRazorpaySuccess}
      />
    </div>
  );
}
