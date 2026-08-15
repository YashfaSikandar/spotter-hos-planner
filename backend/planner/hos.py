MAX_DRIVING_HOURS = 11
MAX_DUTY_WINDOW_HOURS = 14

BREAK_AFTER_DRIVING_HOURS = 8
BREAK_DURATION_HOURS = 0.5

DAILY_RESET_HOURS = 10

MAX_CYCLE_HOURS = 70

PICKUP_DURATION_HOURS = 1
DROPOFF_DURATION_HOURS = 1

FUEL_INTERVAL_MILES = 1000
FUEL_STOP_DURATION_HOURS = 0.5


def plan_hos(route_legs, current_cycle_hours):
    """
    Build an HOS-aware schedule for the route.

    Assumptions:
    - Property-carrying driver
    - 70-hour / 8-day cycle
    - 11-hour driving limit
    - 14-hour duty window
    - 30-minute non-driving break after 8 cumulative driving hours
    - 10-hour off-duty reset
    - 1-hour pickup
    - 1-hour drop-off
    - Fuel stop at least every 1,000 miles
    """

    events = []

    elapsed_hours = 0.0

    # Hours worked since the beginning of the current
    # 14-hour duty window.
    duty_since_reset = 0.0

    # Driving hours since the last 10-hour reset.
    driving_since_reset = 0.0

    # Driving hours since the last qualifying 30-minute break.
    driving_since_break = 0.0

    # 70-hour / 8-day cycle usage.
    cycle_used = float(current_cycle_hours or 0)

    if cycle_used < 0:
        raise ValueError(
            "Cycle hours cannot be negative."
        )

    if cycle_used > MAX_CYCLE_HOURS:
        raise ValueError(
            "Current cycle hours cannot exceed 70 hours."
        )

    # Actual route distance already driven.
    distance_driven = 0.0

    # Next mileage point where a fuel stop is required.
    next_fuel_mile = FUEL_INTERVAL_MILES

    # ------------------------------------------------------
    # EVENT HELPERS
    # ------------------------------------------------------

    def add_event(
        event_type,
        duration,
        description,
        location=None,
    ):
        nonlocal elapsed_hours
        nonlocal duty_since_reset
        nonlocal cycle_used

        duration = float(duration)

        # Every on-duty activity must fit inside the
        # 14-hour duty window.
        if (
            duty_since_reset + duration
            > MAX_DUTY_WINDOW_HOURS
        ):
            raise ValueError(
                "The planned duty activity would exceed "
                "the 14-hour driving window."
            )

        # All on-duty activities count toward the
        # 70-hour cycle.
        if (
            cycle_used + duration
            > MAX_CYCLE_HOURS
        ):
            raise ValueError(
                "The trip would exceed the 70-hour / 8-day "
                "on-duty cycle."
            )

        events.append(
            {
                "type": event_type,
                "startHour": round(
                    elapsed_hours,
                    2,
                ),
                "durationHours": round(
                    duration,
                    2,
                ),
                "description": description,
                "location": location,
            }
        )

        elapsed_hours += duration
        duty_since_reset += duration
        cycle_used += duration

    def add_rest(duration, description):
        nonlocal elapsed_hours
        nonlocal duty_since_reset
        nonlocal driving_since_reset
        nonlocal driving_since_break

        duration = float(duration)

        events.append(
            {
                "type": "off_duty",
                "startHour": round(
                    elapsed_hours,
                    2,
                ),
                "durationHours": round(
                    duration,
                    2,
                ),
                "description": description,
                "location": None,
            }
        )

        elapsed_hours += duration

        # A 10-hour consecutive off-duty period resets:
        # - the 14-hour duty window
        # - the 11-hour driving clock
        # - the 8-hour break clock
        if duration >= DAILY_RESET_HOURS:
            duty_since_reset = 0.0
            driving_since_reset = 0.0
            driving_since_break = 0.0

        # A 30-minute or longer non-driving period
        # satisfies the required driving break.
        elif duration >= BREAK_DURATION_HOURS:
            driving_since_break = 0.0

    def drive(duration):
        nonlocal driving_since_reset
        nonlocal driving_since_break

        add_event(
            "driving",
            duration,
            "Driving toward next stop.",
        )

        driving_since_reset += duration
        driving_since_break += duration

    # ------------------------------------------------------
    # PROCESS ROUTE LEGS
    # ------------------------------------------------------

    for index, leg in enumerate(route_legs):

        leg_distance = float(
            leg["distance_miles"]
        )

        leg_duration = float(
            leg["duration_hours"]
        )

        if leg_duration <= 0:
            continue

        if leg_distance < 0:
            raise ValueError(
                "Route distance cannot be negative."
            )

        # Estimate average route speed for this leg.
        average_speed = (
            leg_distance / leg_duration
            if leg_duration > 0
            else 0
        )

        remaining_driving = leg_duration

        # --------------------------------------------------
        # DRIVING LOOP
        # --------------------------------------------------

        while remaining_driving > 0:

            # ----------------------------------------------
            # 70-HOUR CYCLE
            # ----------------------------------------------

            remaining_cycle = (
                MAX_CYCLE_HOURS
                - cycle_used
            )

            if remaining_cycle <= 0:
                raise ValueError(
                    "The trip cannot continue because the "
                    "70-hour / 8-day on-duty cycle has been reached."
                )

            # ----------------------------------------------
            # 11-HOUR DRIVING LIMIT
            # ----------------------------------------------

            if (
                driving_since_reset
                >= MAX_DRIVING_HOURS
            ):
                add_rest(
                    DAILY_RESET_HOURS,
                    "10-hour off-duty reset after reaching "
                    "the 11-hour driving limit.",
                )
                continue

            # ----------------------------------------------
            # 14-HOUR DUTY WINDOW
            # ----------------------------------------------

            if (
                duty_since_reset
                >= MAX_DUTY_WINDOW_HOURS
            ):
                add_rest(
                    DAILY_RESET_HOURS,
                    "10-hour off-duty reset after reaching "
                    "the 14-hour duty window.",
                )
                continue

            # ----------------------------------------------
            # 30-MINUTE DRIVING BREAK
            # ----------------------------------------------

            if (
                driving_since_break
                >= BREAK_AFTER_DRIVING_HOURS
            ):
                add_rest(
                    BREAK_DURATION_HOURS,
                    "30-minute required driving break.",
                )
                continue

            # ----------------------------------------------
            # AVAILABLE DRIVING TIME
            # ----------------------------------------------

            available_drive = min(
                remaining_driving,
                MAX_DRIVING_HOURS
                - driving_since_reset,
                BREAK_AFTER_DRIVING_HOURS
                - driving_since_break,
                MAX_DUTY_WINDOW_HOURS
                - duty_since_reset,
                remaining_cycle,
            )

            if available_drive <= 0:
                continue

            drive(available_drive)

            # Estimate distance covered during this
            # driving segment.
            distance_segment = (
                available_drive
                * average_speed
            )

            distance_driven += distance_segment
            remaining_driving -= available_drive

            # ----------------------------------------------
            # FUEL STOP
            # ----------------------------------------------
            #
            # The assessment requires fueling at least
            # once every 1,000 miles.
            #
            # We check this after every driving segment,
            # including when a segment ends exactly at a
            # fuel threshold.

            while (
                distance_driven
                >= next_fuel_mile
            ):

                # Fueling is on-duty/not-driving and
                # therefore counts toward the 14-hour
                # duty window.
                if (
                    duty_since_reset
                    + FUEL_STOP_DURATION_HOURS
                    > MAX_DUTY_WINDOW_HOURS
                ):
                    add_rest(
                        DAILY_RESET_HOURS,
                        "10-hour off-duty reset before "
                        "fuel stop due to the 14-hour duty window.",
                    )
                    continue

                # Fueling also counts toward the
                # 70-hour cycle.
                if (
                    cycle_used
                    + FUEL_STOP_DURATION_HOURS
                    > MAX_CYCLE_HOURS
                ):
                    raise ValueError(
                        "The trip would exceed the "
                        "70-hour / 8-day on-duty cycle "
                        "during a required fuel stop."
                    )

                add_event(
                    "fuel",
                    FUEL_STOP_DURATION_HOURS,
                    "Fuel stop.",
                    "Fuel stop",
                )

                next_fuel_mile += (
                    FUEL_INTERVAL_MILES
                )

        # --------------------------------------------------
        # PICKUP
        # --------------------------------------------------

        if index == 0:

            # Pickup is on-duty and must fit inside
            # the current 14-hour window.
            if (
                duty_since_reset
                + PICKUP_DURATION_HOURS
                > MAX_DUTY_WINDOW_HOURS
            ):
                add_rest(
                    DAILY_RESET_HOURS,
                    "10-hour off-duty reset before pickup "
                    "due to the 14-hour duty window.",
                )

            add_event(
                "pickup",
                PICKUP_DURATION_HOURS,
                "Pickup — 1 hour.",
                "Pickup location",
            )

        # --------------------------------------------------
        # DROP-OFF
        # --------------------------------------------------

        elif index == len(route_legs) - 1:

            if (
                duty_since_reset
                + DROPOFF_DURATION_HOURS
                > MAX_DUTY_WINDOW_HOURS
            ):
                add_rest(
                    DAILY_RESET_HOURS,
                    "10-hour off-duty reset before drop-off "
                    "due to the 14-hour duty window.",
                )

            add_event(
                "dropoff",
                DROPOFF_DURATION_HOURS,
                "Drop-off — 1 hour.",
                "Drop-off location",
            )

    # ------------------------------------------------------
    # FINAL RESULT
    # ------------------------------------------------------

    return {
        "events": events,

        "totalTripHours": round(
            elapsed_hours,
            2,
        ),

        "cycleHoursUsed": round(
            cycle_used,
            2,
        ),

        "distanceMiles": round(
            sum(
                leg["distance_miles"]
                for leg in route_legs
            ),
            1,
        ),

        "drivingHours": round(
            sum(
                leg["duration_hours"]
                for leg in route_legs
            ),
            2,
        ),
    }