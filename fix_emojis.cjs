const fs = require('fs');

function replaceEmojis() {
  const file = 'app/doctor/timeline/[patientId]/DoctorTimelineClient.tsx';
  let content = fs.readFileSync(file, 'utf8');

  const IconImport = 'import { Icon } from "@/components/ui/Icon";\n';
  if (!content.includes('import { Icon }')) {
    content = content.replace("import Button from '@/components/ui/Button';", "import Button from '@/components/ui/Button';\n" + IconImport);
  }

  // Use unicode matches for the emojis to be safe
  content = content.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]+\s*Record Consultation \/ Diagnosis/gu, '<Icon name="diagnosis" size={16} /> Record Consultation / Diagnosis');
  content = content.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]+\s*Generate AI Summary/gu, '<span className="inline-flex items-center gap-1.5"><Icon name="ai" size={16} /> Generate AI Summary</span>');

  fs.writeFileSync(file, content);

  const modalFile = 'components/clinical/DoctorConsultationModal.tsx';
  let modalContent = fs.readFileSync(modalFile, 'utf8');
  if (!modalContent.includes('import { Icon }')) {
    modalContent = modalContent.replace("import Button from '@/components/ui/Button';", "import Button from '@/components/ui/Button';\n" + IconImport);
  }
  modalContent = modalContent.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]+\s*Record Consultation/gu, '<Icon name="diagnosis" size={16} /> Record Consultation');
  modalContent = modalContent.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]+\s*AI Extracted from Notes/gu, '<span className="inline-flex items-center gap-1.5 text-accent"><Icon name="ai" size={16} /> AI Extracted from Notes</span>');
  fs.writeFileSync(modalFile, modalContent);
  
  console.log('Fixed DoctorTimelineClient and DoctorConsultationModal');
}

replaceEmojis();
