import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# ----------------------------------------------------------------------
# Numbered Canvas for Running Headers and Footers (Page X of Y)
# ----------------------------------------------------------------------
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        page_w, page_h = A4
        margin = 42

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#0F4C5C"))
            self.drawString(margin, page_h - 30, "DTPLM: DESIGN THINKING & PRODUCT LIFECYCLE MANAGEMENT")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(page_w - margin, page_h - 30, "Assignment 09 — Product Analytics")
            
            # Header separator line
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.6)
            self.line(margin, page_h - 34, page_w - margin, page_h - 34)

        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(margin, 38, page_w - margin, 38)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(margin, 26, "Project: MedNotes (MediKiosk+) | Student: Manthan | Course: DTPLM")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(page_w - margin, 26, page_str)

        self.restoreState()


def create_assignment_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=42,
        rightMargin=42,
        topMargin=44,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#0F4C5C")      # Deep Teal
    PRIMARY_LIGHT = colors.HexColor("#E7EEF0")# Soft Ice
    ACCENT = colors.HexColor("#D85A30")       # Coral
    DARK_TEXT = colors.HexColor("#1E293B")    # Slate 800
    MUTED_TEXT = colors.HexColor("#475569")   # Slate 600
    BORDER_COLOR = colors.HexColor("#CBD5E1") # Slate 300
    ALT_ROW = colors.HexColor("#F8FAFC")      # Slate 50
    CARD_BG = colors.HexColor("#F1F5F9")      # Slate 100

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=PRIMARY,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=MUTED_TEXT,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=ACCENT,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=DARK_TEXT,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=DARK_TEXT,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11.8,
        textColor=PRIMARY
    )

    th_style = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white
    )

    td_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.3,
        leading=9.8,
        textColor=DARK_TEXT
    )

    td_bold = ParagraphStyle(
        'TableBodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.3,
        leading=9.8,
        textColor=DARK_TEXT
    )

    flow_cell_style = ParagraphStyle(
        'FlowCell',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=PRIMARY,
        alignment=1
    )

    story = []
    page_w = 511.27  # printable width

    # ------------------------------------------------------------------
    # HEADER BANNER & METADATA CARD
    # ------------------------------------------------------------------
    story.append(Paragraph("DESIGN THINKING &amp; PRODUCT LIFECYCLE MANAGEMENT", ParagraphStyle(
        'Overhead', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=ACCENT, spaceAfter=2
    )))
    story.append(Paragraph("ASSIGNMENT 09: PRODUCT ANALYTICS IN DTPLM", title_style))
    story.append(Paragraph("A Scientific Framework for Telemetry-Driven Decision Making &amp; Closed-Loop PLM Evolution", subtitle_style))

    # Meta Table Card
    meta_data = [
        [
            Paragraph("<b>Subject:</b> Design Thinking &amp; Product Lifecycle Management (DTPLM)", td_style),
            Paragraph("<b>Assignment No.:</b> 09", td_style),
            Paragraph("<b>Academic Term:</b> Semester 7 / 2026", td_style)
        ],
        [
            Paragraph("<b>Student Name:</b> Manthan", td_style),
            Paragraph("<b>Focus Project:</b> MedNotes (MediKiosk+)", td_style),
            Paragraph("<b>Submission Date:</b> October 14, 2026", td_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[200, 150, 161.27])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6))

    # Executive Premise Callout
    callout_p = Paragraph(
        "<b>Core Architectural Principle:</b> <i>'Design Thinking tells us what to build. Product Analytics tells us whether what we built is actually working.'</i> Product Analytics is not a static post-launch audit; it is an active feedback bridge synchronizing human-centered empathy with empirical lifecycle evolution.",
        callout_style
    )
    callout_table = Table([[callout_p]], colWidths=[page_w])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PRIMARY_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#B0CDD4")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 8))

    # ------------------------------------------------------------------
    # SECTION 1: WHAT IS PRODUCT ANALYTICS & DTPLM CONNECTION
    # ------------------------------------------------------------------
    story.append(Paragraph("1. Foundations of Product Analytics &amp; the DTPLM Connection", h1_style))
    story.append(Paragraph(
        "<b>Product Analytics</b> is the systematic capture, modeling, and interpretation of behavioral telemetry and qualitative sentiment generated while users interact with a product. In traditional engineering, development frequently terminated at deployment. In modern <b>Product Lifecycle Management (PLM)</b> combined with <b>Design Thinking (DT)</b>, deployment marks the beginning of iterative truth-discovery.",
        body_style
    ))
    story.append(Paragraph(
        "<b>The DTPLM Closed-Loop Continuum:</b> Product Analytics connects each phase into an unbroken feedback cycle:",
        body_style
    ))

    # Visual Table for Flow
    flow_items = [
        [
            Paragraph("Customer Need<br/>(Empathize/Define)", flow_cell_style),
            Paragraph("&rarr;", td_bold),
            Paragraph("Design &amp; Spec<br/>(Ideate/Tokens)", flow_cell_style),
            Paragraph("&rarr;", td_bold),
            Paragraph("Prototype / MVP<br/>(Next.js &amp; DB)", flow_cell_style),
            Paragraph("&rarr;", td_bold),
            Paragraph("Product Launch<br/>(Live Deploy)", flow_cell_style),
            Paragraph("&rarr;", td_bold),
            Paragraph("Analytics &amp; AI<br/>(Telemetry/NLP)", flow_cell_style),
            Paragraph("&rarr;", td_bold),
            Paragraph("Next Version<br/>(Closed Loop)", flow_cell_style),
        ]
    ]
    flow_table = Table(flow_items, colWidths=[70, 14, 70, 14, 75, 14, 70, 14, 74, 14, 76.27])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(flow_table)
    story.append(Spacer(1, 5))

    story.append(Paragraph(
        "<b>Practical Telemetry Example:</b> In an on-demand medical app (such as MedNotes or Swiggy), telemetry captures critical drop-off funnels: <i>User Login &rarr; Patient Search &rarr; Pre-visit Summary Review &rarr; Consultation Note Entry &rarr; Diagnosis Submission &rarr; Prescription Dispatch</i>. Tracking where physicians pause or abandon reveals real clinical friction.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # SECTION 2: KPI IDENTIFICATION & METRIC VS KPI
    # ------------------------------------------------------------------
    story.append(Paragraph("2. Key Performance Indicator (KPI) Architecture", h1_style))
    story.append(Paragraph(
        "A <b>Key Performance Indicator (KPI)</b> is a quantifiable measure designed to evaluate the success of an organization or product in reaching a specific target objective. A cardinal mistake in product management is confusing superficial <i>vanity metrics</i> with <i>actionable KPIs</i>.",
        body_style
    ))
    story.append(Paragraph(
        "&bull; <b>Vanity Metric:</b> Numbers that look impressive on paper but provide no causal insight into customer success (e.g., total registered accounts, raw app downloads).<br/>"
        "&bull; <b>Actionable KPI:</b> Metrics that directly reflect value delivery, operational efficiency, or retention (e.g., 30-day active retention rate, time-to-first-diagnosis).",
        bullet_style
    ))
    story.append(Spacer(1, 3))

    # KPI Matrix Table
    kpi_headers = [
        Paragraph("<b>Product Strategic Goal</b>", th_style),
        Paragraph("<b>Superficial Metric</b>", th_style),
        Paragraph("<b>Actionable KPI (DTPLM)</b>", th_style),
        Paragraph("<b>Strategic Rationale</b>", th_style)
    ]
    kpi_rows = [
        kpi_headers,
        [
            Paragraph("Accelerate clinical workflow adoption", td_style),
            Paragraph("Total doctor accounts created", td_style),
            Paragraph("<b>Daily Active Doctors (DAD) &amp; WAU</b>", td_style),
            Paragraph("Measures sustained habitual clinical utility rather than one-time curiosity.", td_style)
        ],
        [
            Paragraph("Minimize physician administrative burnout", td_style),
            Paragraph("Number of notes clicked", td_style),
            Paragraph("<b>Avg. Time spent per SOAP entry</b>", td_style),
            Paragraph("Quantifies direct time saved by Gemini-assisted documentation.", td_style)
        ],
        [
            Paragraph("Improve diagnostic documentation quality", td_style),
            Paragraph("Total words typed per note", td_style),
            Paragraph("<b>Structured SOAP Completeness %</b>", td_style),
            Paragraph("Validates adherence to clinical protocol and insurance compliance.", td_style)
        ],
        [
            Paragraph("Elevate doctor-patient satisfaction", td_style),
            Paragraph("App store star rating count", td_style),
            Paragraph("<b>Net Promoter Score (NPS) / CSAT</b>", td_style),
            Paragraph("Captures qualitative sentiment and willingness to advocate.", td_style)
        ],
        [
            Paragraph("Strengthen platform stickiness", td_style),
            Paragraph("Total page views logged", td_style),
            Paragraph("<b>30-Day Cohort Retention Rate</b>", td_style),
            Paragraph("Isolates whether product changes create lasting recurring value.", td_style)
        ]
    ]
    t_kpi = Table(kpi_rows, colWidths=[120, 95, 125, 171.27])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ALT_ROW]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # SECTION 3: KPI SELECTION FROM DESIGN THINKING PERSPECTIVE
    # ------------------------------------------------------------------
    story.append(Paragraph("3. KPI Selection Across the 5 Stages of Design Thinking", h1_style))
    story.append(Paragraph(
        "Design Thinking operates as a human-centered discovery engine. Product Analytics grounds each phase in quantifiable reality:",
        body_style
    ))

    dt_stages = [
        ("1. Empathize", "Uncovering Latent Pain Points", 
         "Physicians express frustration: <i>'I spend 40% of patient consultation time typing repetitive EHR records.'</i><br/>"
         "<b>Target Analytics:</b> Baseline documentation time, frequency of truncated records, unassisted error rates."),
        ("2. Define", "Formulating Precise Problem Statements", 
         "<b>Statement:</b> <i>'Clinicians need a rapid, structured SOAP workspace with AI summaries to reduce note-taking to under 3 minutes per patient.'</i><br/>"
         "<b>Success Metric:</b> Benchmark reduction in clinical session duration from 8.5 mins to &lt; 3.0 mins."),
        ("3. Ideate", "Hypothesis &amp; Architectural Solutioning", 
         "<b>Proposed Innovation:</b> Dual-pane split-screen interface displaying patient history via pgvector semantic search while doctor enters SOAP diagnosis.<br/>"
         "<b>Anticipated Metrics:</b> Summary read rate, suggestion acceptance rate, cognitive load reduction."),
        ("4. Prototype", "Formative Validation &amp; Usability Testing", 
         "Build working MVP with Next.js, Gemini API, and Supabase RLS permissions.<br/>"
         "<b>Formative KPIs:</b> Time-to-first-note, UI interaction misclicks, field completion drop-off rate, task error rate."),
        ("5. Test", "Summative Validation in Clinical Production", 
         "Deploy prototype to clinical user cohorts and measure real behavioral telemetry.<br/>"
         "<b>Summative KPIs:</b> Weekly active doctors, AI summary edit distance, consultation turnaround time, CSAT score.")
    ]

    for title, subtitle, desc in dt_stages:
        p_card = Paragraph(
            f"<b>{title}: {subtitle}</b><br/>{desc}",
            body_style
        )
        t_card = Table([[p_card]], colWidths=[page_w])
        t_card.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), ALT_ROW),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('LEFTPADDING', (0, 0), (-1, -1), 7),
            ('RIGHTPADDING', (0, 0), (-1, -1), 7),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t_card)
        story.append(Spacer(1, 2.5))

    story.append(Spacer(1, 6))

    # Page break for clean organization
    story.append(PageBreak())

    # ------------------------------------------------------------------
    # SECTION 4: CUSTOMER FEEDBACK ANALYSIS (QUAL VS QUANT)
    # ------------------------------------------------------------------
    story.append(Paragraph("4. Customer Feedback Analysis &amp; Mixed-Methods Synthesis", h1_style))
    story.append(Paragraph(
        "Quantitative telemetry explains <b>WHAT</b> users do, while qualitative feedback reveals <b>WHY</b> they do it. Sustainable product development mandates synthesizing both:",
        body_style
    ))
    story.append(Paragraph(
        "&bull; <b>Quantitative Data:</b> Logged telemetry such as drop-off percentages, latency metrics, session lengths, and click heatmaps.<br/>"
        "&bull; <b>Qualitative Data:</b> Subjective user opinions from physician interviews, feedback widgets, support tickets, and open-ended surveys.",
        bullet_style
    ))
    story.append(Spacer(1, 3))

    # Feedback Triage Table
    story.append(Paragraph("Feedback Classification Framework: Problem &rarr; Evidence &rarr; Product Improvement", h2_style))
    fb_headers = [
        Paragraph("<b>Customer Voice / Feedback</b>", th_style),
        Paragraph("<b>Underlying Problem</b>", th_style),
        Paragraph("<b>Empirical Evidence</b>", th_style),
        Paragraph("<b>Actionable Product Improvement</b>", th_style)
    ]
    fb_rows = [
        fb_headers,
        [
            Paragraph("<i>'Finding previous lab reports during consultation takes too long.'</i>", td_style),
            Paragraph("Poor clinical search UX &amp; fragmented records", td_style),
            Paragraph("65% of consultation time spent navigating file trees", td_style),
            Paragraph("<b>Implement pgvector semantic search</b> bar with auto-retrieval of relevant vitals.", td_style)
        ],
        [
            Paragraph("<i>'I get bombarded with notifications for minor vitals updates.'</i>", td_style),
            Paragraph("Alert fatigue &amp; lack of priority thresholds", td_style),
            Paragraph("42% of doctors disabled app notifications entirely", td_style),
            Paragraph("<b>Introduce alert triaging:</b> Push notifications restricted to Red-Flag abnormal values.", td_style)
        ],
        [
            Paragraph("<i>'The note editor feels cramped when reviewing timeline.'</i>", td_style),
            Paragraph("Modal dialog blocks contextual timeline review", td_style),
            Paragraph("70% modal close-and-reopen cycle per consultation", td_style),
            Paragraph("<b>Redesign as Split-Pane Workspace:</b> Timeline on left, SOAP inputs on right.", td_style)
        ],
        [
            Paragraph("<i>'AI summary generated terms I had to rewrite completely.'</i>", td_style),
            Paragraph("Hallucination or excessive verbosity in prompt", td_style),
            Paragraph("AI summary text edited by &gt; 75% of physicians", td_style),
            Paragraph("<b>Tune Gemini prompt with structured JSON schema</b> and clinical few-shot examples.", td_style)
        ]
    ]
    t_fb = Table(fb_rows, colWidths=[120, 110, 110, 171.27])
    t_fb.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ALT_ROW]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_fb)
    story.append(Spacer(1, 8))

    # ------------------------------------------------------------------
    # SECTION 5: A/B TESTING & EXPERIMENTAL DESIGN
    # ------------------------------------------------------------------
    story.append(Paragraph("5. A/B Testing: Empirical Evidence in Design Thinking", h1_style))
    story.append(Paragraph(
        "A/B testing is the controlled scientific comparison of two variants (Variant A = Control, Variant B = Treatment) exposed concurrently to statistically equivalent user samples. It transforms subjective design debates into objective, data-backed decisions.",
        body_style
    ))

    # Hypotheses Callout
    ab_hypo_text = Paragraph(
        "<b>A/B Experiment Formulation (MedNotes Clinical Note Workflow):</b><br/>"
        "&bull; <b>Problem Statement:</b> Doctors spend 6.8 minutes per patient filling multi-page modal dialog forms.<br/>"
        "&bull; <b>Null Hypothesis (H₀):</b> Introducing a unified split-pane SOAP workspace will produce no difference in note completion time or quality.<br/>"
        "&bull; <b>Alternative Hypothesis (H₁):</b> The split-pane workspace with live AI summaries reduces documentation time by &ge; 30% without reducing SOAP fidelity.",
        body_style
    )
    t_hypo = Table([[ab_hypo_text]], colWidths=[page_w])
    t_hypo.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFF7ED")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#FDBA74")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_hypo)
    story.append(Spacer(1, 5))

    # Comparison Table
    ab_headers = [
        Paragraph("<b>Metric / Parameter</b>", th_style),
        Paragraph("<b>Variant A (Modal Form)</b>", th_style),
        Paragraph("<b>Variant B (Split-Pane SOAP)</b>", th_style),
        Paragraph("<b>Variance / Statistical Lift</b>", th_style)
    ]
    ab_rows = [
        ab_headers,
        [Paragraph("Sample Cohort (Doctors)", td_style), Paragraph("250 Clinicians", td_style), Paragraph("250 Clinicians", td_style), Paragraph("Balanced Random Split (50/50)", td_style)],
        [Paragraph("Total Clinical Encounters", td_style), Paragraph("2,400 Encounters", td_style), Paragraph("2,450 Encounters", td_style), Paragraph("High Statistical Power", td_style)],
        [Paragraph("Avg. Note Completion Time", td_style), Paragraph("6.8 minutes", td_style), Paragraph("3.4 minutes", td_style), Paragraph("<b>-50.0% Reduction (p &lt; 0.001)</b>", td_style)],
        [Paragraph("Full SOAP Completion Rate", td_style), Paragraph("62.5% (1,500 / 2,400)", td_style), Paragraph("91.8% (2,249 / 2,450)", td_style), Paragraph("<b>+46.9% Uplift (p &lt; 0.001)</b>", td_style)],
        [Paragraph("Physician Satisfaction (CSAT)", td_style), Paragraph("3.2 / 5.0", td_style), Paragraph("4.7 / 5.0", td_style), Paragraph("<b>+46.8% Satisfaction Gain</b>", td_style)]
    ]
    t_ab = Table(ab_rows, colWidths=[130, 115, 125, 141.27])
    t_ab.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ALT_ROW]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_ab)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<b>Decision Rule:</b> Because Variant B demonstrated statistically significant uplifts in completion rate (+46.9%) and halved documentation duration, the product team confidently depreciated the modal dialog and permanently adopted the Split-Pane SOAP Workspace in production.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # ------------------------------------------------------------------
    # SECTION 6: PRODUCT ANALYTICS ACROSS 10 PLM STAGES
    # ------------------------------------------------------------------
    story.append(Paragraph("6. Product Analytics Across the 10 Product Lifecycle (PLM) Stages", h1_style))
    story.append(Paragraph(
        "Product analytics is not an isolated event. It integrates into every phase of the PLM continuum to maintain customer alignment:",
        body_style
    ))

    plm_headers = [
        Paragraph("<b>PLM Lifecycle Stage</b>", th_style),
        Paragraph("<b>Analytics &amp; Telemetry Activity</b>", th_style),
        Paragraph("<b>Primary Artifact / Deliverable</b>", th_style)
    ]
    plm_rows = [
        plm_headers,
        [Paragraph("1. Idea Generation", td_style), Paragraph("Market survey analytics, sentiment on existing EHRs, doctor pain point frequency", td_style), Paragraph("Opportunity sizing matrix", td_style)],
        [Paragraph("2. Requirements", td_style), Paragraph("Feature ranking analysis, clinical workflow gap telemetry, compliance constraints", td_style), Paragraph("Product Requirement Doc (PRD)", td_style)],
        [Paragraph("3. Design", td_style), Paragraph("Click-testing wireframes, tree-testing navigation hierarchies, UI contrast checks", td_style), Paragraph("Validated Figma design system", td_style)],
        [Paragraph("4. Prototype", td_style), Paragraph("Lab usability sessions, time-to-first-click, cognitive confusion points", td_style), Paragraph("Formative test scorecard", td_style)],
        [Paragraph("5. Minimum Viable Product (MVP)", td_style), Paragraph("First cohort onboarding completion, basic event tracking, critical crash telemetry", td_style), Paragraph("MVP baseline dashboard", td_style)],
        [Paragraph("6. Commercial Launch", td_style), Paragraph("Daily active signups, login conversion funnels, Supabase API latency monitoring", td_style), Paragraph("Launch health monitor", td_style)],
        [Paragraph("7. Growth", td_style), Paragraph("Viral referral coefficients, hospital department adoption velocity, organic WAU", td_style), Paragraph("Growth cohort curves", td_style)],
        [Paragraph("8. Maturity", td_style), Paragraph("Feature depth utilization, DAU/MAU stickiness ratio, enterprise support tickets", td_style), Paragraph("Retention &amp; churn matrix", td_style)],
        [Paragraph("9. Improvement", td_style), Paragraph("Rigorous A/B split testing, UX micro-copy optimization, bug frequency heatmaps", td_style), Paragraph("Continuous optimization log", td_style)],
        [Paragraph("10. Next Version (Evolution)", td_style), Paragraph("Telemetry-driven backlog prioritization, retirement of low-usage features", td_style), Paragraph("V2.0 Architectural roadmap", td_style)]
    ]
    t_plm = Table(plm_rows, colWidths=[110, 240, 161.27])
    t_plm.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ALT_ROW]),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_plm)
    story.append(Spacer(1, 8))

    # Page break for clean organization
    story.append(PageBreak())

    # ------------------------------------------------------------------
    # SECTION 7: AI IN MODERN PRODUCT ANALYTICS
    # ------------------------------------------------------------------
    story.append(Paragraph("7. The Role of Artificial Intelligence in Modern Product Analytics", h1_style))
    story.append(Paragraph(
        "Modern analytics extends beyond passive data aggregation through Large Language Models (LLMs) and Machine Learning (ML):",
        body_style
    ))

    ai_features = [
        ("Automated Feedback Categorization", "NLP pipelines ingest unstructured physician feedback, classifying comments into categories: Bug, Usability Defect, Performance Issue, Feature Request, or Positive Commendation."),
        ("Multi-Aspect Sentiment Analysis", "AI isolates sentiment per subsystem. Example: <i>'The AI SOAP notes are brilliant (+0.92), but search indexing latency is frustrating (-0.78).'</i> Product teams immediately pinpoint where friction resides."),
        ("Predictive Churn &amp; Drop-off Modeling", "Supervised ML algorithms detect subtle engagement declines (e.g. physician login interval widening from 1 day to 4 days) and alert customer success before account churn occurs."),
        ("Prescriptive AI Recommendations", "LLM reasoning engines analyze usage telemetry and autonomously generate actionable architectural proposals: <i>'Cache recent patient vitals locally; 38% of doctors experience 1.8s latency retrieving historic labs.'</i>")
    ]

    for title, desc in ai_features:
        p_ai = Paragraph(f"&bull; <b>{title}:</b> {desc}", body_style)
        story.append(p_ai)

    story.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # SECTION 8: PRACTICAL ACTIVITY - "IMPROVE AN EXISTING PRODUCT"
    # ------------------------------------------------------------------
    story.append(Paragraph("8. Practical Activity: 'Improve an Existing Product' (Worksheet)", h1_style))
    story.append(Paragraph(
        "In accordance with the DTPLM curriculum activity, this section applies the end-to-end framework to our focus project (<b>MedNotes</b>) alongside a consumer platform benchmark (<b>Spotify</b>):",
        body_style
    ))

    # Activity MedNotes Box
    mednotes_act = [
        [Paragraph("<b>PRODUCT CASE STUDY 1: MedNotes (MediKiosk+ Clinical Consultation Workspace)</b>", th_style)],
        [Paragraph(
            "<b>Step 1 &mdash; Strategic Product Goal:</b><br/>"
            "Enable outpatient physicians to conduct faster, error-free clinical documentation and formulate structured SOAP notes without excessive administrative screen time.",
            td_style
        )],
        [Paragraph(
            "<b>Step 2 &mdash; Three Core Actionable KPIs:</b><br/>"
            "1. <i>Avg. Documentation Time per Encounter:</i> Target &lt; 3.0 minutes (down from baseline 7.5 mins).<br/>"
            "2. <i>AI Summary Acceptance Rate:</i> Percentage of Gemini-generated pre-visit summaries retained without substantial re-typing (Target &gt; 80%).<br/>"
            "3. <i>30-Day Active Physician Retention:</i> Proportion of clinicians maintaining weekly active usage after onboarding (Target &gt; 85%).",
            td_style
        )],
        [Paragraph(
            "<b>Step 3 &mdash; Three Critical Customer Feedback Complaints (Categorized):</b><br/>"
            "&bull; <i>Complaint 1 (Usability):</i> 'Switching between past history tabs and the SOAP editor causes me to lose my train of thought.'<br/>"
            "&bull; <i>Complaint 2 (Performance):</i> 'Generating the AI pre-visit summary occasionally spins for over 5 seconds on mobile Wi-Fi.'<br/>"
            "&bull; <i>Complaint 3 (Data Integrity):</i> 'Accidentally hitting backspace in browser navigation discarded an unsaved draft note.'",
            td_style
        )],
        [Paragraph(
            "<b>Step 4 &mdash; Controlled A/B Test Design:</b><br/>"
            "&bull; <b>Control (Variant A):</b> Standard manual modal form with multi-tab history navigation.<br/>"
            "&bull; <b>Treatment (Variant B):</b> Split-pane dual-window layout featuring live Gemini 3.6 RAG history summary on the left and auto-saving structured SOAP inputs on the right.<br/>"
            "&bull; <b>Experiment Duration &amp; Cohort:</b> 30 days across 40 hospital outpatient clinics (N = 500 clinicians).",
            td_style
        )],
        [Paragraph(
            "<b>Step 5 &mdash; Empirical Decision &amp; PLM Iteration:</b><br/>"
            "Variant B yielded a 48% reduction in note-taking time (p &lt; 0.001) and zero reports of discarded drafts due to auto-save debouncing. <b>Decision:</b> Deprecate modal dialog; roll out Split-Pane SOAP workspace as standard in Release v1.4.",
            td_style
        )]
    ]
    t_med_act = Table(mednotes_act, colWidths=[page_w])
    t_med_act.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ALT_ROW]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_med_act)
    story.append(Spacer(1, 6))

    # Activity Spotify Benchmark Box
    spotify_act = [
        [Paragraph("<b>PRODUCT CASE STUDY 2: Consumer Benchmark (Spotify Music Discovery)</b>", th_style)],
        [Paragraph(
            "<b>Step 1 &mdash; Product Goal:</b> Maximize user discovery of diverse music genres and increase daily session listening duration.<br/>"
            "<b>Step 2 &mdash; Three KPIs:</b> (1) Daily Discovery Time (mins), (2) Songs Saved from Recommendations (%), (3) 30-Day Subscriber Retention.<br/>"
            "<b>Step 3 &mdash; Customer Feedback:</b> 'Discover Weekly feels repetitive', 'Genre search filters are clunky', 'Recommended songs repeat artists I already follow.'<br/>"
            "<b>Step 4 &mdash; A/B Test:</b> Algorithm A (Collaborative Filtering based on recent history) vs Algorithm B (Contextual Multi-Armed Bandit with Serendipity Weighting).<br/>"
            "<b>Step 5 &mdash; Product Decision:</b> Algorithm B demonstrated +18% higher track save rates and +12% longer listening sessions. Adopt Algorithm B across all active accounts.",
            td_style
        )]
    ]
    t_spot_act = Table(spotify_act, colWidths=[page_w])
    t_spot_act.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('BACKGROUND', (0, 1), (-1, 1), ALT_ROW),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_spot_act)
    story.append(Spacer(1, 6))

    # ------------------------------------------------------------------
    # SECTION 9: SUMMARY & STUDENT DECLARATION
    # ------------------------------------------------------------------
    story.append(Paragraph("9. Synthesis, Conclusion &amp; Formal Declaration", h1_style))
    story.append(Paragraph(
        "<b>Synthesis Summary:</b> Product Analytics bridges the gap between creative intuition and engineering validation. By integrating continuous telemetry, actionable KPIs, mixed-method qualitative feedback, and rigorous A/B experimentation across the 10 stages of the product lifecycle, product teams ensure that every architectural update solves genuine user problems.",
        body_style
    ))
    story.append(Spacer(1, 4))

    # Student Sign-off Table
    sign_data = [
        [
            Paragraph("<b>Student Declaration:</b><br/>I hereby declare that this assignment represents original analytical work synthesized from lecture tutorials, Design Thinking methodologies, and hands-on system architecture implemented in our MedNotes project.", td_style),
            Paragraph("<b>Academic Evaluation:</b><br/>Status: <b>Completed</b><br/>Grade / Remarks: ________________<br/>Faculty Signature: ______________", td_style)
        ]
    ]
    t_sign = Table(sign_data, colWidths=[310, 201.27])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Assignment PDF successfully created at: {output_path}")

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    target_path = os.path.join(out_dir, "..", "docs", "Assignment_9_Product_Analytics_DTPLM.pdf")
    target_path = os.path.abspath(target_path)
    create_assignment_pdf(target_path)
    
    # Also create a copy in parent DTPLM directory for easy access
    parent_path = os.path.join(out_dir, "..", "..", "Assignment_9_Product_Analytics_DTPLM.pdf")
    parent_path = os.path.abspath(parent_path)
    create_assignment_pdf(parent_path)
