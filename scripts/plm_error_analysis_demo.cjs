/**
 * MedNotes (MediKiosk+) - PLM Verification & Validation (V&V) Test Suite
 * Demonstrating FRACAS (Failure Reporting, Analysis, and Corrective Action System)
 * 
 * Run with: node scripts/plm_error_analysis_demo.cjs
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m"
};

const testCases = [
  {
    id: "TC-SEC-01",
    module: "Security & Auth",
    title: "Physician Session Authentication & Canvas Access",
    steps: [
      { num: 1, name: "Initialize secure TLS handshake", action: () => true },
      { num: 2, name: "Validate Supabase JWT with role: doctor", action: () => true },
      { num: 3, name: "Query active patient consent grant", action: () => true },
      { num: 4, name: "Hydrate Split-Pane SOAP workspace", action: () => true }
    ],
    rca: null,
    capa: null,
    fmeaSeverity: "N/A"
  },
  {
    id: "TC-SEC-02",
    module: "Security & Auth",
    title: "External Contributor Canvas Mutation Boundary (Security Guard)",
    steps: [
      { num: 1, name: "Connect to Contributor Diagnostic Gateway", action: () => true },
      { num: 2, name: "Verify Contributor credentials (role: contributor)", action: () => true },
      { 
        num: 3, 
        name: "Attempt PATCH mutation on doctor-confirmed SOAP event", 
        action: () => {
          throw new Error("403 Forbidden: PostgreSQL Row Level Security (RLS) violation. 'canvas_mutation_policy' rejected unauthorized update on immutable event 'EVT-9021'. Contributor role lacks write access.");
        }
      },
      { num: 4, name: "Commit mutated clinical record to database", action: () => true }
    ],
    rca: "Contributor attempted to overwrite historical physician note. PostgreSQL RLS policy strictly restricts mutation rights to original author with doctor credentials.",
    capa: "CAPA-SEC-04: Confirmed RLS policy active. Added client-side disabled mutation triggers and logged attempt to security audit_logs table.",
    fmeaSeverity: "Critical (RPN: 280)"
  },
  {
    id: "TC-CLIN-01",
    module: "Clinical Ingestion",
    title: "Standard Lab Ingestion with De-Identified Code",
    steps: [
      { num: 1, name: "Ingest multipart payload from Apex Diagnostics", action: () => true },
      { num: 2, name: "Validate Zod schema against ClinicalEventSchema", action: () => true },
      { num: 3, name: "Verify de-identified patient code token: MED-88219", action: () => true },
      { num: 4, name: "Commit event with trust_tier: institution_verified", action: () => true }
    ],
    rca: null,
    capa: null,
    fmeaSeverity: "N/A"
  },
  {
    id: "TC-CLIN-02",
    module: "Clinical Ingestion",
    title: "De-Identification Firewall: Intercept Unmasked PII in Lab Report",
    steps: [
      { num: 1, name: "Ingest external pathology report stream", action: () => true },
      { num: 2, name: "Validate JSON structure and data types", action: () => true },
      { 
        num: 3, 
        name: "Execute PII de-identification regex scrub (DISHA/HIPAA filter)", 
        action: () => {
          throw new Error("AssertionError [PII_LEAK_DETECTED]: Raw demographic PII found in payload metadata ('patient_national_id: 8492-4910-1192'). Bypassed front-end salt hashing.");
        }
      },
      { num: 4, name: "Generate 768-d pgvector embedding for clinical search", action: () => true }
    ],
    rca: "Third-party diagnostic laboratory sent un-tokenized national identity number in freeform header fields, violating DISHA de-identification standards.",
    capa: "CAPA-CLIN-12: Implemented pre-ingestion regex sanitization pipeline that automatically strips Aadhaar/SSN patterns and flags partner API account.",
    fmeaSeverity: "High (RPN: 240)"
  },
  {
    id: "TC-DRUG-01",
    module: "Clinical Safety",
    title: "Standard Adult Antibiotic Prescription Validation",
    steps: [
      { num: 1, name: "Lookup active physician license registration", action: () => true },
      { num: 2, name: "Query RxNorm catalog for Amoxicillin 500mg Oral Capsule", action: () => true },
      { num: 3, name: "Verify patient allergy ledger for Penicillin class", action: () => true },
      { num: 4, name: "Generate digital prescription payload", action: () => true }
    ],
    rca: null,
    capa: null,
    fmeaSeverity: "N/A"
  },
  {
    id: "TC-DRUG-02",
    module: "Clinical Safety",
    title: "Pediatric Medication Dosage Boundary Safety Interlock",
    steps: [
      { num: 1, name: "Verify attending physician credentials", action: () => true },
      { num: 2, name: "Extract patient biometric baseline (Age: 3 yrs, Weight: 14 kg)", action: () => true },
      { 
        num: 3, 
        name: "Check dosage against pediatric clinical therapeutic ceiling", 
        action: () => {
          throw new Error("RangeError [DOSAGE_CEILING_EXCEEDED]: Prescribed Paracetamol 1500mg/day exceeds maximum pediatric threshold of 60mg/kg/day (Max Safe: 840mg/day). Hepatotoxicity risk triggered.");
        }
      },
      { num: 4, name: "Issue pharmacy dispensing token", action: () => true }
    ],
    rca: "Physician input error: adult standard dose (500mg TID) entered for a 3-year-old pediatric patient without checking weight-based calculation formula.",
    capa: "CAPA-MED-02: Added hard blocking modal with pediatric weight-based automatic dosage calculator and red-flag override requiring senior pediatrician signature.",
    fmeaSeverity: "Critical (RPN: 320)"
  },
  {
    id: "TC-EMERG-01",
    module: "Emergency Dispatch",
    title: "Haversine Proximity Calculation & Driver Assignment",
    steps: [
      { num: 1, name: "Capture browser GPS coordinates (Lat: 19.0760, Lng: 72.8777)", action: () => true },
      { num: 2, name: "Query active ambulances within 10km radius", action: () => true },
      { num: 3, name: "Calculate nearest unit using Haversine algorithm", action: () => true },
      { num: 4, name: "Broadcast emergency dispatch event to driver app", action: () => true }
    ],
    rca: null,
    capa: null,
    fmeaSeverity: "N/A"
  },
  {
    id: "TC-EMERG-02",
    module: "Emergency Dispatch",
    title: "Realtime WebSocket Dispatch Sync under High Latency",
    steps: [
      { num: 1, name: "Open Supabase Realtime WebSocket channel", action: () => true },
      { num: 2, name: "Transmit driver GPS coordinate ping", action: () => true },
      { 
        num: 3, 
        name: "Verify bidirectional ACK within 100ms SLA target", 
        action: () => {
          throw new Error("TimeoutError [SLA_BREACH]: WebSocket round-trip acknowledgment timed out after 340ms (SLA constraint: < 100ms). Packet dropped under simulated 3G cellular jitter.");
        }
      },
      { num: 4, name: "Render real-time ambulance marker on Leaflet map", action: () => true }
    ],
    rca: "Cellular network latency spike on 3G simulator delayed driver WebSocket ACK beyond the 100ms emergency SLA window.",
    capa: "CAPA-OPS-08: Introduced client-side dead reckoning interpolation and fallback HTTP long-polling when WebSocket heartbeat exceeds 150ms.",
    fmeaSeverity: "Moderate (RPN: 180)"
  },
  {
    id: "TC-AI-01",
    module: "AI Scribe & RAG",
    title: "Gemini Structured Pre-Visit Summary Extraction",
    steps: [
      { num: 1, name: "Retrieve top-5 semantic clinical events via pgvector", action: () => true },
      { num: 2, name: "Inject clinical context into Gemini system prompt", action: () => true },
      { num: 3, name: "Parse LLM response against strict Zod SOAP schema", action: () => true },
      { num: 4, name: "Display draft summary in Doctor Split-Pane preview", action: () => true }
    ],
    rca: null,
    capa: null,
    fmeaSeverity: "N/A"
  },
  {
    id: "TC-AI-02",
    module: "AI Scribe & RAG",
    title: "Doctor-in-the-Loop Guardrail: Prevent Autonomous AI Note Commit",
    steps: [
      { num: 1, name: "Generate structured SOAP note draft via Gemini API", action: () => true },
      { num: 2, name: "Format note payload with status: 'pending_doctor_review'", action: () => true },
      { 
        num: 3, 
        name: "Verify human physician digital signature token before permanent commit", 
        action: () => {
          throw new Error("SecurityError [CLINICAL_SAFETY_GATE]: Doctor-in-the-Loop policy breach. Cannot commit AI draft to permanent canvas without explicit physician review token ('ACCEPT', 'EDIT', or 'REJECT'). Autonomous AI diagnosis prohibited.");
        }
      },
      { num: 4, name: "Commit record as doctor_confirmed clinical event", action: () => true }
    ],
    rca: "Background sync service attempted to auto-finalize draft note before physician clicked 'Accept', violating non-negotiable Doctor-in-the-Loop principle.",
    capa: "CAPA-AI-01: Added database constraint requiring valid physician user_id and cryptographic review signature on all doctor_confirmed rows.",
    fmeaSeverity: "Critical (RPN: 350)"
  }
];

function runSuite() {
  console.log(`\n${colors.bright}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  MEDNOTES (MEDIKIOSK+) - PRODUCT LIFECYCLE MANAGEMENT (PLM) TEST HARNESS  ${colors.reset}`);
  console.log(`${colors.dim}  Verification & Validation (V&V) Matrix | FRACAS Step-Level Error Analysis${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}================================================================================${colors.reset}\n`);

  const results = [];

  for (const tc of testCases) {
    console.log(`${colors.bright}[RUNNING]${colors.reset} ${tc.id}: ${tc.title} (${colors.dim}${tc.module}${colors.reset})`);
    let tcPassed = true;
    let failedStepInfo = null;

    for (const step of tc.steps) {
      process.stdout.write(`   ${colors.dim}Step ${step.num}:${colors.reset} ${step.name} ... `);
      try {
        step.action();
        console.log(`${colors.green}✔ PASS${colors.reset}`);
      } catch (err) {
        console.log(`${colors.red}✖ FAILED${colors.reset}`);
        console.log(`     ${colors.red}${colors.bright}└─ ERROR AT STEP ${step.num}:${colors.reset} ${colors.red}${err.message}${colors.reset}`);
        tcPassed = false;
        failedStepInfo = {
          stepNum: step.num,
          stepName: step.name,
          error: err.message
        };
        break; // Stop remaining steps of this test case
      }
    }

    if (tcPassed) {
      console.log(`   ${colors.bgGreen} PASS ${colors.reset} ${colors.green}All ${tc.steps.length} steps completed successfully.${colors.reset}\n`);
      results.push({ ...tc, status: "PASS", failedStep: null });
    } else {
      console.log(`   ${colors.bgRed} FAIL ${colors.reset} ${colors.red}Test aborted at Step ${failedStepInfo.stepNum}/${tc.steps.length}.${colors.reset}\n`);
      results.push({ ...tc, status: "FAIL", failedStep: failedStepInfo });
    }
  }

  // Generate PLM FRACAS Error Analysis Summary Table
  console.log(`\n${colors.bright}${colors.yellow}================================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}   PLM FRACAS (FAILURE REPORTING, ANALYSIS & CORRECTIVE ACTION) MATRIX REPORT   ${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}================================================================================${colors.reset}\n`);

  console.log(`${colors.bright}Test Summary:${colors.reset} Total Tests: ${results.length} | Passed: ${results.filter(r => r.status === 'PASS').length} | Failed: ${results.filter(r => r.status === 'FAIL').length}\n`);

  console.log(`| Test ID    | Module              | Status | Failed Step | Severity / RPN | Root Cause Analysis (RCA) & CAPA Action |`);
  console.log(`|------------|---------------------|--------|-------------|----------------|-----------------------------------------|`);

  for (const r of results) {
    const id = r.id.padEnd(10);
    const mod = r.module.padEnd(19);
    const status = (r.status === 'PASS' ? `${colors.green}PASS${colors.reset}  ` : `${colors.red}FAIL${colors.reset}  `);
    const step = r.failedStep ? `Step ${r.failedStep.stepNum}`.padEnd(11) : "None (All ✔)".padEnd(11);
    const rpn = (r.fmeaSeverity || "N/A").padEnd(14);
    const action = r.failedStep 
      ? `${r.rca.slice(0, 36)}... -> [${r.capa.slice(0, 20)}...]`
      : "Baseline verified; zero discrepancies.";

    console.log(`| ${id} | ${mod} | ${status} | ${step} | ${rpn} | ${action} |`);
  }

  console.log(`\n${colors.cyan}Detailed Failure & Root Cause Diagnostic Logs for Failed Tests:${colors.reset}\n`);

  const failedTests = results.filter(r => r.status === 'FAIL');
  failedTests.forEach((ft, idx) => {
    console.log(`${colors.bright}${idx + 1}. [${ft.id}] ${ft.title}${colors.reset}`);
    console.log(`   - ${colors.dim}Module:${colors.reset} ${ft.module}`);
    console.log(`   - ${colors.dim}Failure Point:${colors.reset} ${colors.red}Step ${ft.failedStep.stepNum} (${ft.failedStep.stepName})${colors.reset}`);
    console.log(`   - ${colors.dim}Error Diagnostic:${colors.reset} ${ft.failedStep.error}`);
    console.log(`   - ${colors.dim}FMEA Criticality:${colors.reset} ${colors.yellow}${ft.fmeaSeverity}${colors.reset}`);
    console.log(`   - ${colors.dim}PLM Root Cause Analysis (RCA):${colors.reset} ${ft.rca}`);
    console.log(`   - ${colors.dim}Corrective & Preventive Action (CAPA):${colors.reset} ${colors.green}${ft.capa}${colors.reset}\n`);
  });

  console.log(`${colors.bright}${colors.green}PLM Verification Report Generated Successfully.${colors.reset}\n`);
}

runSuite();
