import AlliedMedicalOfficers from "./Specialists/AlliedMedicalOfficers";
import { Component, useEffect, useState } from "react";
import AuthenticationApp from "./authentication/AuthenticationApp";
import "./authentication/authentication.css";
import { getCurrentAdmin } from "./authentication/authApi";
import Dashboard from "./Dashboard/dashboard/Dashboard";
import RoleAccess from "./RoleAccess/RoleAccess";
import Patients from "./Patients/Patients";
import Specialists from "./Specialists/Specialists";
import Facilities from "./Facilities/Facilities";
import { Activities, Referrals } from "./Operations/Operations";
import SystemControl from "./SystemControl/SystemControl";
import Communication from "./Communication/Communication";
import Profile from "./Profile/Profile";
import Reports from "./Reports/Reports";
import DeletionRequests from "./DeletionRequests/DeletionRequests";
import { canAccessScreen } from "./accessControl";

class ScreenErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, details) {
    console.error("Axonlink admin screen failed to render", error, details);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f6f6", fontFamily: "Arial, sans-serif" }}>
        <section style={{ maxWidth: 560, padding: 28, borderRadius: 12, background: "white", boxShadow: "0 8px 30px rgba(0,0,0,.08)" }}>
          <h1 style={{ marginTop: 0, fontSize: 22 }}>Admin screen could not load</h1>
          <p style={{ color: "#666" }}>{this.state.error.message || "An unexpected screen error occurred."}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: "11px 20px", border: 0, borderRadius: 22, background: "#574aa7", color: "white", cursor: "pointer" }}>Try again</button>
        </section>
      </main>
    );
  }
}

function App() {
  const [screen, setScreen] = useState(() => new URLSearchParams(window.location.search).get("screen"));
  const protectedScreen = screen === "allied-medical-officers" || screen === "dashboard" || screen === "role-access" || screen === "patients" || screen === "specialists" || screen === "facilities" || screen === "activities" || screen === "referrals" || screen === "system-control" || screen === "communication" || screen === "profile" || screen === "reports" || screen === "deletion-requests";
  const [dashboardAccess, setDashboardAccess] = useState(
    protectedScreen ? "checking" : "not-needed",
  );
  const [currentAdmin, setCurrentAdmin] = useState(null);

  function navigate(nextScreen) {
    if (currentAdmin && !canAccessScreen(currentAdmin.role, nextScreen)) {
      window.history.pushState({}, "", "?screen=dashboard");
      setScreen("dashboard");
      return;
    }
    window.history.pushState({}, "", `?screen=${nextScreen}`);
    setScreen(nextScreen);
  }

  function handleAuthenticated(admin) {
    setCurrentAdmin(admin);
    setDashboardAccess("allowed");
    window.history.replaceState({}, "", "?screen=dashboard");
    setScreen("dashboard");
  }

  useEffect(() => {
    if (!protectedScreen) return;

    let active = true;
    getCurrentAdmin()
      .then((admin) => {
        if (active) { setCurrentAdmin(admin); setDashboardAccess("allowed"); }
      })
      .catch(() => {
        if (!active) return;
        window.history.replaceState({}, "", window.location.pathname);
        setDashboardAccess("denied");
      });

    return () => {
      active = false;
    };
  }, [screen, protectedScreen]);

  if (protectedScreen && dashboardAccess === "checking") {
    return <div className="session-loading">Checking your admin session…</div>;
  }

  if (protectedScreen && dashboardAccess === "allowed" && currentAdmin && !canAccessScreen(currentAdmin.role, screen)) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f6f6", fontFamily: "Arial, sans-serif" }}>
        <section style={{ maxWidth: 560, padding: 28, borderRadius: 12, background: "white", boxShadow: "0 8px 30px rgba(0,0,0,.08)" }}>
          <h1 style={{ marginTop: 0, fontSize: 22 }}>Access restricted</h1>
          <p style={{ color: "#666" }}>Your {currentAdmin.role.replaceAll("_", " ").toLowerCase()} role does not have access to this area.</p>
          <button type="button" onClick={() => navigate("dashboard")} style={{ padding: "11px 20px", border: 0, borderRadius: 22, background: "#574aa7", color: "white", cursor: "pointer" }}>Return to dashboard</button>
        </section>
      </main>
    );
  }

  if (screen === "dashboard" && dashboardAccess === "allowed") {
    return <Dashboard currentAdmin={currentAdmin} onNavigate={navigate} />;
  }
  if (screen === "deletion-requests" && dashboardAccess === "allowed") return <ScreenErrorBoundary><DeletionRequests onNavigate={navigate} /></ScreenErrorBoundary>;

  if (screen === "role-access" && dashboardAccess === "allowed") {
    return <ScreenErrorBoundary><RoleAccess currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  }

  if (screen === "patients" && dashboardAccess === "allowed") {
    return <ScreenErrorBoundary><Patients currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  }

  if (screen === "allied-medical-officers" && dashboardAccess === "allowed") return <ScreenErrorBoundary><AlliedMedicalOfficers currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;

  if (screen === "specialists" && dashboardAccess === "allowed") {
    return <ScreenErrorBoundary><Specialists currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  }
  if (screen === "facilities" && dashboardAccess === "allowed") return <ScreenErrorBoundary><Facilities currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  if (screen === "activities" && dashboardAccess === "allowed") return <ScreenErrorBoundary><Activities currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  if (screen === "referrals" && dashboardAccess === "allowed") return <ScreenErrorBoundary><Referrals currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  if (screen === "system-control" && dashboardAccess === "allowed") return <ScreenErrorBoundary><SystemControl currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  if (screen === "communication" && dashboardAccess === "allowed") return <ScreenErrorBoundary><Communication currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;
  if (screen === "profile" && dashboardAccess === "allowed") return <ScreenErrorBoundary><Profile currentAdmin={currentAdmin} onNavigate={navigate} onAdminChanged={setCurrentAdmin} /></ScreenErrorBoundary>;
  if (screen === "reports" && dashboardAccess === "allowed") return <ScreenErrorBoundary><Reports currentAdmin={currentAdmin} onNavigate={navigate} /></ScreenErrorBoundary>;

  return <AuthenticationApp onAuthenticated={handleAuthenticated} />;
}

export default App;
