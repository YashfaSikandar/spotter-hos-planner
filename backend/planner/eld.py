STATUS_OFF_DUTY = "off_duty"
STATUS_SLEEPER = "sleeper_berth"
STATUS_DRIVING = "driving"
STATUS_ON_DUTY = "on_duty"


STATUS_LABELS = {
    STATUS_OFF_DUTY: "Off Duty",
    STATUS_SLEEPER: "Sleeper Berth",
    STATUS_DRIVING: "Driving",
    STATUS_ON_DUTY: "On Duty",
}


def event_to_status(event_type):
    """
    Convert HOS event types into one of the four
    ELD duty statuses.
    """

    if event_type == "driving":
        return STATUS_DRIVING

    if event_type == "off_duty":
        return STATUS_OFF_DUTY

    if event_type == "sleeper_berth":
        return STATUS_SLEEPER

    # Pickup, drop-off, fuel and other work activities
    # are considered on-duty, not driving.
    return STATUS_ON_DUTY


def format_hours(hours):
    """
    Convert decimal hours into HH:MM.
    """

    total_minutes = round(
        float(hours) * 60
    )

    hours_part = total_minutes // 60
    minutes_part = total_minutes % 60

    return (
        f"{hours_part:02d}:"
        f"{minutes_part:02d}"
    )


def split_event_across_days(event):
    """
    Split an HOS event if it crosses midnight.

    Example:
        start = 23.5
        duration = 2

    becomes:

        Day 1 -> 23:30 to 24:00
        Day 2 -> 00:00 to 01:30
    """

    start = float(
        event["startHour"]
    )

    duration = float(
        event["durationHours"]
    )

    if duration <= 0:
        return []

    end = start + duration

    segments = []

    current_start = start

    while current_start < end:

        day_number = (
            int(current_start // 24) + 1
        )

        day_end_absolute = min(
            end,
            day_number * 24,
        )

        duration_for_day = (
            day_end_absolute
            - current_start
        )

        start_hour = (
            current_start % 24
        )

        end_hour = (
            day_end_absolute % 24
        )

        # Midnight should be represented as 24:00
        # for the end of the previous day rather than 00:00.
        if (
            end_hour == 0
            and day_end_absolute > current_start
        ):
            end_hour = 24

        segments.append(
            {
                "day": day_number,
                "startHour": round(
                    start_hour,
                    2,
                ),
                "endHour": round(
                    end_hour,
                    2,
                ),
                "durationHours": round(
                    duration_for_day,
                    2,
                ),
            }
        )

        current_start = day_end_absolute

    return segments


def _create_day(day_number):
    """
    Create an empty daily ELD log.
    """

    return {
        "day": day_number,

        "segments": [],

        "totals": {
            STATUS_OFF_DUTY: 0.0,
            STATUS_SLEEPER: 0.0,
            STATUS_DRIVING: 0.0,
            STATUS_ON_DUTY: 0.0,
        },

        "remarks": [],
    }


def _add_segment(
    day,
    status,
    start_hour,
    end_hour,
    duration,
    location=None,
    description="",
):
    """
    Add a segment to a daily log and update totals.
    """

    duration = float(duration)

    if duration <= 0:
        return

    segment_data = {
        "status": status,
        "statusLabel": STATUS_LABELS[status],

        "startHour": round(
            start_hour,
            2,
        ),

        "endHour": round(
            end_hour,
            2,
        ),

        "durationHours": round(
            duration,
            2,
        ),

        "startTime": format_hours(
            start_hour
        ),

        "endTime": format_hours(
            end_hour
        ),

        "location": location,

        "description": description,
    }

    day["segments"].append(
        segment_data
    )

    day["totals"][status] += duration


def _sort_segments(day):
    """
    Keep segments in chronological order.
    """

    day["segments"].sort(
        key=lambda segment: segment["startHour"]
    )


def _fill_daily_gaps(day):
    """
    Fill periods where no HOS event exists.

    For the driver's log, unassigned time is treated
    as Off Duty.

    This makes the daily log a continuous 24-hour
    record instead of displaying gaps.
    """

    existing = sorted(
        day["segments"],
        key=lambda segment: segment["startHour"],
    )

    if not existing:
        _add_segment(
            day,
            STATUS_OFF_DUTY,
            0.0,
            24.0,
            24.0,
            None,
            "Off-duty period.",
        )
        return

    completed = []

    cursor = 0.0

    for segment in existing:

        start = float(
            segment["startHour"]
        )

        end = float(
            segment["endHour"]
        )

        # Normalize an end-of-day 24:00 value.
        if end == 0 and start < 24:
            end = 24

        # Fill any gap before this segment.
        if start > cursor:

            completed.append(
                {
                    "status": STATUS_OFF_DUTY,
                    "startHour": cursor,
                    "endHour": start,
                    "durationHours": start - cursor,
                    "startTime": format_hours(cursor),
                    "endTime": format_hours(start),
                    "location": None,
                    "description": "Off-duty period.",
                }
            )

        completed.append(segment)

        cursor = max(
            cursor,
            end,
        )

    # Fill the remainder of the day.
    if cursor < 24:

        completed.append(
            {
                "status": STATUS_OFF_DUTY,
                "startHour": cursor,
                "endHour": 24.0,
                "durationHours": 24.0 - cursor,
                "startTime": format_hours(cursor),
                "endTime": format_hours(24.0),
                "location": None,
                "description": "Off-duty period.",
            }
        )

    # Recalculate totals from the complete timeline.
    day["segments"] = completed

    day["totals"] = {
        STATUS_OFF_DUTY: 0.0,
        STATUS_SLEEPER: 0.0,
        STATUS_DRIVING: 0.0,
        STATUS_ON_DUTY: 0.0,
    }

    for segment in completed:

        status = segment["status"]

        day["totals"][status] += float(
            segment["durationHours"]
        )


def generate_eld_logs(
    hos_events,
    trip_date=None,
    driver_number="1224213",
    driver_initials="YS",
    driver_name="",
    vehicle_number="P48872",
    trailer_number="TA939200",
    home_terminal="",
    carrier="",
    shipper="",
    commodity="",
    load_number="",
    truck_mileage_start=0,
    truck_mileage_end=0,
    total_driving_miles=0,
):
    """
    Convert HOS events into daily ELD log data.

    The generated structure mirrors a traditional
    driver's daily log:

        1. Off Duty
        2. Sleeper Berth
        3. Driving
        4. On Duty (Not Driving)

    Events crossing midnight are split into separate
    daily segments.

    Any unassigned time in a day is filled as Off Duty
    so that each daily log represents a complete
    24-hour period.
    """

    if hos_events is None:
        hos_events = []

    days = {}

    # ------------------------------------------------------
    # CONVERT HOS EVENTS INTO ELD SEGMENTS
    # ------------------------------------------------------

    for event in hos_events:

        event_type = event.get(
            "type",
            STATUS_OFF_DUTY,
        )

        status = event_to_status(
            event_type
        )

        split_segments = (
            split_event_across_days(event)
        )

        for segment in split_segments:

            day_number = segment["day"]

            if day_number not in days:
                days[day_number] = (
                    _create_day(day_number)
                )

            location = event.get(
                "location"
            )

            description = event.get(
                "description",
                "",
            )

            _add_segment(
                day=days[day_number],
                status=status,
                start_hour=segment["startHour"],
                end_hour=segment["endHour"],
                duration=segment["durationHours"],
                location=location,
                description=description,
            )

            # Locations are useful as log remarks.
            if location:

                days[day_number][
                    "remarks"
                ].append(
                    {
                        "time": format_hours(
                            segment["startHour"]
                        ),
                        "location": location,
                        "description": description,
                    }
                )

    # ------------------------------------------------------
    # ENSURE AT LEAST ONE DAY EXISTS
    # ------------------------------------------------------

    if not days:

        days[1] = _create_day(1)

    # ------------------------------------------------------
    # COMPLETE EACH 24-HOUR LOG
    # ------------------------------------------------------

    for day in days.values():

        _sort_segments(day)

        _fill_daily_gaps(day)

        # Round totals.
        for status in day["totals"]:

            day["totals"][status] = round(
                day["totals"][status],
                2,
            )

    # ------------------------------------------------------
    # ORDER DAYS
    # ------------------------------------------------------

    ordered_days = [
        days[key]
        for key in sorted(
            days.keys()
        )
    ]

    # ------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------

    return {
        "tripDate": trip_date,

        "driver": {
            "number": driver_number,
            "initials": driver_initials,
            "name": driver_name,
        },

        "vehicle": {
            "truckNumber": vehicle_number,
            "trailerNumber": trailer_number,
        },

        "operation": {
            "homeTerminal": home_terminal,
            "carrier": carrier,
            "shipper": shipper,
            "commodity": commodity,
            "loadNumber": load_number,
        },

        "mileage": {
            "truckStart": truck_mileage_start,
            "truckEnd": truck_mileage_end,
            "drivingMiles": total_driving_miles,
        },

        "days": ordered_days,

        "totalDays": len(
            ordered_days
        ),
    }