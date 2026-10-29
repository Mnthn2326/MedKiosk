import {
  Stethoscope,
  Sparkles,
  FlaskConical,
  Activity,
  Thermometer,
  Weight,
  Pill,
  AlertTriangle,
  MessageSquare,
  FileText,
  Copy,
  CreditCard,
  Siren,
  Receipt,
  PhoneCall,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type IconName = 
  | 'diagnosis' 
  | 'ai' 
  | 'lab' 
  | 'vitals' 
  | 'heart' 
  | 'temperature' 
  | 'weight' 
  | 'prescription' 
  | 'alert' 
  | 'chat' 
  | 'notes'
  | 'copy'
  | 'finhealth'
  | 'emergency'
  | 'creditCard'
  | 'siren'
  | 'receipt'
  | 'phone'
  | 'shield'
  | 'mapPin';

const iconMap: Record<IconName, LucideIcon> = {
  diagnosis: Stethoscope,
  ai: Sparkles,
  lab: FlaskConical,
  vitals: Activity,
  heart: Activity, // Using Activity for heart rate
  temperature: Thermometer,
  weight: Weight,
  prescription: Pill,
  alert: AlertTriangle,
  chat: MessageSquare,
  notes: FileText,
  copy: Copy,
  finhealth: CreditCard,
  emergency: Siren,
  creditCard: CreditCard,
  siren: Siren,
  receipt: Receipt,
  phone: PhoneCall,
  shield: ShieldCheck,
  mapPin: MapPin,
};

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

export function Icon({ name, className, size = 16, ...props }: IconProps) {
  const LucideComponent = iconMap[name];
  
  if (!LucideComponent) {
    return null;
  }

  return (
    <LucideComponent 
      size={size} 
      className={className} 
      {...props} 
      aria-hidden={props['aria-label'] ? undefined : true}
    />
  );
}
