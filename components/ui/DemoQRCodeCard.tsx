'use client';

import React, { useState } from 'react';
import { QrCode, Copy, Check, ExternalLink, Download } from 'lucide-react';

interface DemoQRCodeCardProps {
  url?: string;
  className?: string;
}

export function DemoQRCodeCard({ 
  url = 'https://medkiosk.vercel.app/login', 
  className = '' 
}: DemoQRCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'teal' | 'emerald' | 'dark'>('teal');

  const themes = {
    teal: {
      colorCode: '15-76-92', // #0F4C5C
      primaryHex: '#0F4C5C',
      bgHex: '#E7EEF0',
      label: 'Clinical Teal'
    },
    emerald: {
      colorCode: '27-138-90', // #1B8A5A
      primaryHex: '#1B8A5A',
      bgHex: '#D1FAE5',
      label: 'Doctor Green'
    },
    dark: {
      colorCode: '27-43-46', // #1B2B2E
      primaryHex: '#1B2B2E',
      bgHex: '#F1F5F9',
      label: 'Kiosk Slate'
    }
  };

  const current = themes[theme];
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&color=${current.colorCode}&bgcolor=255-255-255&margin=6&data=${encodeURIComponent(url)}`;
  const downloadPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&color=${current.colorCode}&bgcolor=255-255-255&margin=8&data=${encodeURIComponent(url)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative max-w-sm mx-auto overflow-hidden rounded-3xl border border-border bg-white shadow-xl ${className}`}>
      {/* Brand Accent Top Stripe */}
      <div className="h-2 w-full bg-gradient-to-r from-primary via-success to-accent" />

      <div className="p-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs transition-colors"
              style={{ backgroundColor: current.primaryHex }}
            >
              +
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-primary">
                  MediKiosk<span className="text-accent">+</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-confirmed-bg text-status-confirmed-text border border-success/30">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-text-muted">Doctor & Patient Login</p>
            </div>
          </div>

          <span className="flex items-center gap-1 text-[11px] font-medium text-success bg-status-confirmed-bg px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Online
          </span>
        </div>

        {/* QR Code Container */}
        <div 
          className="relative p-4 rounded-2xl border border-primary/15 flex flex-col items-center justify-center transition-colors"
          style={{ backgroundColor: current.bgHex }}
        >
          {/* Target Corner Accents */}
          <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-sm" style={{ borderColor: current.primaryHex }} />
          <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 rounded-tr-sm" style={{ borderColor: current.primaryHex }} />
          <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 rounded-bl-sm" style={{ borderColor: current.primaryHex }} />
          <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 rounded-br-sm" style={{ borderColor: current.primaryHex }} />

          <div className="relative bg-white p-2 rounded-xl shadow-xs">
            <img 
              src={qrImageUrl} 
              alt="MediKiosk Login QR Code"
              className="w-52 h-52 object-contain rounded-lg"
            />
            {/* Center Brand Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center">
                <div 
                  className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-bold shadow-xs transition-colors"
                  style={{ backgroundColor: current.primaryHex }}
                >
                  +
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold text-text-primary text-center">
            Scan with phone camera to launch
          </p>
        </div>

        {/* Theme Pills */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {(['teal', 'emerald', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                theme === t 
                  ? 'bg-neutral-800 text-white shadow-xs' 
                  : 'bg-neutral-100 text-text-muted hover:bg-neutral-200'
              }`}
            >
              {themes[t].label}
            </button>
          ))}
        </div>

        {/* URL Pill & Action Buttons */}
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-100 text-xs font-mono text-primary border border-border">
            <span className="truncate">{url.replace('https://', '')}</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleCopy} 
                title="Copy link"
                className="p-1 hover:text-accent transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a 
                href={url} 
                target="_blank" 
                rel="noreferrer" 
                title="Open in new tab"
                className="p-1 hover:text-accent transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <a
            href={downloadPngUrl}
            target="_blank"
            download="medikiosk-login-qr.png"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors"
            style={{ backgroundColor: current.primaryHex }}
          >
            <Download className="w-3.5 h-3.5" />
            Download High-Res PNG (800x800)
          </a>
        </div>
      </div>
    </div>
  );
}
export default DemoQRCodeCard;
