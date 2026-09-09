import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Generate a 768-dimensional embedding for text content.
 * Uses Gemini gemini-embedding-001 model configured to 768 dimensions.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: {
      outputDimensionality: 768,
    },
  });

  return response.embeddings?.[0]?.values ?? [];
}

/**
 * Generate a structured clinical summary from clinical event context.
 * Returns structured JSON with Chief Complaint, HPI, Past History, Relevant Results.
 */
export async function generateSummary(context: string): Promise<{
  chief_complaint: string;
  hpi: string;
  past_history: string;
  relevant_results: string;
}> {
  const prompt = `You are a medical documentation assistant. Based on the following clinical events from a patient's record, generate a structured pre-visit summary.

CLINICAL EVENTS:
${context}

Generate a JSON object with exactly these four fields:
- "chief_complaint": The primary reason for the current visit or most recent concern
- "hpi": History of Present Illness — a narrative of the current condition's progression
- "past_history": Relevant past medical history, medications, and prior diagnoses
- "relevant_results": Key lab results, imaging findings, or diagnostic outcomes

Be concise, factual, and only reference information present in the provided clinical events. Do not fabricate or assume any information not in the records.

Respond ONLY with valid JSON, no markdown formatting.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const text = response.text ?? '{}';
  return JSON.parse(text);
}

/**
 * Chat with a patient's clinical records context.
 * System prompt strictly forbids diagnosis/treatment advice.
 */
export async function chatWithContext(
  context: string,
  message: string,
  chatHistory: Array<{ role: 'user' | 'model'; content: string }> = [],
): Promise<string> {
  const systemInstruction = `You are a medical record assistant for a patient viewing their own health records. You must follow these rules strictly:

1. ONLY answer questions based on the provided clinical records below. Never use external knowledge.
2. DO NOT provide any diagnosis, treatment advice, or medical recommendations.
3. DO NOT suggest medications, dosages, or treatment plans.
4. If the patient asks about something not in their records, say: "I don't have that information in your records."
5. If the patient asks for medical advice, say: "I'm not able to provide medical advice. Please consult your healthcare provider."
6. Be clear, concise, and factual. Cite which record or event your answer comes from when possible.

PATIENT'S CLINICAL RECORDS:
${context}`;

  const contents = [
    ...chatHistory.map((msg) => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user' as const,
      parts: [{ text: message }],
    },
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents,
    config: {
      systemInstruction,
    },
  });

  return response.text ?? 'I was unable to process your request. Please try again.';
}

/**
 * AI Scribe: Parses raw, unstructured doctor notes into structured medical data.
 */
export async function aiScribe(rawNotes: string): Promise<{
  diagnosis: { title: string; icd_code: string; severity: string; clinical_impression: string };
  symptoms: { chief_complaint: string; duration: string; details: string };
  vitals: { bp: string; heart_rate: string; temperature: string; spo2: string; weight: string };
  prescriptions: Array<{ medication: string; dosage: string; frequency: string; duration: string; instructions: string }>;
}> {
  const prompt = `You are a highly skilled AI medical scribe. Your task is to extract relevant clinical information from unstructured doctor's notes and structure it into a specific JSON format.

If a specific piece of information is missing from the raw notes, leave the corresponding string field empty or return an empty array for prescriptions.

RAW DOCTOR NOTES:
${rawNotes}

Return ONLY valid JSON matching this exact structure:
{
  "diagnosis": {
    "title": "Main diagnosis",
    "icd_code": "Best guess ICD-10 code, or empty",
    "severity": "Severity of condition (e.g., Mild, Severe)",
    "clinical_impression": "Summary of clinical impression"
  },
  "symptoms": {
    "chief_complaint": "Primary complaint",
    "duration": "Duration of symptoms",
    "details": "Any extra details"
  },
  "vitals": {
    "bp": "Blood pressure",
    "heart_rate": "Heart rate",
    "temperature": "Temperature",
    "spo2": "SpO2 level",
    "weight": "Weight"
  },
  "prescriptions": [
    {
      "medication": "Name of medication",
      "dosage": "Dosage (e.g. 50mg)",
      "frequency": "Frequency (e.g. TDS)",
      "duration": "Duration (e.g. 3 days)",
      "instructions": "Instructions (e.g. SOS)"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const text = response.text ?? '{}';
  return JSON.parse(text);
}
