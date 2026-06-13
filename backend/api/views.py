import os
import json
import logging
from django.shortcuts import render
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Driver, Trip, TripDay, LogSheet
from .serializers import TripSerializer, TripDaySerializer, LogSheetSerializer, DriverSerializer

# Import local engines
from .hos_engine import geocode_location, get_route, HOSSimulator, split_timeline_into_days
from .log_drawer import draw_log_sheet
from .pdf_generator import generate_trip_pdf

logger = logging.getLogger(__name__)

@api_view(['POST'])
def create_trip(request):
    """
    POST /api/trips/create
    Creates a driver, geocodes coordinates, calculates routes, runs the HOS compliance engine,
    generates daily log PNGs, compiles a multi-page PDF, and stores everything in the database.
    """
    data = request.data
    
    # Required parameters
    current_location = data.get('current_location')
    pickup_location = data.get('pickup_location')
    dropoff_location = data.get('dropoff_location')
    current_cycle_used = data.get('current_cycle_used', 0.0)
    driver_name = data.get('driver_name')
    truck_number = data.get('truck_number')
    date_str = data.get('date') # Format: YYYY-MM-DD
    
    if not all([current_location, pickup_location, dropoff_location, driver_name, truck_number, date_str]):
        return Response(
            {"error": "Missing required fields. Please fill in all dashboard parameters."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # 1. Create or retrieve driver
        driver, _ = Driver.objects.get_or_create(
            name=driver_name,
            truck_number=truck_number,
            defaults={'current_cycle_used': float(current_cycle_used)}
        )
        # Always update current cycle used hours to what was entered
        driver.current_cycle_used = float(current_cycle_used)
        driver.save()

        # 2. Geocode locations
        start_lat, start_lon, start_name = geocode_location(current_location)
        pickup_lat, pickup_lon, pickup_name = geocode_location(pickup_location)
        dropoff_lat, dropoff_lon, dropoff_name = geocode_location(dropoff_location)

        # 3. Calculate route segments
        # Leg 1: Current to Pickup
        miles_1, time_1, geom_1 = get_route(start_lat, start_lon, pickup_lat, pickup_lon)
        # Leg 2: Pickup to Dropoff
        miles_2, time_2, geom_2 = get_route(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)

        total_miles = miles_1 + miles_2
        # Driving time + 2 hours for loading/unloading + extra HOS breaks (to be simulated)
        driving_time_hours = total_miles / 55.0

        # 4. HOS Simulator
        simulator = HOSSimulator(driver_name, truck_number, current_cycle_used, date_str)
        
        # Simulate Leg 1: Drive from Current Location to Pickup
        simulator.simulate_driving(time_1, start_name, pickup_name)
        
        # Simulate Pickup: 1 hour on duty loading
        simulator.add_compliance_event('PICKUP', 'blue', 'Loading Freight at Pickup', pickup_name)
        simulator.simulate_on_duty_work(1.0, "Loading Freight at Pickup", pickup_name)
        
        # Simulate Leg 2: Drive from Pickup to Dropoff
        simulator.simulate_driving(time_2, pickup_name, dropoff_name)
        
        # Simulate Dropoff: 1 hour on duty unloading
        simulator.add_compliance_event('DROPOFF', 'blue', 'Unloading Freight at Dropoff', dropoff_name)
        simulator.simulate_on_duty_work(1.0, "Unloading Freight at Dropoff", dropoff_name)

        # 5. Split timeline into calendar days (00:00 to 24:00)
        days_data = split_timeline_into_days(simulator.timeline, date_str)

        # 6. Save Trip object
        trip = Trip.objects.create(
            driver=driver,
            current_location=start_name,
            pickup_location=pickup_name,
            dropoff_location=dropoff_name,
            total_miles=total_miles,
            total_time=driving_time_hours,
        )
        
        # Store route geometry and violations
        # Combine geometries of leg 1 and leg 2 for rendering
        combined_geom = geom_1 + geom_2
        trip.route_geometry = combined_geom
        trip.violations = simulator.violations
        trip.save()

        # Directories for media files
        media_subfolder = 'generated_logs'
        full_media_path = os.path.join(settings.MEDIA_ROOT, media_subfolder)
        os.makedirs(full_media_path, exist_ok=True)

        # 7. For each day, save TripDay and draw log sheet PNG
        log_images_paths = []
        log_images_urls = []
        
        trip_data_for_pdf = {
            'driver_name': driver.name,
            'truck_number': driver.truck_number,
            'current_location': start_name,
            'pickup_location': pickup_name,
            'dropoff_location': dropoff_name,
            'total_miles': total_miles,
            'total_time': driving_time_hours + 2.0, # include work hours
            'created_at': trip.created_at.strftime('%Y-%m-%d %H:%M'),
            'violations': simulator.violations
        }

        for day in days_data:
            tday = TripDay.objects.create(
                trip=trip,
                day_number=day['day_number'],
                date=day['date'],
                driving_hours=day['totals']['D'],
                duty_hours=day['totals']['ON'] + day['totals']['D'],
                rest_hours=day['totals']['OFF'] + day['totals']['SB']
            )
            tday.fuel_stops = [s for s in day['segments'] if 'Fuel' in s['description']]
            tday.remarks = day['remarks']
            tday.segments = day['segments']
            tday.save()

            # Draw log PNG
            img = draw_log_sheet(day, driver.name, driver.truck_number)
            
            img_filename = f"trip_{trip.id}_day_{day['day_number']}.png"
            img_filepath = os.path.join(full_media_path, img_filename)
            img.save(img_filepath)
            
            log_images_paths.append(img_filepath)
            
            # Absolute URL path
            img_url = f"{settings.MEDIA_URL}{media_subfolder}/{img_filename}"
            log_images_urls.append((tday, img_url))

        # 8. Generate unified PDF report
        pdf_filename = f"trip_{trip.id}_summary.pdf"
        pdf_filepath = os.path.join(full_media_path, pdf_filename)
        
        generate_trip_pdf(trip_data_for_pdf, days_data, log_images_paths, pdf_filepath)
        pdf_url = f"{settings.MEDIA_URL}{media_subfolder}/{pdf_filename}"

        # 9. Create LogSheet records
        for tday, img_url in log_images_urls:
            LogSheet.objects.create(
                trip_day=tday,
                image_url=img_url,
                pdf_url=pdf_url
            )

        serializer = TripSerializer(trip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.exception("Error creating HOS trip plan")
        return Response(
            {"error": f"Internal calculation error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def list_trips(request):
    """
    GET /api/trips
    Lists all planned trips in reverse chronological order.
    """
    trips = Trip.objects.all().order_by('-created_at')
    serializer = TripSerializer(trips, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_trip_detail(request, pk):
    """
    GET /api/trips/:id
    Retrieves detail statistics for a specific trip.
    """
    try:
        trip = Trip.objects.get(pk=pk)
        serializer = TripSerializer(trip)
        return Response(serializer.data)
    except Trip.DoesNotExist:
        return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_trip_map(request, pk):
    """
    GET /api/trips/:id/map
    Retrieves OSRM path points and markers for Leaflet mapping.
    """
    try:
        trip = Trip.objects.get(pk=pk)
        
        # Gather fuel stop locations, rest breaks, overnight stops from TripDays
        days = trip.days.all().order_by('day_number')
        fuel_stops = []
        rest_stops = []
        overnight_stops = []
        
        for d in days:
            segments = d.segments
            for seg in segments:
                if 'Fuel Stop' in seg['description']:
                    fuel_stops.append({
                        'time': seg['start'],
                        'day': d.day_number,
                        'location': seg['location'],
                        'description': seg['description']
                    })
                elif 'Rest Break' in seg['description']:
                    rest_stops.append({
                        'time': seg['start'],
                        'day': d.day_number,
                        'location': seg['location'],
                        'description': seg['description']
                    })
                elif 'Sleeper Berth' in seg['description'] or 'Cycle Restart' in seg['description']:
                    overnight_stops.append({
                        'time': seg['start'],
                        'day': d.day_number,
                        'location': seg['location'],
                        'description': seg['description']
                    })

        # Coordinates lookup for locations
        # Find coordinates for markers
        def find_coords(name):
            lat, lon, _ = geocode_location(name)
            return [lat, lon]

        map_data = {
            "origin": {
                "name": trip.current_location,
                "coordinates": find_coords(trip.current_location)
            },
            "pickup": {
                "name": trip.pickup_location,
                "coordinates": find_coords(trip.pickup_location)
            },
            "dropoff": {
                "name": trip.dropoff_location,
                "coordinates": find_coords(trip.dropoff_location)
            },
            "fuel_stops": [{**f, "coordinates": find_coords(f['location'])} for f in fuel_stops],
            "rest_stops": [{**r, "coordinates": find_coords(r['location'])} for r in rest_stops],
            "overnight_stops": [{**o, "coordinates": find_coords(o['location'])} for o in overnight_stops],
            "route_coordinates": trip.route_geometry # List of [lon, lat] from OSRM
        }
        
        return Response(map_data)
    except Trip.DoesNotExist:
        return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_trip_logs(request, pk):
    """
    GET /api/trips/:id/logs
    Retrieves daily driver logs with drawn image sheets and remarks.
    """
    try:
        trip = Trip.objects.get(pk=pk)
        days = trip.days.all().order_by('day_number')
        
        logs_data = []
        for d in days:
            log_sheet = d.logs.first()
            logs_data.append({
                "day_number": d.day_number,
                "date": d.date.strftime('%Y-%m-%d'),
                "driving_hours": d.driving_hours,
                "duty_hours": d.duty_hours,
                "rest_hours": d.rest_hours,
                "remarks": d.remarks,
                "segments": d.segments,
                "image_url": log_sheet.image_url if log_sheet else None,
                "pdf_url": log_sheet.pdf_url if log_sheet else None
            })
            
        return Response(logs_data)
    except Trip.DoesNotExist:
        return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_trip_pdf(request, pk):
    """
    GET /api/trips/:id/pdf
    Retrieves the download link for the trip PDF.
    """
    try:
        trip = Trip.objects.get(pk=pk)
        day = trip.days.first()
        if day:
            log_sheet = day.logs.first()
            if log_sheet:
                return Response({"pdf_url": log_sheet.pdf_url})
        return Response({"error": "PDF report not generated"}, status=status.HTTP_404_NOT_FOUND)
    except Trip.DoesNotExist:
        return Response({"error": "Trip not found"}, status=status.HTTP_404_NOT_FOUND)
