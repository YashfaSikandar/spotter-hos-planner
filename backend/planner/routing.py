import json
import time
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

USER_AGENT = (
    "SpotterHOSPlanner/1.0 "
    "(full-stack assessment application)"
)


def _fetch_json(url, timeout=30, retries=2):
    """
    Fetch JSON data from an external API with retry support.

    Public routing/geocoding services can occasionally experience
    temporary network or server delays, so retrying helps prevent
    a single timeout from breaking trip planning.
    """

    last_error = None

    for attempt in range(retries + 1):

        try:
            request = Request(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "application/json",
                },
            )

            with urlopen(
                request,
                timeout=timeout,
            ) as response:

                raw_data = response.read().decode("utf-8")

                return json.loads(raw_data)

        except (URLError, HTTPError, TimeoutError) as error:

            last_error = error

            if attempt < retries:
                time.sleep(1.5)

    raise RuntimeError(
        f"External routing service timed out or was unavailable: "
        f"{last_error}"
    )


def geocode_location(location):
    """
    Convert a text location such as 'Dallas, TX'
    into latitude and longitude.
    """

    if not location:
        raise ValueError("Location cannot be empty.")

    params = (
        f"?q={quote(location)}"
        f"&format=jsonv2"
        f"&limit=1"
    )

    url = NOMINATIM_URL + params

    try:
        results = _fetch_json(
            url,
            timeout=15,
            retries=2,
        )

    except Exception as error:
        raise RuntimeError(
            f"Unable to geocode '{location}'. "
            f"Please try again."
        ) from error

    if not results:
        raise ValueError(
            f"Location not found: {location}"
        )

    try:
        return {
            "latitude": float(results[0]["lat"]),
            "longitude": float(results[0]["lon"]),
            "display_name": results[0]["display_name"],
        }

    except (KeyError, TypeError, ValueError) as error:
        raise RuntimeError(
            f"Invalid geocoding response for '{location}'."
        ) from error


def get_route(locations):
    """
    Get a driving route between multiple locations.

    locations should be a list of dictionaries containing
    latitude and longitude.

    The order of locations is preserved:
        current location -> pickup -> drop-off
    """

    if not locations or len(locations) < 2:
        raise ValueError(
            "At least two locations are required to calculate a route."
        )

    try:
        coordinates = ";".join(
            f"{location['longitude']},{location['latitude']}"
            for location in locations
        )

    except (KeyError, TypeError) as error:
        raise ValueError(
            "Invalid location coordinates."
        ) from error

    # We intentionally do NOT request steps=true.
    #
    # The application only needs:
    # - route geometry
    # - total distance
    # - total duration
    # - individual route legs
    #
    # Removing turn-by-turn steps significantly reduces the
    # amount of data returned by OSRM and improves reliability
    # for longer routes.
    url = (
        f"{OSRM_URL}/{coordinates}"
        "?overview=full"
        "&geometries=geojson"
        "&steps=false"
        "&alternatives=false"
    )

    try:
        result = _fetch_json(
            url,
            timeout=60,
            retries=2,
        )

    except Exception as error:
        raise RuntimeError(
            "The routing service is temporarily unavailable. "
            "Please try again."
        ) from error

    if result.get("code") != "Ok":
        raise ValueError(
            "No driving route could be found."
        )

    routes = result.get("routes", [])

    if not routes:
        raise ValueError(
            "No driving route could be found."
        )

    route = routes[0]

    if not route.get("legs"):
        raise ValueError(
            "The routing service returned no route legs."
        )

    try:
        distance_miles = (
            float(route["distance"]) / 1609.344
        )

        duration_hours = (
            float(route["duration"]) / 3600
        )

    except (KeyError, TypeError, ValueError) as error:
        raise RuntimeError(
            "Invalid route data returned by the routing service."
        ) from error

    return {
        "distance_miles": round(
            distance_miles,
            1,
        ),

        "duration_hours": round(
            duration_hours,
            1,
        ),

        "geometry": route.get(
            "geometry",
            {
                "type": "LineString",
                "coordinates": [],
            },
        ),

        "legs": route["legs"],
    }