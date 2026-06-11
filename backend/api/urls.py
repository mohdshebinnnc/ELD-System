from django.urls import path
from . import views

urlpatterns = [
    path('trips/create', views.create_trip, name='create_trip'),
    path('trips', views.list_trips, name='list_trips'),
    path('trips/<int:pk>', views.get_trip_detail, name='get_trip_detail'),
    path('trips/<int:pk>/map', views.get_trip_map, name='get_trip_map'),
    path('trips/<int:pk>/logs', views.get_trip_logs, name='get_trip_logs'),
    path('trips/<int:pk>/pdf', views.get_trip_pdf, name='get_trip_pdf'),
]
