'use client';

import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  ArrowRight, 
  Building2, 
  ShieldCheck, 
  Receipt,
  RotateCcw
} from 'lucide-react';
import type { Claim, ClaimStatus } from '@/types/database';

interface ClaimsTrackerProps {
  claims: Claim[];
  onAdvanceStatus: (claimId: string, nextStatus: ClaimStatus) => void;
  onResetClaims?: () => void;
}

export function ClaimsTracker({
  claims,
  onAdvanceStatus,
  onResetClaims,
}: ClaimsTrackerProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filteredClaims = claims.filter((claim) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return claim.status === 'submitted' || claim.status === 'under_review';
    if (filter === 'approved') return claim.status === 'approved';
    if (filter === 'rejected') return claim.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} className="animate-spin text-amber-600" />
            <span>Submitted</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <AlertCircle size={12} className="text-sky-600" />
            <span>Under Review</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} className="text-emerald-600" />
            <span>Approved & Settled</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} className="text-rose-600" />
            <span>Declined</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Header & Filter Tabs */}
      <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50">
        <div>
          <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
            <Receipt size={20} className="text-primary" />
            <span>Insurance Claims & Reimbursement Ledger</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time status progression bridge connecting hospital charges to insurers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  filter === tab
                    ? 'bg-white text-text-primary shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {onResetClaims && (
            <button
              type="button"
              onClick={onResetClaims}
              className="p-1.5 rounded-lg border border-border hover:bg-gray-100 text-text-muted hover:text-text-primary text-xs"
              title="Reset simulation to default seed data"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="p-12 text-center">
          <ShieldCheck size={36} className="mx-auto text-gray-300 mb-2" />
          <h4 className="text-sm font-semibold text-text-primary">No claims found</h4>
          <p className="text-xs text-text-muted mt-1">
            {filter === 'all'
              ? 'No medical claims have been recorded yet. Click "File New Claim" above.'
              : `No claims match the "${filter}" filter status.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-x-auto">
          {filteredClaims.map((claim) => (
            <div
              key={claim.id}
              className="p-5 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Claim Meta */}
              <div className="flex items-start gap-3 min-w-[280px]">
                <div className="p-2.5 rounded-xl bg-primary-light text-primary shrink-0 mt-0.5">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-text-muted">
                      #{claim.id.substring(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(claim.status)}
                  </div>
                  <h4 className="font-semibold text-sm text-text-primary mt-1">
                    {claim.insurer_name}
                  </h4>
                  <p className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                    <span>Amount: ₹{Number(claim.hospital_bill_amount).toLocaleString('en-IN')}</span>
                    <span>•</span>
                    <span>
                      {new Date(claim.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </p>
                </div>
              </div>

              {/* Status Simulation Controls (Demo Tooling) */}
              <div className="flex items-center gap-2 self-end md:self-center bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-xs">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Play size={10} className="fill-current text-primary" />
                  Simulate
                </span>

                {claim.status === 'submitted' && (
                  <button
                    type="button"
                    onClick={() => onAdvanceStatus(claim.id, 'under_review')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors shadow-2xs"
                  >
                    <span>Start Review</span>
                    <ArrowRight size={12} />
                  </button>
                )}

                {claim.status === 'under_review' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAdvanceStatus(claim.id, 'approved')}
                      className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors shadow-2xs"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdvanceStatus(claim.id, 'rejected')}
                      className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors shadow-2xs"
                    >
                      Decline
                    </button>
                  </div>
                )}

                {claim.status === 'approved' && (
                  <span className="text-xs text-emerald-700 font-semibold px-2 py-0.5">
                    Reimbursed to Balance
                  </span>
                )}

                {claim.status === 'rejected' && (
                  <span className="text-xs text-rose-600 font-semibold px-2 py-0.5">
                    Denied by Adjudicator
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
