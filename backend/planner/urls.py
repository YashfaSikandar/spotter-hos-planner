from django.urls import path
from .views import plan_trip

urlpatterns = [
    path("plan-trip/", plan_trip, name="plan_trip"),
]