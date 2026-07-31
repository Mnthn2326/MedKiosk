# MedNotes — Data Model

## Overview

This document describes the planned high-level data entities for MedNotes. These models have **not yet been implemented** in Prisma — they will be created in Step 2.

## Planned Entities

### User
Base user account. All platform participants (patients, doctors, labs, diagnostic centers) have a User record.
- Authentication credentials
- Role assignment
- Profile information
- Account status

### Patient
Extends User for patient-specific data.
- Personal identity information (kept separate from clinical data)
- Link to their Clinical Canvas
- Demographics

### Doctor
Extends User for doctor-specific data.
- Professional credentials
- Specialization
- Verification status
- Institution affiliation

### Laboratory
Extends User for laboratory-specific data.
- Laboratory name and details
- Accreditation information
- Verification status

### DiagnosticCenter
Extends User for diagnostic center-specific data.
- Center name and details
- Available diagnostic services
- Verification status

### ClinicalCanvas
The central entity — one per patient. A longitudinal, de-identified health record.
- Link to Patient (identity boundary)
- De-identified reference ID
- Creation timestamp
- Status

### CanvasAccess
Controls which professionals can access which Canvases.
- Link to Canvas
- Link to professional User
- Access level / permissions
- Granted by / granted date

### Contribution
Base record for any addition to a Canvas.
- Link to Canvas
- Link to contributor (User)
- Contribution type (clinical note, medical report, etc.)
- Timestamp
- Immutable flag

### ClinicalNote
A doctor's clinical note contributed to a Canvas.
- Link to Contribution
- Note content (structured/unstructured)
- Diagnosis codes
- Treatment plan

### Medication
Medication records associated with a Canvas.
- Link to Canvas / Contribution
- Medication name
- Dosage, frequency, duration
- Prescribing doctor

### MedicalReport
A report from a laboratory or diagnostic center.
- Link to Contribution
- Report type
- Findings
- Attachments/files
- Reporting entity

### ConsultationTranscript
AI-generated transcript from a doctor consultation.
- Link to Contribution / ClinicalNote
- Raw transcript text
- AI processing metadata
- Doctor review status

### AI Documentation
AI-assisted documentation artifacts.
- Link to ClinicalNote
- Generated content
- Model/version used
- Doctor approval status

### ProfessionalVerification
Verification records for professional users.
- Link to User (Doctor/Lab/DiagnosticCenter)
- Verification documents
- Verification status
- Verified by / date

### AuditLog
Immutable log of all significant platform operations.
- Actor (User)
- Action performed
- Target entity
- Timestamp
- Metadata

## Entity Relationships (High-Level)

```
User ─────┬──── Patient ──── ClinicalCanvas ──── Contribution
          │                        │                   │
          ├──── Doctor             │              ┌────┴────┐
          │                        │              │         │
          ├──── Laboratory    CanvasAccess   ClinicalNote  MedicalReport
          │                                      │
          └──── DiagnosticCenter           ConsultationTranscript
                                                 │
          ProfessionalVerification         AI Documentation
                    │
               AuditLog
```

> **Note**: This is a planning document. The actual Prisma schema will be implemented in Step 2 with proper field definitions, constraints, and relationships.
