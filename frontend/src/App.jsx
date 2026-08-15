import { useState } from "react";
import TripMap from "./TripMap";
import ELDLogs from "./ELDLog";


function formatHours(hours) {
  if (hours === undefined || hours === null) {
    return "—";
  }

  const numericHours = Number(hours);

  if (Number.isNaN(numericHours)) {
    return "—";
  }

  const wholeHours = Math.floor(numericHours);
  const minutes = Math.round(
    (numericHours - wholeHours) * 60
  );

  if (wholeHours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${wholeHours}h`;
  }

  return `${wholeHours}h ${minutes}m`;
}


function getEventIcon(type) {
  switch (type) {
    case "driving":
      return "↗";

    case "pickup":
      return "↓";

    case "dropoff":
      return "↑";

    case "off_duty":
      return "◷";

    case "fuel":
      return "⛽";

    default:
      return "•";
  }
}


function getEventLabel(type) {
  switch (type) {
    case "driving":
      return "Driving";

    case "pickup":
      return "Pickup";

    case "dropoff":
      return "Drop-off";

    case "off_duty":
      return "Off duty";

    case "fuel":
      return "Fuel stop";

    default:
      return "Activity";
  }
}


function App() {
  const [currentLocation, setCurrentLocation] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [cycleHours, setCycleHours] = useState("");

  const [tripResult, setTripResult] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const [activeView, setActiveView] = useState("planner");


  const handleSubmit = async (event) => {
    event.preventDefault();

    setIsPlanning(true);
    setActiveView("planner");

    try {
      const response = await fetch("https://spotter-hos-planner-production.up.railway.app/api/plan-trip/", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          currentLocation,
          pickupLocation,
          dropoffLocation,
          cycleHours,
        }),
      });

      const data = await response.json();

      console.log("Backend response:", data);

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to plan trip."
        );
      }

      setTripResult(data);
      setActiveView("planner");

    } catch (error) {
      console.error(
        "Error connecting to backend:",
        error
      );

      setTripResult({
        error: error.message,
      });
    } finally {
      setIsPlanning(false);
    }
  };


  const hos = tripResult?.hos;
  const route = tripResult?.route;
  const events = hos?.events || [];


  return (
    <div className="app">

      {/* ================================
          SIDEBAR
      ================================= */}

      <aside className="sidebar">

        <div>

          <div className="brand">
            <div className="brand-mark">
              S
            </div>

            <span>SPOTTER</span>
          </div>


          <nav className="sidebar-nav">

            {/* TRIP PLANNER */}

            <button
              className={`nav-item ${
                activeView === "planner"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveView("planner")
              }
            >
              <span>▦</span>
              Trip Planner
            </button>


            {/* ROUTES */}

            <button
              className={`nav-item ${
                activeView === "routes"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveView("routes")
              }
            >
              <span>◈</span>
              Routes
            </button>


            {/* ELD LOGS */}

            <button
                className={`nav-item ${
                    activeView === "eld"
                         ? "active"
                         : ""
                }`}
                onClick={() =>
                    setActiveView("eld")
                }
            >
                <span>▤</span>
                ELD Logs
            </button>

          </nav>

        </div>


        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <button
            className={`nav-item ${
              activeView === "settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveView("settings")
            }
          >
            <span>⚙</span>
            Settings
          </button>


          <div className="driver-card">

            <div className="avatar">
              YS
            </div>

            <div>

              <strong>
                Driver
              </strong>

              <small>
                <span className="online-dot"></span>
                Online
              </small>

            </div>

          </div>

        </div>

      </aside>


      {/* ================================
          MAIN CONTENT
      ================================= */}

      <main className="main-content">

        {/* TOP BAR */}

        <header className="topbar">

          <div>

            <p className="eyebrow">
              OPERATIONS
            </p>

            <h1>
              {activeView === "eld"
                ? "ELD Logs"
                : activeView === "routes"
                ? "Routes"
                : activeView === "settings"
                ? "Settings"
                : "Trip Planner"}
            </h1>

          </div>


          <div className="status-pill">

            <span></span>

            System operational

          </div>

        </header>


        {/* ==================================================
            TRIP PLANNER
        ================================================== */}

        {activeView === "planner" && (

          <>

            {/* WELCOME */}

            <section className="welcome-section">

              <div>

                <p className="eyebrow">
                  DISPATCH CENTER
                </p>

                <h2>
                  {tripResult?.hos
                    ? "Your trip is ready."
                    : "Plan your next trip"}
                </h2>

                <p>
                  Build a route, optimize your
                  driving schedule, and generate
                  compliant HOS logs.
                </p>

              </div>


              {tripResult?.hos && (

                <div className="planned-badge">

                  <span>✓</span>

                  Trip planned

                </div>

              )}

            </section>


            {/* PLANNER CARD */}

            <section className="planner-card">

              <div className="card-header">

                <div>

                  <p className="eyebrow">
                    TRIP SETUP
                  </p>

                  <h3>
                    Trip details
                  </h3>

                  <p>
                    Enter your current position
                    and delivery information.
                  </p>

                </div>


                <div className="step-indicator">

                  <span className="step-active">
                    1
                  </span>

                  <span className="step-line"></span>

                  <span
                    className={
                      tripResult
                        ? "step-active"
                        : ""
                    }
                  >
                    2
                  </span>

                  <span className="step-line"></span>

                  <span>
                    3
                  </span>

                </div>

              </div>


              <form
                className="trip-form"
                onSubmit={handleSubmit}
              >

                <div className="location-grid">

                  {/* CURRENT LOCATION */}

                  <div className="input-group">

                    <label>
                      Current location
                    </label>

                    <div className="input-wrapper">

                      <span className="input-icon">
                        ●
                      </span>

                      <input
                        type="text"
                        placeholder="e.g. Dallas, TX"
                        value={currentLocation}
                        onChange={(event) =>
                          setCurrentLocation(
                            event.target.value
                          )
                        }
                        required
                      />

                    </div>

                  </div>


                  {/* PICKUP */}

                  <div className="input-group">

                    <label>
                      Pickup location
                    </label>

                    <div className="input-wrapper">

                      <span className="input-icon">
                        ◆
                      </span>

                      <input
                        type="text"
                        placeholder="e.g. Houston, TX"
                        value={pickupLocation}
                        onChange={(event) =>
                          setPickupLocation(
                            event.target.value
                          )
                        }
                        required
                      />

                    </div>

                  </div>


                  {/* DROP-OFF */}

                  <div className="input-group">

                    <label>
                      Drop-off location
                    </label>

                    <div className="input-wrapper">

                      <span className="input-icon">
                        ◆
                      </span>

                      <input
                        type="text"
                        placeholder="e.g. Atlanta, GA"
                        value={dropoffLocation}
                        onChange={(event) =>
                          setDropoffLocation(
                            event.target.value
                          )
                        }
                        required
                      />

                    </div>

                  </div>


                  {/* CYCLE HOURS */}

                  <div className="input-group">

                    <label>
                      Current cycle hours used
                    </label>

                    <div className="input-wrapper">

                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="70"
                        value={cycleHours}
                        onChange={(event) =>
                          setCycleHours(
                            event.target.value
                          )
                        }
                      />

                      <span className="input-suffix">
                        hrs
                      </span>

                    </div>

                  </div>

                </div>


                {/* FORM FOOTER */}

                <div className="form-footer">

                  <div className="info-message">

                    <span>ⓘ</span>

                    Your trip will be planned
                    using the 70-hour / 8-day
                    cycle.

                  </div>


                  <button
                    className="plan-button"
                    type="submit"
                    disabled={isPlanning}
                  >

                    {isPlanning
                      ? "Planning..."
                      : "Plan trip"}

                    <span>
                      {isPlanning
                        ? "◌"
                        : "→"}
                    </span>

                  </button>

                </div>

              </form>

            </section>


            {/* ERROR */}

            {tripResult?.error && (

              <section className="error-card">

                <span>!</span>

                <div>

                  <strong>
                    Trip planning failed
                  </strong>

                  <p>
                    {tripResult.error}
                  </p>

                </div>

              </section>

            )}


            {/* RESULTS */}

            {tripResult?.route?.geometry && (

              <>

                {/* SUMMARY */}

                <section className="results-section">

                  <div className="section-heading">

                    <div>

                      <p className="eyebrow">
                        TRIP SUMMARY
                      </p>

                      <h2>
                        Route performance
                      </h2>

                    </div>


                    <div className="route-status">

                      <span></span>

                      Route calculated

                    </div>

                  </div>


                  <div className="metric-grid">

                    <div className="metric-card">

                      <div className="metric-icon">
                        ↗
                      </div>

                      <div>

                        <small>
                          Distance
                        </small>

                        <strong>

                          {Number(
                            route.distanceMiles
                          ).toFixed(1)}

                          <span>
                            {" "}mi
                          </span>

                        </strong>

                      </div>

                    </div>


                    <div className="metric-card">

                      <div className="metric-icon">
                        ◷
                      </div>

                      <div>

                        <small>
                          Driving time
                        </small>

                        <strong>
                          {formatHours(
                            route.durationHours
                          )}
                        </strong>

                      </div>

                    </div>


                    <div className="metric-card">

                      <div className="metric-icon">
                        ◫
                      </div>

                      <div>

                        <small>
                          Total trip
                        </small>

                        <strong>
                          {formatHours(
                            hos?.totalTripHours
                          )}
                        </strong>

                      </div>

                    </div>


                    <div className="metric-card">

                      <div className="metric-icon">
                        ◌
                      </div>

                      <div>

                        <small>
                          Cycle used
                        </small>

                        <strong>

                          {Number(
                            hos?.cycleHoursUsed || 0
                          ).toFixed(1)}

                          <span>
                            {" "}hrs
                          </span>

                        </strong>

                      </div>

                    </div>

                  </div>

                </section>


                {/* MAP */}

                <section className="route-section">

                  <div className="route-section-header">

                    <div>

                      <p className="eyebrow">
                        ROUTE OVERVIEW
                      </p>

                      <h2>
                        Your planned route
                      </h2>

                      <p>
                        Live road routing with
                        pickup and drop-off
                        markers.
                      </p>

                    </div>

                  </div>


                  <TripMap
                    geometry={
                      tripResult.route.geometry
                    }
                    locations={
                      tripResult.trip.locations
                    }
                  />

                </section>


                {/* HOS */}

                {hos && events.length > 0 && (

                  <section className="hos-section">

                    <div className="section-heading">

                      <div>

                        <p className="eyebrow">
                          HOURS OF SERVICE
                        </p>

                        <h2>
                          Driving schedule
                        </h2>

                        <p>
                          Generated from the
                          planned route and
                          current cycle hours.
                        </p>

                      </div>


                      <div className="hos-compliance">

                        <span>✓</span>

                        Schedule generated

                      </div>

                    </div>


                    <div className="hos-layout">

                      {/* HOS SUMMARY */}

                      <div className="hos-summary-card">

                        <div className="hos-summary-top">

                          <div>

                            <small>
                              Cycle hours used
                            </small>

                            <strong>

                              {Number(
                                hos.cycleHoursUsed || 0
                              ).toFixed(1)}

                            </strong>

                            <span>
                              of 70 hrs
                            </span>

                          </div>


                          <div className="cycle-circle">

                            <span>

                              {Math.min(
                                100,
                                Math.round(
                                  (Number(
                                    hos.cycleHoursUsed ||
                                      0
                                  ) / 70) *
                                    100
                                )
                              )}

                              %

                            </span>

                          </div>

                        </div>


                        <div className="cycle-bar">

                          <span
                            style={{
                              width: `${Math.min(
                                100,
                                (Number(
                                  hos.cycleHoursUsed ||
                                    0
                                ) / 70) *
                                  100
                              )}%`,
                            }}
                          ></span>

                        </div>


                        <div className="hos-mini-stats">

                          <div>

                            <small>
                              Driving
                            </small>

                            <strong>
                              {formatHours(
                                hos.drivingHours
                              )}
                            </strong>

                          </div>


                          <div>

                            <small>
                              Total trip
                            </small>

                            <strong>
                              {formatHours(
                                hos.totalTripHours
                              )}
                            </strong>

                          </div>

                        </div>

                      </div>


                      {/* TIMELINE */}

                      <div className="timeline-card">

                        <div className="timeline-header">

                          <div>

                            <h3>
                              HOS activity
                            </h3>

                            <p>
                              {events.length} scheduled
                              activities
                            </p>

                          </div>

                        </div>


                        <div className="timeline">

                          {events.map(
                            (event, index) => (

                              <div
                                className="timeline-item"
                                key={index}
                              >

                                <div className="timeline-marker">

                                  {getEventIcon(
                                    event.type
                                  )}

                                </div>


                                <div className="timeline-content">

                                  <div className="timeline-main">

                                    <div>

                                      <strong>
                                        {getEventLabel(
                                          event.type
                                        )}
                                      </strong>

                                      <p>
                                        {
                                          event.description
                                        }
                                      </p>

                                    </div>


                                    <div className="timeline-duration">

                                      {formatHours(
                                        event.durationHours
                                      )}

                                    </div>

                                  </div>


                                  <div className="timeline-meta">

                                    <span>

                                      Start:{" "}

                                      {formatHours(
                                        event.startHour
                                      )}

                                    </span>


                                    {event.location && (

                                      <span>
                                        📍{" "}
                                        {
                                          event.location
                                        }
                                      </span>

                                    )}

                                  </div>

                                </div>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    </div>

                  </section>

                )}

              </>

            )}


            {/* QUICK STATS */}

            <section className="quick-stats">

              <div className="stat-card">

                <span className="stat-icon">
                  ↗
                </span>

                <div>

                  <small>
                    Route planning
                  </small>

                  <strong>
                    {tripResult?.route
                      ? "Optimized"
                      : "Ready"}
                  </strong>

                </div>

              </div>


              <div className="stat-card">

                <span className="stat-icon">
                  ◷
                </span>

                <div>

                  <small>
                    HOS monitoring
                  </small>

                  <strong>
                    {tripResult?.hos
                      ? "Calculated"
                      : "Enabled"}
                  </strong>

                </div>

              </div>


              <div className="stat-card">

                <span className="stat-icon">
                  ▤
                </span>

                <div>

                  <small>
                    ELD generation
                  </small>

                  <strong>
                    {tripResult?.eld
                      ? "Generated"
                      : "Ready"}
                  </strong>

                </div>

              </div>

            </section>

          </>

        )}


        {/* ==================================================
            ELD LOGS
        ================================================== */}

        {activeView === "eld" && (

          <ELDLogs
            eld={tripResult?.eld}
            trip={tripResult?.trip}
            hos={tripResult?.hos}
          />

        )}


        {/* ==================================================
            ROUTES
        ================================================== */}

        {activeView === "routes" && (

          <section className="empty-state">

            <div className="empty-state-icon">
              ◈
            </div>

            <p className="eyebrow">
              ROUTES
            </p>

            <h2>
              Route history
            </h2>

            <p>
              Completed and saved routes will
              appear here.
            </p>

            <button
              className="plan-button"
              onClick={() =>
                setActiveView("planner")
              }
            >
              Open Trip Planner

              <span>
                →
              </span>

            </button>

          </section>

        )}


        {/* ==================================================
            SETTINGS
        ================================================== */}

        {activeView === "settings" && (

          <section className="empty-state">

            <div className="empty-state-icon">
              ⚙
            </div>

            <p className="eyebrow">
              SYSTEM
            </p>

            <h2>
              Settings
            </h2>

            <p>
              Driver and application settings
              will be available here.
            </p>

          </section>

        )}

      </main>

    </div>
  );
}


export default App;