import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .routing import geocode_location, get_route
from .hos import plan_hos
from .eld import generate_eld_logs


@csrf_exempt
def plan_trip(request):
    """
    Plan a complete trip from:
    - Current location
    - Pickup location
    - Drop-off location
    - Current cycle hours

    Returns:
    - Route information
    - Route geometry
    - HOS schedule
    - ELD daily logs
    """

    # --------------------------------------------------
    # REQUEST METHOD
    # --------------------------------------------------

    if request.method != "POST":
        return JsonResponse(
            {
                "error": "Only POST requests are allowed."
            },
            status=405,
        )

    # --------------------------------------------------
    # PARSE REQUEST
    # --------------------------------------------------

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "error": "Invalid JSON data."
            },
            status=400,
        )

    # --------------------------------------------------
    # INPUTS
    # --------------------------------------------------

    current_location = str(
        data.get("currentLocation", "")
    ).strip()

    pickup_location = str(
        data.get("pickupLocation", "")
    ).strip()

    dropoff_location = str(
        data.get("dropoffLocation", "")
    ).strip()

    raw_cycle_hours = data.get("cycleHours", 0)

    # --------------------------------------------------
    # VALIDATE LOCATIONS
    # --------------------------------------------------

    if not current_location:
        return JsonResponse(
            {
                "error": "Current location is required."
            },
            status=400,
        )

    if not pickup_location:
        return JsonResponse(
            {
                "error": "Pickup location is required."
            },
            status=400,
        )

    if not dropoff_location:
        return JsonResponse(
            {
                "error": "Drop-off location is required."
            },
            status=400,
        )

    # --------------------------------------------------
    # VALIDATE CYCLE HOURS
    # --------------------------------------------------

    try:
        cycle_hours = float(raw_cycle_hours or 0)
    except (TypeError, ValueError):
        return JsonResponse(
            {
                "error": "Current cycle hours must be a valid number."
            },
            status=400,
        )

    if cycle_hours < 0 or cycle_hours > 70:
        return JsonResponse(
            {
                "error": "Current cycle hours must be between 0 and 70."
            },
            status=400,
        )

    # --------------------------------------------------
    # GEOCODE LOCATIONS
    # --------------------------------------------------

    try:
        current = geocode_location(current_location)
    except Exception as error:
        return JsonResponse(
            {
                "error": (
                    f"Unable to find current location "
                    f"'{current_location}'."
                ),
                "details": str(error),
            },
            status=400,
        )

    try:
        pickup = geocode_location(pickup_location)
    except Exception as error:
        return JsonResponse(
            {
                "error": (
                    f"Unable to find pickup location "
                    f"'{pickup_location}'."
                ),
                "details": str(error),
            },
            status=400,
        )

    try:
        dropoff = geocode_location(dropoff_location)
    except Exception as error:
        return JsonResponse(
            {
                "error": (
                    f"Unable to find drop-off location "
                    f"'{dropoff_location}'."
                ),
                "details": str(error),
            },
            status=400,
        )

    # --------------------------------------------------
    # ROUTE
    # --------------------------------------------------

    try:
        route = get_route(
            [
                current,
                pickup,
                dropoff,
            ]
        )
    except Exception as error:
        return JsonResponse(
            {
                "error": (
                    "Unable to calculate the route. "
                    "Please check the locations and try again."
                ),
                "details": str(error),
            },
            status=502,
        )

    # --------------------------------------------------
    # ROUTE LEGS
    # --------------------------------------------------

    try:
        route_legs = []

        for leg in route.get("legs", []):
            route_legs.append(
                {
                    "distance_miles": (
                        float(leg["distance"]) / 1609.344
                    ),
                    "duration_hours": (
                        float(leg["duration"]) / 3600
                    ),
                }
            )

    except (KeyError, TypeError, ValueError) as error:
        return JsonResponse(
            {
                "error": "The routing service returned invalid route data.",
                "details": str(error),
            },
            status=502,
        )

    if not route_legs:
        return JsonResponse(
            {
                "error": "No route legs were returned."
            },
            status=502,
        )

    # --------------------------------------------------
    # HOS PLANNING
    # --------------------------------------------------

    try:
        hos_plan = plan_hos(
            route_legs=route_legs,
            current_cycle_hours=cycle_hours,
        )

    except ValueError as error:
        return JsonResponse(
            {
                "error": str(error)
            },
            status=400,
        )

    except Exception as error:
        return JsonResponse(
            {
                "error": "Unable to generate the HOS schedule.",
                "details": str(error),
            },
            status=500,
        )

    # --------------------------------------------------
    # ELD GENERATION
    # --------------------------------------------------

    try:
        eld_logs = generate_eld_logs(
            hos_events=hos_plan.get("events", []),
            driver_initials="YS",
            driver_number="1224213",
            vehicle_number="P48872",
            trailer_number="TA939200",
            home_terminal=current_location,
            total_driving_miles=hos_plan.get(
                "distanceMiles",
                route.get("distance_miles", 0),
            ),
        )

    except Exception as error:
        return JsonResponse(
            {
                "error": "Unable to generate ELD logs.",
                "details": str(error),
            },
            status=500,
        )

    # --------------------------------------------------
    # RESPONSE
    # --------------------------------------------------

    return JsonResponse(
        {
            "message": "Trip planned successfully.",

            "trip": {
                "currentLocation": current_location,
                "pickupLocation": pickup_location,
                "dropoffLocation": dropoff_location,
                "cycleHours": cycle_hours,

                "locations": {
                    "current": {
                        "name": current_location,
                        "coordinates": current,
                    },

                    "pickup": {
                        "name": pickup_location,
                        "coordinates": pickup,
                    },

                    "dropoff": {
                        "name": dropoff_location,
                        "coordinates": dropoff,
                    },
                },
            },

            "route": {
                "distanceMiles": route.get(
                    "distance_miles",
                    0,
                ),

                "durationHours": route.get(
                    "duration_hours",
                    0,
                ),

                "geometry": route.get(
                    "geometry",
                    [],
                ),
            },

            "hos": hos_plan,

            "eld": eld_logs,
        }
    )