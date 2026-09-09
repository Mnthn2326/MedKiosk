import PatientChat from '@/components/chat/PatientChat';

export default function PatientChatPage() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-primary">Health Records Chat</h1>
        <p className="text-text-muted text-sm mt-1">
          Ask questions about your clinical records
        </p>
      </div>
      <PatientChat />
    </div>
  );
}
