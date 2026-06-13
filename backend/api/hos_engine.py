import datetime
import requests
import math
import logging

logger = logging.getLogger(__name__)

# Fallback coordinates for key US cities to ensure the application works reliably offline/rate-limited
CITY_COORDINATES = {
    "dallas": (32.7767, -96.7970),
    "oklahoma city": (35.4676, -97.5164),
    "amarillo": (35.2220, -101.8313),
    "chicago": (41.8781, -87.6298),
    "new york": (40.7128, -74.0060),
    "los angeles": (34.0522, -118.2437),
    "houston": (29.7604, -95.3698),
    "phoenix": (33.4484, -112.0740),
    "denver": (39.7392, -104.9903),
    "atlanta": (33.7490, -84.3880),
    "seattle": (47.6062, -122.3321),
    "miami": (25.7617, -80.1918),
    "san francisco": (37.7749, -122.4194),
}

def geocode_location(location_str):
    """
    Geocodes a location string using Nominatim, falling back to a hardcoded database.
    """
    clean_str = location_str.strip().lower()
    
    # Check if we have hardcoded coordinates for this city
    for city, coords in CITY_COORDINATES.items():
        if city in clean_str:
            return coords[0], coords[1], location_str
            
    # Try Nominatim API
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(location_str)}&format=json&limit=1"
        headers = {"User-Agent": "hos-trip-planner-agent-2026"}
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200 and len(response.json()) > 0:
            data = response.json()[0]
            return float(data["lat"]), float(data["lon"]), data.get("display_name", location_str)
    except Exception as e:
        logger.error(f"Geocoding error for {location_str}: {e}")
        
    # Default to Dallas coordinates if everything fails
    return 32.7767, -96.7970, f"{location_str} (Defaulted)"


def get_route(start_lat, start_lon, end_lat, end_lon):
    """
    Queries OSRM API for driving route, distance, and duration.
    Falls back to straight-line distance if API is unavailable.
    """
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}?overview=full&geometries=geojson"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "routes" in data and len(data["routes"]) > 0:
                route = data["routes"][0]
                distance_meters = route["distance"]
                distance_miles = distance_meters * 0.000621371
                duration_seconds = route["duration"]
                duration_hours = duration_seconds / 3600.0
                geometry = route["geometry"]["coordinates"]
                return distance_miles, duration_hours, geometry
    except Exception as e:
        logger.error(f"OSRM routing error: {e}")

    # Fallback: Great Circle Distance + 20% routing overhead
    lat1, lon1, lat2, lon2 = map(math.radians, [start_lat, start_lon, end_lat, end_lon])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 3956 # Radius of earth in miles
    distance_miles = c * r * 1.2 # Add 20% for actual road distance
    duration_hours = distance_miles / 55.0 # Assume 55 mph average
    
    # Generate linear points between start and end
    geometry = [[start_lon, start_lat], [end_lon, end_lat]]
    return distance_miles, duration_hours, geometry


class HOSSimulator:
    def __init__(self, driver_name, truck_number, current_cycle_used, start_date_str):
        self.driver_name = driver_name
        self.truck_number = truck_number
        self.cycle_hours_used = float(current_cycle_used)
        
        # Parse start date
        try:
            self.start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d")
        except:
            self.start_date = datetime.datetime.now()
        
        # Simulation state
        self.current_time = self.start_date.replace(hour=8, minute=0, second=0, microsecond=0)
        self.driving_since_last_break = 0.0
        self.driving_in_window = 0.0
        self.duty_window_elapsed = 0.0
        self.in_duty_window = False
        self.window_start_time = None
        self.trip_miles_driven = 0.0
        
        # Continuous logs list
        # Each entry: { 'start': datetime, 'end': datetime, 'status': str, 'description': str, 'location': str, 'start_miles': float, 'end_miles': float }
        self.timeline = []
        self.violations = []
        
        # Add initial off-duty period before starting the trip (midnight to 08:00)
        initial_off_start = self.current_time.replace(hour=0, minute=0)
        self.timeline.append({
            'start': initial_off_start,
            'end': self.current_time,
            'status': 'OFF',
            'description': 'Off Duty (Pre-Trip)',
            'location': 'Origin',
            'start_miles': 0.0,
            'end_miles': 0.0
        })

    def trigger_violation(self, text):
        # Fallback for old/direct calls. E.g. default to RED actual violation if not mapped.
        self.add_compliance_event('REST_BREAK', 'red', text)

    def add_compliance_event(self, category, severity, message, location=""):
        event_time_str = self.current_time.strftime('%Y-%m-%d %H:%M')
        self.violations.append({
            'time': event_time_str,
            'category': category,
            'severity': severity,
            'message': message,
            'location': location or ''
        })

    def add_timeline_segment(self, status, duration_hours, description, location_name):
        segment_start = self.current_time
        self.current_time += datetime.timedelta(hours=duration_hours)
        segment_end = self.current_time
        
        start_miles = self.trip_miles_driven
        if status == 'D':
            self.trip_miles_driven += duration_hours * 55.0
        end_miles = self.trip_miles_driven

        self.timeline.append({
            'start': segment_start,
            'end': segment_end,
            'status': status,
            'description': description,
            'location': location_name,
            'start_miles': round(start_miles, 1),
            'end_miles': round(end_miles, 1)
        })

    def enter_duty_window_if_needed(self, location_name):
        if not self.in_duty_window:
            self.in_duty_window = True
            self.window_start_time = self.current_time
            self.driving_in_window = 0.0
            self.duty_window_elapsed = 0.0
            # Note: Starting duty window
            logger.info(f"Duty window started at {self.current_time}")

    def simulate_rest_break(self, location_name):
        # Insert a 30-minute rest break (OFF)
        self.add_timeline_segment('OFF', 0.5, '30-Minute Rest Break', location_name)
        self.driving_since_last_break = 0.0
        if self.in_duty_window:
            self.duty_window_elapsed += 0.5

    def simulate_sleeper_berth(self, location_name):
        # Insert a 10-hour sleeper berth (SB)
        self.add_timeline_segment('SB', 10.0, '10-Hour Sleeper Berth Rest', location_name)
        self.driving_since_last_break = 0.0
        self.driving_in_window = 0.0
        self.duty_window_elapsed = 0.0
        self.in_duty_window = False

    def simulate_cycle_restart(self, location_name):
        # Insert a 34-hour restart (OFF)
        self.add_timeline_segment('OFF', 34.0, '34-Hour Cycle Restart', location_name)
        self.driving_since_last_break = 0.0
        self.driving_in_window = 0.0
        self.duty_window_elapsed = 0.0
        self.in_duty_window = False
        self.cycle_hours_used = 0.0

    def simulate_fuel_stop(self, location_name):
        self.enter_duty_window_if_needed(location_name)
        # Add 30 minutes on duty for fuel
        self.add_timeline_segment('ON', 0.5, 'Fuel Stop (30 mins On Duty)', location_name)
        self.add_compliance_event('FUEL_STOP', 'blue', 'Scheduled Fuel Stop', location_name)
        self.cycle_hours_used += 0.5
        if self.in_duty_window:
            self.duty_window_elapsed += 0.5

    def simulate_on_duty_work(self, hours, description, location_name):
        remaining_hours = hours
        while remaining_hours > 0:
            self.enter_duty_window_if_needed(location_name)
            
            # Constraints
            time_to_14 = 14.0 - self.duty_window_elapsed
            time_to_70 = 70.0 - self.cycle_hours_used
            
            # Pick smallest step
            step = min(remaining_hours, time_to_14, time_to_70)
            if step <= 0:
                if time_to_70 <= 0:
                    self.simulate_cycle_restart(location_name)
                elif time_to_14 <= 0:
                    self.simulate_sleeper_berth(location_name)
                continue
                
            # Perform work step
            self.add_timeline_segment('ON', step, description, location_name)
            self.cycle_hours_used += step
            self.duty_window_elapsed += step
            remaining_hours -= step
            
            # Check limits
            if self.cycle_hours_used >= 70.0:
                self.add_compliance_event('SLEEPER_BERTH', 'amber', 'Begin Off-Duty / 34-Hour Cycle Restart', location_name)
                self.simulate_cycle_restart(location_name)
            elif self.duty_window_elapsed >= 14.0:
                self.add_compliance_event('SLEEPER_BERTH', 'amber', 'Begin Off-Duty / Sleeper Berth Period', location_name)
                self.simulate_sleeper_berth(location_name)

    def simulate_driving(self, driving_hours, from_loc, to_loc):
        remaining_hours = driving_hours
        while remaining_hours > 0:
            self.enter_duty_window_if_needed(from_loc)
            
            # HOS limits:
            # 1. 8-hour driving since break
            time_to_8 = 8.0 - self.driving_since_last_break
            # 2. 11-hour driving in window
            time_to_11 = 11.0 - self.driving_in_window
            # 3. 14-hour duty window
            time_to_14 = 14.0 - self.duty_window_elapsed
            # 4. 70-hour weekly cycle
            time_to_70 = 70.0 - self.cycle_hours_used
            # 5. Distance to next fuel stop (1000 miles, driven at 55 mph)
            miles_to_next_fuel = 1000.0 - (self.trip_miles_driven % 1000.0)
            if miles_to_next_fuel == 0:
                miles_to_next_fuel = 1000.0
            time_to_fuel = miles_to_next_fuel / 55.0
            
            # Smallest step we can take
            step = min(remaining_hours, time_to_8, time_to_11, time_to_14, time_to_70, time_to_fuel)
            if step <= 0.001:
                # Handle limit triggers
                if time_to_70 <= 0:
                    self.simulate_cycle_restart(from_loc)
                elif time_to_14 <= 0 or time_to_11 <= 0:
                    self.simulate_sleeper_berth(from_loc)
                elif time_to_8 <= 0:
                    self.simulate_rest_break(from_loc)
                elif time_to_fuel <= 0:
                    self.simulate_fuel_stop(from_loc)
                continue
                
            # Perform driving step
            desc = f"Driving from {from_loc} to {to_loc}"
            self.add_timeline_segment('D', step, desc, from_loc)
            
            self.cycle_hours_used += step
            self.driving_since_last_break += step
            self.driving_in_window += step
            self.duty_window_elapsed += step
            remaining_hours -= step

            # Post-step checks
            # Note: Python float precision check
            if self.cycle_hours_used >= 70.0:
                self.add_compliance_event('SLEEPER_BERTH', 'amber', 'Begin Off-Duty / 34-Hour Cycle Restart', from_loc)
                self.simulate_cycle_restart(from_loc)
            elif self.duty_window_elapsed >= 14.0:
                self.add_compliance_event('SLEEPER_BERTH', 'amber', 'Begin Off-Duty / Sleeper Berth Period', from_loc)
                self.simulate_sleeper_berth(from_loc)
            elif self.driving_in_window >= 11.0:
                self.add_compliance_event('END_OF_SHIFT', 'amber', 'End Driving Shift (11-Hour Driving Limit Reached)', from_loc)
                self.simulate_sleeper_berth(from_loc)
            elif self.driving_since_last_break >= 8.0:
                self.add_compliance_event('REST_BREAK', 'amber', 'Required 30-Minute Rest Break', from_loc)
                self.simulate_rest_break(from_loc)
            elif abs((self.trip_miles_driven % 1000.0)) < 0.01 or (self.trip_miles_driven > 0 and abs((self.trip_miles_driven % 1000.0) - 1000.0) < 0.01):
                self.simulate_fuel_stop(from_loc)


def split_timeline_into_days(timeline, base_date):
    """
    Splits a continuous timeline list of segments into 24-hour daily segments starting at midnight.
    Each day returned contains exactly 24.0 hours of status segments.
    """
    if not timeline:
        return []
        
    # Find overall min and max dates
    start_dt = min(s['start'] for s in timeline)
    end_dt = max(s['end'] for s in timeline)
    
    # Align start_dt to midnight of its day
    day_start = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    # Align end_dt to the next midnight
    day_end = (end_dt + datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    days_data = []
    current_day = day_start
    day_number = 1
    
    while current_day < day_end:
        next_day = current_day + datetime.timedelta(days=1)
        day_segments = []
        
        # We need to fill the entire 24 hour block (current_day to next_day)
        # Iterate over all segments in timeline to see if they overlap with this day
        for seg in timeline:
            # Overlap interval: [max(seg_start, day_start), min(seg_end, day_end)]
            overlap_start = max(seg['start'], current_day)
            overlap_end = min(seg['end'], next_day)
            
            if overlap_start < overlap_end:
                duration = (overlap_end - overlap_start).total_seconds() / 3600.0
                day_segments.append({
                    'start': overlap_start.strftime('%H:%M'),
                    'end': overlap_end.strftime('%H:%M'),
                    'status': seg['status'],
                    'duration': round(duration, 2),
                    'description': seg['description'],
                    'location': seg['location'],
                    'start_miles': seg['start_miles'],
                    'end_miles': seg['end_miles']
                })
                
        # We represent the day as 1440 slots (one per minute) to ensure exactly 24 hours
        minutes_status = [None] * 1440
        minutes_data = [None] * 1440
        
        def str_to_mins(t_str):
            parts = t_str.split(':')
            h = int(parts[0])
            m = int(parts[1])
            return h * 60 + m
            
        for seg in day_segments:
            s_min = str_to_mins(seg['start'])
            e_min = str_to_mins(seg['end'])
            s_min = max(0, min(1440, s_min))
            e_min = max(0, min(1440, e_min))
            
            for m in range(s_min, e_min):
                minutes_status[m] = seg['status']
                minutes_data[m] = {
                    'description': seg['description'],
                    'location': seg['location'],
                    'start_miles': seg['start_miles'],
                    'end_miles': seg['end_miles']
                }
                
        # Fill any gaps (None values) with OFF status
        default_loc = "Resting"
        default_miles = 0.0
        for data in minutes_data:
            if data is not None:
                default_loc = data['location']
                default_miles = data['start_miles']
                break
                
        for m in range(1440):
            if minutes_status[m] is None:
                minutes_status[m] = 'OFF'
                minutes_data[m] = {
                    'description': 'Off Duty',
                    'location': default_loc,
                    'start_miles': default_miles,
                    'end_miles': default_miles
                }
                
        # Reconstruct segments by grouping contiguous identical status blocks
        merged = []
        start_m = 0
        while start_m < 1440:
            status = minutes_status[start_m]
            data = minutes_data[start_m]
            
            end_m = start_m
            while end_m < 1440 and minutes_status[end_m] == status and minutes_data[end_m]['description'] == data['description'] and minutes_data[end_m]['location'] == data['location']:
                end_m += 1
                
            def mins_to_str(mins):
                h = mins // 60
                m = mins % 60
                return f"{h:02d}:{m:02d}"
                
            duration = (end_m - start_m) / 60.0
            merged.append({
                'start': mins_to_str(start_m),
                'end': mins_to_str(end_m),
                'status': status,
                'duration': round(duration, 2),
                'description': data['description'],
                'location': data['location'],
                'start_miles': data['start_miles'],
                'end_miles': data['end_miles']
            })
            
            start_m = end_m
                    
        # Summarize hours by status
        off_hours = sum(s['duration'] for s in merged if s['status'] == 'OFF')
        sb_hours = sum(s['duration'] for s in merged if s['status'] == 'SB')
        d_hours = sum(s['duration'] for s in merged if s['status'] == 'D')
        on_hours = sum(s['duration'] for s in merged if s['status'] == 'ON')
        
        # Calculate details
        miles_driven = max([s['end_miles'] for s in merged] + [0.0]) - min([s['start_miles'] for s in merged] + [0.0])
        
        # Extract remarks for this day
        remarks = []
        for s in merged:
            if s['status'] in ['ON', 'OFF', 'SB'] and 'Driving' not in s['description']:
                remarks.append({
                    'time': s['start'],
                    'location': s['location'],
                    'remark': s['description']
                })
            elif s['status'] == 'D' and 'Departed' in s['description']:
                remarks.append({
                    'time': s['start'],
                    'location': s['location'],
                    'remark': s['description']
                })
                
        days_data.append({
            'day_number': day_number,
            'date': current_day.strftime('%Y-%m-%d'),
            'segments': merged,
            'totals': {
                'OFF': round(off_hours, 2),
                'SB': round(sb_hours, 2),
                'D': round(d_hours, 2),
                'ON': round(on_hours, 2),
                'total': round(off_hours + sb_hours + d_hours + on_hours, 2)
            },
            'miles_driven': round(miles_driven, 1),
            'remarks': remarks
        })
        
        day_number += 1
        current_day = next_day
        
    return days_data
