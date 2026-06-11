import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

def generate_trip_pdf(trip_data, days_data, log_images, output_pdf_path):
    """
    Generates a professional PDF containing:
    1. Trip Summary Page (Driver info, route, total distance, violations, full timeline)
    2. Daily Logs Pages (one page per day showing the Pillow-drawn log sheet)
    """
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)

    # Document setup
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    style_title = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=12
    )

    style_heading = ParagraphStyle(
        name='HeadingStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=12,
        spaceAfter=8
    )

    style_subheading = ParagraphStyle(
        name='SubHeadingStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=8,
        spaceAfter=4
    )

    style_body = ParagraphStyle(
        name='BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155')
    )

    style_body_bold = ParagraphStyle(
        name='BodyBoldStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0F172A')
    )

    style_cell_center = ParagraphStyle(
        name='CellCenterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        alignment=1,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # --- PAGE 1: TRIP SUMMARY ---
    # Title
    story.append(Paragraph("ELD COMPLIANT TRIP SUMMARY & DRIVER LOGS", style_title))
    story.append(Paragraph("Generated dynamically in compliance with FMCSA Hours of Service (HOS) 70-Hour/8-Day Rules.", style_body))
    story.append(Spacer(1, 15))

    # Driver & Vehicle Information Table
    info_data = [
        [
            Paragraph("<b>Driver Name:</b>", style_body),
            Paragraph(trip_data.get('driver_name', 'N/A'), style_body),
            Paragraph("<b>Truck Number:</b>", style_body),
            Paragraph(trip_data.get('truck_number', 'N/A'), style_body)
        ],
        [
            Paragraph("<b>Origin:</b>", style_body),
            Paragraph(trip_data.get('current_location', 'N/A'), style_body),
            Paragraph("<b>Created Date:</b>", style_body),
            Paragraph(trip_data.get('created_at', 'N/A'), style_body)
        ],
        [
            Paragraph("<b>Pickup Loc:</b>", style_body),
            Paragraph(trip_data.get('pickup_location', 'N/A'), style_body),
            Paragraph("<b>Dropoff Loc:</b>", style_body),
            Paragraph(trip_data.get('dropoff_location', 'N/A'), style_body)
        ]
    ]
    
    info_table = Table(info_data, colWidths=[90, 180, 90, 180])
    info_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#F8FAFC')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # Trip Stats Summary Cards
    stats_data = [
        ["Total Distance", "Driving Time", "Violations Status"],
        [
            f"{trip_data.get('total_miles', 0.0):.1f} Miles",
            f"{trip_data.get('total_time', 0.0):.1f} Hours",
            "COMPLIANT" if not trip_data.get('violations') else f"{len(trip_data.get('violations'))} Violation(s)"
        ]
    ]
    stats_table = Table(stats_data, colWidths=[180, 180, 180])
    stats_table.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#94A3B8')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BACKGROUND', (2,1), (2,1), colors.HexColor('#DCFCE7') if not trip_data.get('violations') else colors.HexColor('#FEE2E2')),
        ('TEXTCOLOR', (2,1), (2,1), colors.HexColor('#166534') if not trip_data.get('violations') else colors.HexColor('#991B1B')),
        ('FONTNAME', (0,1), (-1,1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,1), (-1,1), 12),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 15))

    # Violations Section (if any)
    if trip_data.get('violations'):
        story.append(Paragraph("Compliance Violations Warning", style_heading))
        for v in trip_data['violations']:
            story.append(Paragraph(f"<font color='#EF4444'><b>{v}</b></font>", style_body))
        story.append(Spacer(1, 15))

    # Itinerary / Route Events Timeline
    story.append(Paragraph("Detailed Trip Itinerary & Log Events Timeline", style_heading))
    
    # We will build a table containing all segments of the trip
    timeline_headers = ["Start Time", "End Time", "Activity", "Location", "Miles"]
    timeline_data = [timeline_headers]

    for day in days_data:
        timeline_data.append([f"<b>DAY {day['day_number']} - {day['date']}</b>", "", "", "", ""])
        for seg in day['segments']:
            timeline_data.append([
                seg['start'],
                seg['end'],
                seg['description'],
                seg['location'][:25],
                f"{seg['start_miles']:.1f} - {seg['end_miles']:.1f}"
            ])

    timeline_table = Table(timeline_data, colWidths=[70, 70, 180, 140, 80])
    
    # Style Table
    t_style = [
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
        ('FONTSIZE', (0,0), (-1,-1), 8),
    ]

    # Row backgrounds / colors
    r_idx = 1
    for day in days_data:
        # Day Header row styling
        t_style.append(('SPAN', (0, r_idx), (-1, r_idx)))
        t_style.append(('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#F1F5F9')))
        t_style.append(('FONTNAME', (0, r_idx), (-1, r_idx), 'Helvetica-Bold'))
        r_idx += 1
        for _ in day['segments']:
            if r_idx % 2 == 0:
                t_style.append(('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#FAFAFA')))
            r_idx += 1
            
    timeline_table.setStyle(TableStyle(t_style))
    story.append(timeline_table)

    # --- PAGES 2+: DAILY LOG IMAGE SHEETS ---
    # For each daily log, add page break, then render the Pillow-generated image
    for idx, day_img_path in enumerate(log_images):
        story.append(PageBreak())
        
        day_num = idx + 1
        day_date = days_data[idx]['date']
        
        story.append(Paragraph(f"DAILY LOG SHEET: Day {day_num} ({day_date})", style_heading))
        
        # Letter width = 8.5 in = 612 pt. Margins = 36 pt left & right. Printable width = 540 pt.
        # Log canvas is 1200x800. Ratio = 1.5. Width 540 means height = 360.
        story.append(Image(day_img_path, width=540, height=360))
        story.append(Spacer(1, 15))
        
        # Summary totals table under the log sheet for quick reference
        day_totals = days_data[idx]['totals']
        totals_header = ["OFF DUTY", "SLEEPER BERTH", "DRIVING", "ON DUTY (ND)", "TOTAL HOURS"]
        totals_vals = [
            f"{day_totals.get('OFF', 0.0):.1f} hrs",
            f"{day_totals.get('SB', 0.0):.1f} hrs",
            f"{day_totals.get('D', 0.0):.1f} hrs",
            f"{day_totals.get('ON', 0.0):.1f} hrs",
            "24.0 hrs"
        ]
        totals_data = [totals_header, totals_vals]
        totals_table = Table(totals_data, colWidths=[108, 108, 108, 108, 108])
        totals_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F8FAFC')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        
        story.append(Paragraph("<b>Daily Summary Totals:</b>", style_subheading))
        story.append(totals_table)

    # Build the document
    doc.build(story)
