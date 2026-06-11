import json
from django.db import models

class Driver(models.Model):
    name = models.CharField(max_length=150)
    current_cycle_used = models.FloatField(default=0.0)
    truck_number = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.name} (Truck #{self.truck_number})"


class Trip(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='trips')
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    total_miles = models.FloatField(default=0.0)
    total_time = models.FloatField(default=0.0) # in hours
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Store JSON lists/objects for route line and violations
    _route_geometry = models.TextField(db_column='route_geometry', default='[]')
    _violations = models.TextField(db_column='violations', default='[]')

    @property
    def route_geometry(self):
        return json.loads(self._route_geometry)

    @route_geometry.setter
    def route_geometry(self, value):
        self._route_geometry = json.dumps(value)

    @property
    def violations(self):
        return json.loads(self._violations)

    @violations.setter
    def violations(self, value):
        self._violations = json.dumps(value)

    def __str__(self):
        return f"Trip {self.id} from {self.current_location} to {self.dropoff_location}"


class TripDay(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='days')
    day_number = models.IntegerField()
    date = models.DateField()
    driving_hours = models.FloatField(default=0.0)
    duty_hours = models.FloatField(default=0.0)
    rest_hours = models.FloatField(default=0.0)
    
    # Store JSON strings for fuel stops, remarks, segments
    _fuel_stops = models.TextField(db_column='fuel_stops', default='[]')
    _remarks = models.TextField(db_column='remarks', default='[]')
    _segments = models.TextField(db_column='segments', default='[]')

    @property
    def fuel_stops(self):
        return json.loads(self._fuel_stops)

    @fuel_stops.setter
    def fuel_stops(self, value):
        self._fuel_stops = json.dumps(value)

    @property
    def remarks(self):
        return json.loads(self._remarks)

    @remarks.setter
    def remarks(self, value):
        self._remarks = json.dumps(value)

    @property
    def segments(self):
        return json.loads(self._segments)

    @segments.setter
    def segments(self, value):
        self._segments = json.dumps(value)

    def __str__(self):
        return f"Trip {self.trip.id} - Day {self.day_number}"


class LogSheet(models.Model):
    trip_day = models.ForeignKey(TripDay, on_delete=models.CASCADE, related_name='logs')
    image_url = models.CharField(max_length=500)
    pdf_url = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log Sheet for Day {self.trip_day.day_number} of Trip {self.trip_day.trip.id}"
