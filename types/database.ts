export type UserRole = 'patient' | 'doctor' | 'lab' | 'diagnostic_center' | 'driver' | 'admin';

export type ContributorType = 'doctor' | 'lab' | 'diagnostic_center';

export type ContributorDomain = 'allopathy' | 'ayurveda' | 'homeopathy' | 'lab' | 'diagnostic';

export type EventType = 'diagnosis' | 'prescription' | 'lab_report' | 'note' | 'ai_summary';

export type TrustTier = 'self_reported' | 'patient_uploaded' | 'institution_verified' | 'doctor_confirmed';

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export type DriverStatus = 'available' | 'busy';

export type DispatchStatus = 'requested' | 'accepted' | 'enroute' | 'arrived';

export interface User {
  id: string;
  auth_id: string;
  role: UserRole;
  name: string;
  email: string;
  created_at: string;
}

export interface Patient {
  id: string;
  user_id: string;
  dob: string;
  gender: string;
  deidentified_code: string;
}

export interface Contributor {
  id: string;
  user_id: string;
  type: ContributorType;
  domain: ContributorDomain;
  verified_id: string;
}

export interface ClinicalEvent {
  id: string;
  patient_id: string;
  contributor_id: string | null;
  event_type: EventType;
  trust_tier: TrustTier;
  content: Record<string, unknown>;
  embedding?: number[];
  created_at: string;
  // Joined fields (optional, from queries)
  contributor?: Contributor & { user?: Pick<User, 'name'> };
}

export interface AiSummaryContent {
  chief_complaint: string;
  hpi: string;
  past_history: string;
  relevant_results: string;
  rejected?: boolean;
}

export interface Claim {
  id: string;
  patient_id: string;
  hospital_bill_amount: number;
  insurer_name: string;
  status: ClaimStatus;
  created_at: string;
}

export interface PatientCredit {
  patient_id: string;
  credit_limit: number;
  used_amount: number;
}

export interface AmbulanceDriver {
  id: string;
  user_id: string;
  vehicle_no: string;
  current_lat: number;
  current_lng: number;
  status: DriverStatus;
}

export interface DispatchRequest {
  id: string;
  patient_id: string;
  driver_id: string;
  patient_lat: number;
  patient_lng: number;
  status: DispatchStatus;
  created_at: string;
}
