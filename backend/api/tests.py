import os
import datetime
from django.test import TestCase
from django.conf import settings
from api.models import Driver, Trip, TripDay, LogSheet
from api.hos_engine import geocode_location, get_route, HOSSimulator, split_timeline_into_days
from api.log_drawer import draw_log_sheet
from api.pdf_generator import generate_trip_pdf

class HOSTestCase(TestCase):
    def test_geocoding_fallback(self):
        """Verify geocoder successfully falls back to known cities list."""
        lat, lon, name = geocode_location("Dallas, TX")
        self.assertAlmostEqual(lat, 32.7767)
        self.assertAlmostEqual(lon, -96.7970)
        self.assertEqual(name, "Dallas, TX")

        lat2, lon2, name2 = geocode_location("Oklahoma City, OK")
        self.assertAlmostEqual(lat2, 35.4676)
        self.assertAlmostEqual(lon2, -97.5164)

    def test_route_calculation_fallback(self):
        """Verify route fallback returns valid distance and duration."""
        # Querying with Dallas and Oklahoma City coordinates
        miles, duration, geom = get_route(32.7767, -96.7970, 35.4676, -97.5164)
        self.assertGreater(miles, 0)
        self.assertGreater(duration, 0)
        self.assertGreater(len(geom), 0)

    def test_hos_compliance_simulator(self):
        """Test HOS compliance simulator enforces FMCSA limits."""
        # Scenario: John Doe driving TRK-9988 starting at 10.5 cycle hours used
        # We will simulate driving 15 hours continuously, which should trigger:
        # 1. 8-hour rest break (off-duty)
        # 2. 11-hour driving limit / 14-hour duty window (sleeper berth)
        simulator = HOSSimulator("John Doe", "TRK-9988", 10.5, "2026-06-11")
        
        # Drive 15 hours
        simulator.simulate_driving(15.0, "Dallas, TX", "Chicago, IL")
        
        # Verify the timeline contains segments
        self.assertGreater(len(simulator.timeline), 1)
        
        # Check that violations are triggered because driver drives past limits
        # (Though simulator auto-inserts compliance breaks, driving 15 hours means
        #  the simulation loop will automatically take breaks but check if any violations were flagged)
        has_break = any(seg['status'] == 'OFF' and 'Break' in seg['description'] for seg in simulator.timeline)
        has_sleeper = any(seg['status'] == 'SB' and 'Sleeper' in seg['description'] for seg in simulator.timeline)
        
        self.assertTrue(has_break, "Should automatically insert a 30-min break before 8 hours of driving")
        self.assertTrue(has_sleeper, "Should automatically insert a 10-hour sleeper berth before 11 hours of driving")

        # Verify compliance events are tracked as dictionaries
        self.assertGreater(len(simulator.violations), 0)
        for event in simulator.violations:
            self.assertIsInstance(event, dict)
            self.assertIn('category', event)
            self.assertIn('severity', event)
            self.assertIn('message', event)
            self.assertIn('time', event)

    def test_split_timeline_into_days(self):
        """Test timeline splitting preserves 24-hour days correctly."""
        simulator = HOSSimulator("John Doe", "TRK-9988", 0.0, "2026-06-11")
        simulator.simulate_driving(5.0, "Dallas, TX", "Oklahoma City, OK")
        
        days_data = split_timeline_into_days(simulator.timeline, "2026-06-11")
        self.assertGreater(len(days_data), 0)
        
        # Every day must sum to exactly 24.0 hours
        for day in days_data:
            self.assertAlmostEqual(day['totals']['total'], 24.0, places=1)

    def test_log_drawing_and_pdf_compilation(self):
        """Test the image drawing and PDF generation compilation engines."""
        # 1. Create mock day data
        day_data = {
            'day_number': 1,
            'date': '2026-06-11',
            'segments': [
                {'start': '00:00', 'end': '08:00', 'status': 'OFF', 'duration': 8.0, 'description': 'Off Duty', 'location': 'Dallas, TX', 'start_miles': 0, 'end_miles': 0},
                {'start': '08:00', 'end': '13:00', 'status': 'D', 'duration': 5.0, 'description': 'Driving', 'location': 'Dallas, TX', 'start_miles': 0, 'end_miles': 275.0},
                {'start': '13:00', 'end': '13:30', 'status': 'OFF', 'duration': 0.5, 'description': '30-Minute Rest Break', 'location': 'Oklahoma City, OK', 'start_miles': 275.0, 'end_miles': 275.0},
                {'start': '13:30', 'end': '18:30', 'status': 'D', 'duration': 5.0, 'description': 'Driving', 'location': 'Oklahoma City, OK', 'start_miles': 275.0, 'end_miles': 550.0},
                {'start': '18:30', 'end': '24:00', 'status': 'SB', 'duration': 5.5, 'description': 'Sleeper Berth', 'location': 'Amarillo, TX', 'start_miles': 550.0, 'end_miles': 550.0}
            ],
            'totals': {'OFF': 8.5, 'SB': 5.5, 'D': 10.0, 'ON': 0.0, 'total': 24.0},
            'miles_driven': 550.0,
            'remarks': [
                {'time': '08:00', 'location': 'Dallas, TX', 'remark': 'Pre-trip depart'},
                {'time': '13:00', 'location': 'Oklahoma City, OK', 'remark': 'Rest stop'},
                {'time': '18:30', 'location': 'Amarillo, TX', 'remark': 'Sleeper berth'}
            ]
        }

        # 2. Test Pillow image generation
        img = draw_log_sheet(day_data, "John Doe", "TRK-9009")
        self.assertIsNotNone(img)
        self.assertEqual(img.size, (1200, 800))

        # Save temporarily
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_test')
        os.makedirs(temp_dir, exist_ok=True)
        img_path = os.path.join(temp_dir, 'test_day_1.png')
        img.save(img_path)
        self.assertTrue(os.path.exists(img_path))

        # 3. Test ReportLab PDF compiler
        trip_data = {
            'driver_name': 'John Doe',
            'truck_number': 'TRK-9009',
            'current_location': 'Dallas, TX',
            'pickup_location': 'Oklahoma City, OK',
            'dropoff_location': 'Amarillo, TX',
            'total_miles': 550.0,
            'total_time': 10.0,
            'created_at': '2026-06-11 08:00',
            'violations': []
        }
        pdf_path = os.path.join(temp_dir, 'test_trip.pdf')
        generate_trip_pdf(trip_data, [day_data], [img_path], pdf_path)
        self.assertTrue(os.path.exists(pdf_path))

        # Cleanup temp files
        if os.path.exists(img_path):
            os.remove(img_path)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
