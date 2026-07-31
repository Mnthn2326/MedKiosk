# MedNotes — Product Requirements

## Vision

MedNotes is a healthcare-record platform that provides a **Clinical Canvas** for each patient — a de-identified, chronological health history accessible to authorized professionals.

## Core Concepts

### Clinical Canvas

The Clinical Canvas is the central product concept. Each patient has exactly one Canvas that serves as their longitudinal health record.

Key properties:
- **One Canvas per patient** — all clinical data flows into a single, unified record.
- **Chronological** — entries are ordered by time, building a health timeline.
- **De-identified** — professional users (doctors, labs, diagnostic centers) access the Canvas without seeing patient personal identity information.
- **Contributor-driven** — multiple professionals contribute to the same Canvas.
- **Immutable contributions** — once a contribution is made, it cannot be edited or deleted by another contributor.

### Contribution Model

The Canvas accepts contributions from authorized professionals:

```
Doctor              → Clinical Note
Laboratory          → Medical Report
Diagnostic Center   → Medical Report
Doctor              → AI-assisted Clinical Note
```

Each contribution is attributed to its author and timestamped. Contributors cannot modify another contributor's work.

### De-identification

Professional users interact with patient records through the de-identified Canvas. The system ensures:
- Doctors, labs, and diagnostic centers cannot see patient personal identity through the Canvas.
- Patient identity is managed separately from clinical data.
- De-identification is a fundamental architectural principle, not an afterthought.

### AI-Assisted Documentation

Doctors will have access to AI-assisted documentation workflows:
- Consultation transcription
- Structured note generation from transcripts
- AI-assisted clinical note creation

AI serves as a documentation aid — the doctor always reviews and approves AI-generated content before it becomes a Canvas contribution.

### Professional Identity & Verification

- Professional users (doctors, labs, diagnostic centers) must have verified identities.
- Professional identities should be transparent and verifiable by other professionals.
- Verification status is tracked and visible.

## User Roles

| Role | Description |
|---|---|
| Patient | Views their own health history through their Canvas |
| Doctor | Creates clinical notes, accesses authorized Canvases |
| Laboratory | Submits medical reports to authorized Canvases |
| Diagnostic Center | Submits medical reports to authorized Canvases |

## Future Capabilities

- Patient self-service (view own Canvas)
- Doctor clinical note creation and AI-assisted documentation
- Laboratory and diagnostic center report submission
- Professional verification workflows
- Canvas access control and authorization
- Audit trail for all Canvas operations
- Medication tracking
- Search and filtering
