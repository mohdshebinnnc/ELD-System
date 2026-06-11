from rest_framework import serializers
from .models import Driver, Trip, TripDay, LogSheet

class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ['id', 'name', 'current_cycle_used', 'truck_number']


class LogSheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogSheet
        fields = ['id', 'trip_day', 'image_url', 'pdf_url', 'created_at']


class TripDaySerializer(serializers.ModelSerializer):
    logs = LogSheetSerializer(many=True, read_only=True)
    fuel_stops = serializers.ReadOnlyField()
    remarks = serializers.ReadOnlyField()
    segments = serializers.ReadOnlyField()

    class Meta:
        model = TripDay
        fields = [
            'id', 'trip', 'day_number', 'date', 
            'driving_hours', 'duty_hours', 'rest_hours', 
            'fuel_stops', 'remarks', 'segments', 'logs'
        ]


class TripSerializer(serializers.ModelSerializer):
    driver = DriverSerializer(read_only=True)
    days = TripDaySerializer(many=True, read_only=True)
    route_geometry = serializers.ReadOnlyField()
    violations = serializers.ReadOnlyField()

    class Meta:
        model = Trip
        fields = [
            'id', 'driver', 'current_location', 'pickup_location', 'dropoff_location',
            'total_miles', 'total_time', 'created_at', 'route_geometry', 'violations', 'days'
        ]
