'use client';

import React from 'react';
import { CreditCard, Sparkles, ShieldCheck, PlusCircle } from 'lucide-react';
import type { PatientCredit } from '@/types/database';

interface CreditCardWidgetProps {
  credit: PatientCredit;
  patientCode: string;
  patientName?: string;
  onTopUpCredit?: () => void;
}

export function CreditCardWidget({
  credit,
  patientCode,
  patientName,
  onTopUpCredit,
}: CreditCardWidgetProps) {
  const availableAmount = Math.max(0, credit.credit_limit - credit.used_amount);
  const usedPercent = Math.min(100, Math.round((credit.used_amount / (credit.credit_limit || 1)) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      {/* Visual Medical Card (Left 1.2 col) */}
      <div className="lg:col-span-1 rounded-2xl p-6 bg-gradient-to-br from-[#0F4C5C] via-[#145d70] to-[#0a3540] text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
        {/* Decorative background circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-wide text-white">MedNotes</span>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded text-teal-100">
              Health Line
            </span>
          </div>
          <div className="w-10 h-8 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center shadow-xs">
            {/* Simulated Chip */}
            <div className="w-6 h-4 border border-amber-800/40 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
              <div className="bg-amber-600/30 rounded-xs" />
              <div className="bg-amber-600/30 rounded-xs" />
            </div>
          </div>
        </div>

        <div className="relative z-10 my-4">
          <p className="text-[11px] text-teal-200/80 uppercase tracking-widest mb-1">Available Medical Credit</p>
          <p className="text-3xl font-extrabold tracking-tight text-white">
            ₹{availableAmount.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="relative z-10 flex items-end justify-between pt-2 border-t border-white/10 text-xs">
          <div>
            <p className="text-[10px] text-teal-200/70 uppercase">
              {patientName ? `${patientName} (${patientCode})` : 'Patient ID'}
            </p>
            <p className="font-mono font-semibold tracking-wider text-white">
              {patientCode || 'MED-XXXXX'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-teal-200/70 uppercase">Valid Thru</p>
            <p className="font-mono font-semibold text-white">12/30</p>
          </div>
        </div>
      </div>

      {/* Credit Summary & Action Card (Right 2 cols) */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <CreditCard size={20} className="text-primary" />
                <span>Instant Hospitalization Credit Line</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Simulated cashless pre-approved financing for medical emergencies and inpatient admissions.
              </p>
            </div>
            {onTopUpCredit && (
              <button
                type="button"
                onClick={onTopUpCredit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-light text-primary hover:bg-primary/20 transition-colors"
                title="Simulate increasing or resetting credit limit"
              >
                <PlusCircle size={14} />
                <span>Simulate Credit Top-up</span>
              </button>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 my-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <span className="text-xs text-text-muted block">Total Credit Limit</span>
              <span className="text-xl font-bold text-text-primary">
                ₹{credit.credit_limit.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Utilized / Blocked</span>
              <span className="text-xl font-bold text-amber-700">
                ₹{credit.used_amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-xs text-text-muted block">Remaining Balance</span>
              <span className="text-xl font-bold text-emerald-600">
                ₹{availableAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Utilization Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>Credit Utilization Rate</span>
              <span className="font-medium text-text-primary">{usedPercent}% used</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usedPercent > 80
                    ? 'bg-rose-500'
                    : usedPercent > 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 mt-4 border-t border-border text-xs text-text-muted">
          <div className="flex items-center gap-1 text-emerald-700 font-medium">
            <ShieldCheck size={15} />
            <span>0% Interest EMI Bridge</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1 text-primary">
            <Sparkles size={15} />
            <span>Instant Razorpay Test Settlement</span>
          </div>
        </div>
      </div>
    </div>
  );
}
