'use client';

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Lock, Smartphone, CreditCard as CardIcon, Building2 } from 'lucide-react';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  hospitalName: string;
  insurerName: string;
  onSuccess: (paymentId: string) => void;
}

export function RazorpayModal({
  isOpen,
  onClose,
  amount,
  hospitalName,
  insurerName,
  onSuccess,
}: RazorpayModalProps) {
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('patient@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => {
        const dummyPaymentId = `pay_sim_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        onSuccess(dummyPaymentId);
        setSuccess(false);
        onClose();
      }, 1200);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border"
        role="dialog"
        aria-modal="true"
      >
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] text-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-xl text-blue-400">Razorpay</span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Test Mode
              </span>
            </div>
            <button
              onClick={onClose}
              disabled={processing}
              className="text-white/70 hover:text-white p-1 rounded-lg text-sm"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-white/10">
            <div>
              <p className="text-xs text-white/60">Paying to</p>
              <h3 className="font-semibold text-sm text-white truncate max-w-[220px]">
                {hospitalName || 'MedNotes Healthcare Partner'}
              </h3>
              {insurerName && (
                <p className="text-[10px] text-blue-300 truncate max-w-[220px]">
                  Insurer: {insurerName}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Amount</p>
              <p className="text-xl font-bold text-white">₹{amount.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {success ? (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">Payment Successful!</h4>
            <p className="text-sm text-gray-500 mb-3">Test payment authorized via Razorpay Gateway</p>
            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200">
              Ref: pay_sim_{Math.random().toString(36).substring(2, 8).toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="p-6">
            {/* Payment Method Selector */}
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Select Test Payment Instrument
            </label>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  method === 'upi'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs'
                    : 'border-border text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Smartphone size={18} />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  method === 'card'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs'
                    : 'border-border text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CardIcon size={18} />
                <span>Card (Test)</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('netbanking')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  method === 'netbanking'
                    ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs'
                    : 'border-border text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 size={18} />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Method Inputs */}
            {method === 'upi' && (
              <div className="space-y-3 mb-6 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <label className="block text-xs font-medium text-gray-700">Virtual Payment Address (VPA)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name@bank"
                />
                <p className="text-[11px] text-gray-500">
                  Instant authorization simulation. No OTP or real bank debit required.
                </p>
              </div>
            )}

            {method === 'card' && (
              <div className="space-y-3 mb-6 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Test Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Valid Thru</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="space-y-3 mb-6 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <label className="block text-xs font-medium text-gray-700">Select Simulated Bank</label>
                <select className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>HDFC Bank (Simulated)</option>
                  <option>ICICI Bank (Simulated)</option>
                  <option>State Bank of India (Simulated)</option>
                  <option>Axis Bank (Simulated)</option>
                </select>
                <p className="text-[11px] text-gray-500">
                  Simulated gateway redirects automatically with instant approval.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <button
              onClick={handlePay}
              disabled={processing}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Processing Test Payment...</span>
                </>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Pay ₹{amount.toLocaleString('en-IN')} (Test Mode)</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-gray-400">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Simulated 256-bit SSL Sandbox • Zero real currency movement</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
