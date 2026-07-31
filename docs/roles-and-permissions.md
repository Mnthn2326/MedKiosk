# MedNotes — Roles and Permissions

## Overview

MedNotes uses a role-based access control system. Each user has exactly one role that determines their permissions within the platform.

## Roles

### Patient
- Can view their own Clinical Canvas and health history.
- Cannot view other patients' data.
- Cannot contribute clinical data.
- Sees their own identity (not de-identified to themselves).

### Doctor
- Can access authorized patient Canvases (de-identified).
- Can create clinical notes on authorized Canvases.
- Can create AI-assisted clinical notes.
- Cannot edit or delete another contributor's clinical contribution.
- Cannot see patient personal identity through the Canvas.
- Must have a verified professional identity.

### Laboratory
- Can access authorized patient Canvases (de-identified).
- Can submit medical reports to authorized Canvases.
- Cannot edit or delete another contributor's clinical contribution.
- Cannot see patient personal identity through the Canvas.
- Must have a verified professional identity.

### Diagnostic Center
- Can access authorized patient Canvases (de-identified).
- Can submit medical reports to authorized Canvases.
- Cannot edit or delete another contributor's clinical contribution.
- Cannot see patient personal identity through the Canvas.
- Must have a verified professional identity.

## Key Permission Principles

1. **Canvas Isolation**: Patients can only view their own Canvas. Professionals can only access Canvases they are explicitly authorized for.

2. **Contribution Immutability**: A contributor cannot edit or delete another contributor's work. This ensures accountability and trust in the clinical record.

3. **De-identification Boundary**: Professional users interact with clinical data through the de-identified Canvas. Patient personal identity is never exposed through this interface.

4. **Professional Transparency**: Professional identities are transparent and verifiable. Patients and other professionals can verify who contributed to a Canvas.

5. **Professional Verification**: All professional users (doctors, laboratories, diagnostic centers) must complete a verification process before they can contribute to Canvases.

## Access Control Matrix (Planned)

| Action | Patient | Doctor | Laboratory | Diagnostic Center |
|---|---|---|---|---|
| View own Canvas | ✓ | — | — | — |
| Access authorized Canvas | — | ✓ | ✓ | ✓ |
| Create clinical note | — | ✓ | — | — |
| Create AI-assisted note | — | ✓ | — | — |
| Submit medical report | — | — | ✓ | ✓ |
| Edit own contribution | — | ✓ | ✓ | ✓ |
| Edit others' contribution | — | ✗ | ✗ | ✗ |
| View patient identity | ✗ (self only) | ✗ | ✗ | ✗ |
| Verify professional ID | — | Required | Required | Required |

> **Note**: This access control matrix is a design document. Implementation will follow in later development phases.
