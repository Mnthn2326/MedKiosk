'use client';

import { useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

interface PatientListItem {
  id: string;
  deidentified_code: string;
  gender: string | null;
  dob: string | null;
}

export default function DoctorPatientsClient({
  patients,
}: {
  patients: PatientListItem[];
}) {
  const [search, setSearch] = useState('');

  const filtered = patients.filter((p) =>
    p.deidentified_code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Search by deidentified code */}
      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Search by de-identified code (e.g., MK-A1B2C3D4)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 pr-16 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-mono font-medium text-text-muted bg-gray-100 border border-border rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Patient list */}
      {filtered.length === 0 ? (
        <p className="text-text-muted text-center py-8">
          {search ? 'No patients match your search.' : 'No patients found.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((patient) => (
            <Card key={patient.id} className="hover:shadow-md transition-shadow mb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(patient.deidentified_code);
                        toast.success("Copied code to clipboard");
                      }}
                      className="font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                      title="Copy Patient Code"
                    >
                      {patient.deidentified_code}
                      <Icon name="copy" size={14} className="text-text-muted opacity-50 hover:opacity-100" />
                    </button>
                  </div>
                  <Link href={`/doctor/timeline/${patient.id}`}>
                    <p className="text-sm text-text-muted hover:text-text-primary transition-colors">
                      {patient.gender && `Gender: ${patient.gender}`}
                      {patient.gender && patient.dob && ' · '}
                      {patient.dob && `DOB: ${new Date(patient.dob).toLocaleDateString()}`}
                    </p>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/doctor/timeline/${patient.id}?consult=true`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Icon name="diagnosis" size={14} className="text-white" /> Start Consultation
                  </Link>
                  <Link
                    href={`/doctor/timeline/${patient.id}`}
                    className="text-text-muted text-sm hover:text-primary transition-colors"
                  >
                    View Timeline →
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
