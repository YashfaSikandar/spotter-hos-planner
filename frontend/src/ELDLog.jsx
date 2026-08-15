import { useState } from "react";

function formatHours(hours) {
  if (hours === undefined || hours === null) {
    return "—";
  }

  const value = Number(hours);

  if (Number.isNaN(value)) {
    return "—";
  }

  const wholeHours = Math.floor(value);
  const minutes = Math.round((value - wholeHours) * 60);

  if (wholeHours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}


/* =========================================
   SEGMENT HELPERS
========================================= */

function getSegmentType(segment) {
  return (
    segment.type ||
    segment.status ||
    segment.dutyStatus ||
    "off_duty"
  ).toLowerCase();
}


function getSegmentLabel(type) {
  switch (type) {
    case "driving":
      return "Driving";

    case "off_duty":
    case "off-duty":
      return "Off Duty";

    case "on_duty":
    case "on-duty":
      return "On Duty";

    case "sleeper":
    case "sleeper_berth":
    case "sleeper-berth":
      return "Sleeper Berth";

    case "pickup":
      return "Pickup";

    case "dropoff":
      return "Drop-off";

    case "fuel":
      return "Fuel";

    default:
      return type.replaceAll("_", " ");
  }
}


function getSegmentClass(type) {
  switch (type) {
    case "driving":
      return "log-driving";

    case "off_duty":
    case "off-duty":
      return "log-off-duty";

    case "on_duty":
    case "on-duty":
      return "log-on-duty";

    case "sleeper":
    case "sleeper_berth":
    case "sleeper-berth":
      return "log-sleeper";

    case "pickup":
    case "dropoff":
    case "fuel":
      return "log-on-duty";

    default:
      return "log-off-duty";
  }
}


/* =========================================
   ROW MAPPING
========================================= */

function getRowType(type) {
  switch (type) {
    case "off_duty":
    case "off-duty":
      return "off_duty";

    case "sleeper":
    case "sleeper_berth":
    case "sleeper-berth":
      return "sleeper_berth";

    case "driving":
      return "driving";

    case "on_duty":
    case "on-duty":
    case "pickup":
    case "dropoff":
    case "fuel":
      return "on_duty";

    default:
      return "off_duty";
  }
}


/* =========================================
   TIME LABEL
========================================= */

function formatClockHour(hour) {
  const value = Number(hour);

  if (Number.isNaN(value)) {
    return "—";
  }

  const totalMinutes = Math.round(value * 60);

  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  const period = hours >= 12 ? "PM" : "AM";

  const displayHour = hours % 12 || 12;

  if (minutes === 0) {
    return `${displayHour} ${period}`;
  }

  return `${displayHour}:${String(minutes).padStart(
    2,
    "0"
  )} ${period}`;
}


/* =========================================
   TOTAL RECORDED
========================================= */

function getDayTotal(day) {
  if (!day?.totals) {
    return 0;
  }

  return Object.values(day.totals).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
}


/* =========================================
   ELD LOGS
========================================= */

function ELDLogs({ eld, trip, hos }) {
  const [activeDay, setActiveDay] = useState(1);

  if (!eld?.days?.length) {
    return (
      <section className="eld-empty">
        <div className="eld-empty-icon">▤</div>
        <p className="eyebrow">ELECTRONIC LOGS</p>
        <h2>No ELD logs yet</h2>
        <p>
          Plan a trip first and your daily driver logs will appear here.
        </p>
      </section>
    );
  }

  const cycleUsed = eld?.cycleHoursUsed ?? hos?.cycleHoursUsed ?? 0;
  const cycleRemaining = Math.max(0, 70 - Number(cycleUsed || 0));

  const activeDayData =
    eld.days.find((day) => Number(day.day) === Number(activeDay)) || eld.days[0];

  const segments = activeDayData.segments || [];

  const rows = {
    off_duty: [],
    sleeper_berth: [],
    driving: [],
    on_duty: [],
  };

  segments.forEach((segment) => {
    const type = getSegmentType(segment);
    const row = getRowType(type);

    rows[row].push({
      ...segment,
      type,
    });
  });

  const totalRecorded = getDayTotal(activeDayData);

  const renderSegments = (rowSegments, prefix) =>
    rowSegments.map((segment, index) => {
      const start = Number(
        segment.startHour ?? segment.start ?? 0
      );

      const duration = Number(
        segment.durationHours ?? segment.duration ?? 0
      );

      const safeStart = Math.max(0, Math.min(24, start));
      const safeDuration = Math.max(
        0,
        Math.min(duration, 24 - safeStart)
      );

      return (
        <div
          key={`${prefix}-${index}`}
          className={`log-segment ${getSegmentClass(segment.type)}`}
          style={{
            left: `${(safeStart / 24) * 100}%`,
            width: `${(safeDuration / 24) * 100}%`,
          }}
          title={`${getSegmentLabel(segment.type)} — ${formatHours(duration)}`}
        />
      );
    });

  return (
    <section className="eld-page">

      {/* PAGE HEADER */}
      <div className="eld-page-header">
        <div>
          <p className="eyebrow">ELECTRONIC LOGS</p>
          <h2>Driver daily logs</h2>
          <p>HOS duty records generated from your planned trip.</p>
        </div>

        <div className="eld-status">
          <span>✓</span>
          Records generated
        </div>
      </div>

      {/* DRIVER LOG INFORMATION */}
      <section className="eld-info-card">
        <div className="eld-info-item">
          <small>Date</small>
          <strong>—</strong>
        </div>

        <div className="eld-info-item">
          <small>From</small>
          <strong>{trip?.currentLocation || "—"}</strong>
        </div>

        <div className="eld-info-item">
          <small>To</small>
          <strong>{trip?.dropoffLocation || "—"}</strong>
        </div>

        <div className="eld-info-item">
          <small>Pickup</small>
          <strong>{trip?.pickupLocation || "—"}</strong>
        </div>

        <div className="eld-info-item">
          <small>Driver</small>
          <strong>YS</strong>
        </div>

        <div className="eld-info-item">
          <small>Driving miles</small>
          <strong>
            {trip?.route?.distanceMiles
              ? `${Number(trip.route.distanceMiles).toFixed(1)} mi`
              : "—"}
          </strong>
        </div>

        <div className="eld-info-item">
          <small>Total mileage</small>
          <strong>—</strong>
        </div>

        <div className="eld-info-item">
          <small>Truck / Tractor / Trailer</small>
          <strong>—</strong>
        </div>

        <div className="eld-info-item">
          <small>License / State</small>
          <strong>—</strong>
        </div>

        <div className="eld-info-item">
          <small>Carrier</small>
          <strong>Spotter HOS Planner</strong>
        </div>

        <div className="eld-info-item">
          <small>Main office address</small>
          <strong>—</strong>
        </div>

        <div className="eld-info-item">
          <small>Home terminal</small>
          <strong>—</strong>
        </div>

        <div className="eld-info-item">
          <small>Cycle used</small>
          <strong>{formatHours(cycleUsed)}</strong>
        </div>
      </section>

      {/* DAILY LOG */}
      <section className="eld-day-card" key={activeDayData.day}>
        <div className="eld-day-header">
          <div className="eld-day-title-group">
            <p className="eyebrow">DRIVER DAILY LOG</p>

            <div className="eld-day-tabs" role="tablist" aria-label="Driver log days">
              {eld.days.map((day) => {
                const isActive = Number(activeDayData.day) === Number(day.day);

                return (
                  <button
                    key={day.day}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`eld-day-tab${isActive ? " active" : ""}`}
                    onClick={() => setActiveDay(day.day)}
                  >
                    Day {day.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="day-total">
            <small>Total recorded</small>
            <strong>{formatHours(totalRecorded)}</strong>
          </div>
        </div>

        {/* LEGEND */}
        <div className="eld-legend">
          <span>
            <i className="legend-color log-off-duty"></i>
            Off Duty
          </span>
          <span>
            <i className="legend-color log-sleeper"></i>
            Sleeper Berth
          </span>
          <span>
            <i className="legend-color log-driving"></i>
            Driving
          </span>
          <span>
            <i className="legend-color log-on-duty"></i>
            On Duty
          </span>
        </div>

        {/* LOGBOOK */}
        <div className="logbook-wrapper">
          <div className="logbook">
            <div className="logbook-labels">
              <div className="logbook-label-spacer"></div>

              <div className="logbook-label off-duty-label">
                <strong>1: OFF DUTY</strong>
              </div>

              <div className="logbook-label sleeper-label">
                <strong>2: SLEEPER</strong>
              </div>

              <div className="logbook-label driving-label">
                <strong>3: DRIVING</strong>
              </div>

              <div className="logbook-label on-duty-label">
                <strong>4: ON DUTY</strong>
              </div>
            </div>

            <div className="logbook-grid">
              <div className="hour-labels">
                {Array.from({ length: 25 }, (_, hour) => {
                  const displayHour = hour % 12 || 12;
                  const period = hour < 12 ? "AM" : "PM";

                  return (
                    <span key={hour}>
                      {displayHour} {period}
                    </span>
                  );
                })}
              </div>

              <div className="logbook-lines">
                <div className="log-row">
                  {renderSegments(rows.off_duty, "off")}
                </div>

                <div className="log-row">
                  {renderSegments(rows.sleeper_berth, "sleeper")}
                </div>

                <div className="log-row">
                  {renderSegments(rows.driving, "driving")}
                </div>

                <div className="log-row">
                  {renderSegments(rows.on_duty, "onduty")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TOTAL HOURS */}
        <div className="eld-totals">
          <div>
            <span className="total-dot off-duty-dot"></span>
            <small>Off Duty</small>
            <strong>{formatHours(activeDayData.totals?.off_duty)}</strong>
          </div>

          <div>
            <span className="total-dot sleeper-dot"></span>
            <small>Sleeper Berth</small>
            <strong>{formatHours(activeDayData.totals?.sleeper_berth)}</strong>
          </div>

          <div>
            <span className="total-dot driving-dot"></span>
            <small>Driving</small>
            <strong>{formatHours(activeDayData.totals?.driving)}</strong>
          </div>

          <div>
            <span className="total-dot on-duty-dot"></span>
            <small>On Duty</small>
            <strong>{formatHours(activeDayData.totals?.on_duty)}</strong>
          </div>
        </div>

        {/* REMARKS */}
        <section className="eld-remarks">
          <div className="remarks-header">
            <div>
              <p className="eyebrow">REMARKS</p>
              <h3>Trip and duty information</h3>
            </div>
            <span>Day {activeDayData.day}</span>
          </div>

          <div className="remarks-list">
            <div className="remark-item">
              <strong>Location</strong>
              <div>
                <span>{trip?.currentLocation || "—"}</span>
                <small>Starting location</small>
              </div>
            </div>

            <div className="remark-item">
              <strong>Pickup</strong>
              <div>
                <span>{trip?.pickupLocation || "—"}</span>
                <small>Pickup location</small>
              </div>
            </div>

            <div className="remark-item">
              <strong>Drop-off</strong>
              <div>
                <span>{trip?.dropoffLocation || "—"}</span>
                <small>Final delivery location</small>
              </div>
            </div>

            <div className="remark-item">
              <strong>Shipping</strong>
              <div>
                <span>—</span>
                <small>Shipping document / manifest</small>
              </div>
            </div>

            <div className="remark-item">
              <strong>Commodity</strong>
              <div>
                <span>—</span>
                <small>Shipper and commodity</small>
              </div>
            </div>

            <div className="remark-item">
              <strong>Duty changes</strong>
              <div>
                <span>{segments.length} recorded</span>
                <small>
                  Duty-status changes generated from the HOS schedule
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* DAILY RECAP */}
        <section className="eld-recap">
          <div className="eld-recap-header">
            <div>
              <p className="eyebrow">DAILY RECAP</p>
              <h3>Hours-of-service recap</h3>
            </div>
          </div>

          <div className="recap-grid">
            <div className="recap-card">
              <small>70 Hour / 8 Day</small>
              <strong>{formatHours(cycleUsed)}</strong>
              <span>Used</span>
              <div className="recap-bar">
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      (Number(cycleUsed || 0) / 70) * 100
                    )}%`,
                  }}
                />
              </div>
              <small>{formatHours(cycleRemaining)} remaining</small>
            </div>

            <div className="recap-card">
              <small>60 Hour / 7 Day</small>
              <strong>—</strong>
              <span>Not configured</span>
              <div className="recap-bar">
                <span style={{ width: "0%" }} />
              </div>
              <small>—</small>
            </div>

            <div className="recap-card">
              <small>Previous day</small>
              <strong>—</strong>
              <span>Available hours</span>
              <div className="recap-bar">
                <span style={{ width: "0%" }} />
              </div>
              <small>—</small>
            </div>

            <div className="recap-card">
              <small>Consecutive off-duty</small>
              <strong>—</strong>
              <span>Consecutive hours</span>
              <div className="recap-bar">
                <span style={{ width: "0%" }} />
              </div>
              <small>—</small>
            </div>
          </div>
        </section>

        {/* ACTIVITY DETAILS */}
        <section className="eld-activities">
          <div className="eld-activities-header">
            <div>
              <p className="eyebrow">ACTIVITY RECORD</p>
              <h4>Activity details</h4>
              <p>Duty-status changes recorded for this day.</p>
            </div>
          </div>

          {segments.length === 0 ? (
            <div className="empty-remarks">
              No activity segments recorded.
            </div>
          ) : (
            segments.map((segment, index) => {
              const type = getSegmentType(segment);
              const start = Number(
                segment.startHour ?? segment.start ?? 0
              );
              const duration = Number(
                segment.durationHours ?? segment.duration ?? 0
              );

              return (
                <div className="eld-activity" key={index}>
                  <div
                    className={`activity-icon ${getSegmentClass(type)}`}
                  >
                    {type === "driving"
                      ? "↗"
                      : type.includes("off")
                      ? "◷"
                      : type.includes("sleeper")
                      ? "◫"
                      : "•"}
                  </div>

                  <div className="activity-main">
                    <strong>{getSegmentLabel(type)}</strong>
                    <span>Start {formatClockHour(start)}</span>
                  </div>

                  <div className="activity-location">
                    {segment.location && (
                      <span>📍 {segment.location}</span>
                    )}
                  </div>

                  <div className="activity-duration">
                    <strong>{formatHours(duration)}</strong>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </section>
    </section>
  );
}

export default ELDLogs;