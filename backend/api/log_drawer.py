import os
from PIL import Image, ImageDraw, ImageFont

def get_font(font_size, bold=False):
    """
    Attempts to load Helvetica/Arial from standard Mac paths,
    falling back to default Pillow font if unavailable.
    """
    paths = []
    if bold:
        paths = [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
            "/System/Library/Fonts/HelveticaNeue.ttc",
            "/System/Library/Fonts/Supplemental/Courier New Bold.ttf"
        ]
    else:
        paths = [
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Supplemental/Courier New.ttf"
        ]
        
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, font_size)
            except Exception:
                pass
    try:
        return ImageFont.load_default()
    except:
        return None


def draw_log_sheet(day_data, driver_name, truck_number, carrier_name="LOGISTICS TRANS CORP", shipping_info="GENERIC FREIGHT"):
    """
    Generates a 1200x800 Pillow image representing an FMCSA paper log sheet.
    """
    # 1. Create a white canvas
    width = 1200
    height = 800
    img = Image.new("RGB", (width, height), "#FFFFFF")
    draw = ImageDraw.Draw(img)

    # Load fonts
    font_large = get_font(20, bold=True)
    font_medium = get_font(14, bold=True)
    font_small = get_font(11, bold=False)
    font_tiny = get_font(9, bold=False)

    # Colors
    grid_color = "#94A3B8"  # Slate 400
    subgrid_color = "#E2E8F0" # Slate 200
    text_color = "#0F172A"  # Slate 900
    line_color = "#2563EB"  # Royal Blue for driver path
    highlight_color = "#EF4444" # Red for violations

    # Draw Title
    draw.text((30, 20), "DRIVER'S DAILY LOG", fill=text_color, font=font_large)
    draw.text((30, 45), "Federal Motor Carrier Safety Administration (FMCSA) compliant log sheet", fill="#64748B", font=font_tiny)

    # 2. Draw Header Information (Fields and Underlines)
    # Col 1: Date, Driver Name, Truck Number
    draw.text((30, 80), f"Date: {day_data.get('date', '')}", fill=text_color, font=font_medium)
    draw.line((70, 95, 230, 95), fill=grid_color, width=1)
    
    draw.text((260, 80), f"Driver: {driver_name}", fill=text_color, font=font_medium)
    draw.line((310, 95, 520, 95), fill=grid_color, width=1)
    
    draw.text((550, 80), f"Truck #: {truck_number}", fill=text_color, font=font_medium)
    draw.line((610, 95, 730, 95), fill=grid_color, width=1)

    # Col 2: Carrier, Shipping Info, Miles Driven
    draw.text((30, 115), f"Carrier: {carrier_name}", fill=text_color, font=font_medium)
    draw.line((85, 130, 350, 130), fill=grid_color, width=1)
    
    draw.text((380, 115), f"Shipping Doc: {shipping_info}", fill=text_color, font=font_medium)
    draw.line((475, 130, 750, 130), fill=grid_color, width=1)

    draw.text((780, 115), f"Miles Driven: {day_data.get('miles_driven', 0.0)}", fill=text_color, font=font_medium)
    draw.line((870, 130, 980, 130), fill=grid_color, width=1)

    # Grid constants
    grid_left = 180
    grid_right = 1140
    grid_width = 960  # 960 / 24 = 40px per hour, 10px per 15-min
    grid_top = 180
    grid_bottom = 340
    row_height = 40

    status_y = {
        'OFF': grid_top + 20,
        'SB': grid_top + 60,
        'D': grid_top + 100,
        'ON': grid_top + 140
    }

    # 3. Draw Grid Outer Border
    draw.rectangle([grid_left, grid_top, grid_right, grid_bottom], outline=text_color, width=2)

    # Row separators
    for i in range(1, 4):
        draw.line((grid_left, grid_top + i*row_height, grid_right, grid_top + i*row_height), fill=grid_color, width=1)

    # Totals column separator (at the end)
    totals_col_x = grid_right + 40
    draw.rectangle([grid_right, grid_top, totals_col_x, grid_bottom], outline=text_color, width=2)

    # Row status names
    draw.text((30, status_y['OFF'] - 6), "1: OFF DUTY", fill=text_color, font=font_medium)
    draw.text((30, status_y['SB'] - 6), "2: SLEEPER BERTH", fill=text_color, font=font_medium)
    draw.text((30, status_y['D'] - 6), "3: DRIVING", fill=text_color, font=font_medium)
    draw.text((30, status_y['ON'] - 6), "4: ON DUTY (ND)", fill=text_color, font=font_medium)

    # Hourly Lines and Labels
    # Midnight = Hour 0, Noon = Hour 12, Midnight = Hour 24
    hour_labels = ["M", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "N", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "M"]
    
    for h in range(25):
        x = grid_left + h * 40
        # Vertical hour line
        if h > 0 and h < 24:
            draw.line((x, grid_top, x, grid_bottom), fill=grid_color, width=1)
            
        # Draw labels above
        label = hour_labels[h]
        # Handle font center offsets
        label_w = 8 if label in ["10", "11", "N", "M"] else 5
        draw.text((x - label_w, grid_top - 20), label, fill=text_color, font=font_small)
        
        # Quarter ticks
        if h < 24:
            for q in [1, 2, 3]:
                qx = x + q * 10
                tick_h = 8 if q == 2 else 4  # longer tick for 30-min
                # Draw tick marks on horizontal borders
                for y_base in [grid_top, grid_top + row_height, grid_top + 2*row_height, grid_top + 3*row_height, grid_bottom]:
                    draw.line((qx, y_base, qx, y_base + tick_h), fill=grid_color if q != 2 else text_color, width=1)

    # Column header for Totals
    draw.text((grid_right + 5, grid_top - 20), "TOTAL", fill=text_color, font=font_small)

    # 4. Draw Driver's Path
    segments = day_data.get('segments', [])
    last_x = None
    last_y = None

    def time_to_x(time_str):
        # time_str is 'HH:MM'
        parts = time_str.split(':')
        h = int(parts[0])
        m = int(parts[1])
        return grid_left + h * 40 + (m / 60.0) * 40

    for seg in segments:
        status = seg['status']
        if status not in status_y:
            continue
            
        x_start = time_to_x(seg['start'])
        x_end = time_to_x(seg['end'])
        y = status_y[status]

        # Connect vertically from last segment if needed
        if last_x is not None and last_y is not None:
            # We connect (last_x, last_y) -> (x_start, y)
            draw.line((last_x, last_y, x_start, y), fill=line_color, width=4)

        # Draw horizontal segment
        draw.line((x_start, y, x_end, y), fill=line_color, width=4)
        
        last_x = x_end
        last_y = y

    # Write totals in right column
    totals = day_data.get('totals', {})
    for status, key in [('OFF', 'OFF'), ('SB', 'SB'), ('D', 'D'), ('ON', 'ON')]:
        y = status_y[status]
        val = totals.get(key, 0.0)
        draw.text((grid_right + 12, y - 6), f"{val:.1f}", fill=text_color, font=font_medium)

    # 5. Draw Remarks Section below the grid
    remarks_top = 370
    draw.text((30, remarks_top), "REMARKS", fill=text_color, font=font_medium)
    
    # Table header
    draw.line((30, remarks_top + 20, 1170, remarks_top + 20), fill=text_color, width=2)
    draw.text((40, remarks_top + 25), "TIME", fill=text_color, font=font_medium)
    draw.text((120, remarks_top + 25), "LOCATION", fill=text_color, font=font_medium)
    draw.text((400, remarks_top + 25), "REMARKS / ACTIVITY", fill=text_color, font=font_medium)
    draw.line((30, remarks_top + 45, 1170, remarks_top + 45), fill=text_color, width=1)

    remarks = day_data.get('remarks', [])
    r_idx = 0
    y_offset = remarks_top + 50
    
    # Limit to 10 remarks on template to avoid overflow
    for rem in remarks[:10]:
        draw.text((40, y_offset), rem.get('time', ''), fill=text_color, font=font_small)
        draw.text((120, y_offset), rem.get('location', '')[:45], fill=text_color, font=font_small)
        draw.text((400, y_offset), rem.get('remark', '')[:90], fill=text_color, font=font_small)
        draw.line((30, y_offset + 18, 1170, y_offset + 18), fill=subgrid_color, width=1)
        y_offset += 22
        r_idx += 1

    # Fill remaining table rows to look neat
    for i in range(r_idx, 8):
        draw.line((30, y_offset + 18, 1170, y_offset + 18), fill=subgrid_color, width=1)
        y_offset += 22

    # Draw border around remarks
    draw.rectangle([30, remarks_top + 20, 1170, y_offset], outline=text_color, width=1)

    # Draw carrier signatures placeholder at the bottom
    draw.text((30, 750), "I certify these entries are true and correct:", fill=text_color, font=font_tiny)
    draw.line((240, 760, 460, 760), fill=grid_color, width=1)
    draw.text((240, 765), "Driver's Signature", fill="#64748B", font=font_tiny)

    return img
