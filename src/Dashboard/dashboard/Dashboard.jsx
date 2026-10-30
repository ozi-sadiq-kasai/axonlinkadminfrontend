import { useEffect, useMemo, useState } from "react";
import { dashboardMetricLabels, isDashboardData } from "./dashboardData";
import { getDashboard } from "../../authentication/authApi";
import "./dashboard.css";
import { visibleForRole } from "../../accessControl";

const navigation = [
  { screen: "dashboard", label: "Dashboard", icon: "▦" },
  { screen: "patients", label: "Users", icon: "♙", expandable: true },
  { screen: "referrals", label: "Referrals", icon: "⇄" },
  { screen: "activities", label: "Activities", icon: "⬡" },
  { screen: "reports", label: "Reports", icon: "▤" },
];

const settings = [
  { screen: "deletion-requests", label: "Deletion Requests", icon: "▤" },
  { screen: "role-access", label: "Role & Access", icon: "♙" },
  { screen: "system-control", label: "System Control", icon: "▣" },
  { screen: "communication", label: "Communication", icon: "♧" },
];

function SidebarItem({ item, active, onClick, expanded = false }) {
  return (
    <button className={`sidebar-item${active ? " sidebar-item--active" : ""}`} type="button" onClick={onClick}>
      <span className="sidebar-item__icon" aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
      {item.expandable && <span className="sidebar-item__chevron">{expanded ? "⌃" : "⌄"}</span>}
    </button>
  );
}

function EmptyState({ title, compact = false }) {
  return (
    <div className={`dashboard-empty${compact ? " dashboard-empty--compact" : ""}`}>
      <span className="dashboard-empty__icon" aria-hidden="true">◇</span>
      <strong>{title}</strong>
      <span>Information will appear here when it becomes available.</span>
    </div>
  );
}

function Overview({ items }) {
  const labels = dashboardMetricLabels;

  return (
    <section className="dashboard-card overview-card">
      <div className="section-heading">
        <h2>Overview</h2>
        <button type="button">Today⌄</button>
      </div>
      <div className="overview-grid">
        {labels.map((label) => {
          const item = items.find((entry) => entry.label === label);
          return (
            <article className="metric-card" key={label}>
              <span>{label}</span>
              <div>
                <strong className={item ? "" : "metric-card__empty"}>{item?.value ?? "—"}</strong>
                {item?.change && (
                  <small className={`metric-change metric-change--${item.direction}`}>
                    {item.change}% {item.direction === "up" ? "↖" : "↘"}
                  </small>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LineChart({ title, points }) {
  const polyline = useMemo(() => {
    if (!points.length) return "";
    const maximum = Math.max(1, ...points.map(point => point.value));
    return points.map((point, index) => `${(index / Math.max(1, points.length - 1)) * 100},${100 - point.value / maximum * 100}`).join(" ");
  }, [points]);

  return (
    <section className="dashboard-card chart-card">
      <div className="section-heading">
        <h2>{title}</h2>
        <button type="button">Today⌄</button>
      </div>
      {points.length ? (
        <div className="chart">
          <div className="chart__grid" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${title} data`}>
            <title>{points.map(point => `${point.label}: ${point.value}`).join(", ")}</title>
            <polyline points={polyline} fill="none" stroke="#756db0" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="chart__labels">{points.filter((_, index) => index % 6 === 0 || index === points.length - 1).map(point => <span key={point.label}>{point.label}</span>)}</div>
        </div>
      ) : (
        <EmptyState title={`No ${title.toLowerCase()} data`} compact />
      )}
    </section>
  );
}

function FeedCard({ title, items, kind }) {
  return (
    <section className="dashboard-card feed-card">
      <div className="section-heading">
        <h2>{title}</h2>
        <button type="button">View All</button>
      </div>
      {items.length ? (
        <div className="feed-list">
          {items.map((item, index) => (
            <article className={`feed-item feed-item--${item.tone ?? item.type ?? "neutral"}`} key={`${item.title}-${index}`}>
              {kind === "activity" && <span className="feed-item__avatar">{item.type?.slice(0, 1).toUpperCase()}</span>}
              <div><strong>{item.title}</strong><span>{item.time && !Number.isNaN(Date.parse(item.time)) ? new Date(item.time).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : item.time}</span></div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${title.toLowerCase()}`} compact />
      )}
    </section>
  );
}

function PerformerList({ title, items, tone }) {
  return (
    <section className={`performer-list performer-list--${tone}`}>
      <h3>♕ <span>{title}</span></h3>
      {items.length ? items.map((item, index) => (
        <article className="performer" key={item.name}>
          <span className="performer__avatar">{index + 1}</span>
          <div><strong>{item.name}</strong><span>{item.detail}</span></div>
          <small>{item.score}</small>
        </article>
      )) : <EmptyState title={`No ${title.toLowerCase()}`} compact />}
    </section>
  );
}

export default function Dashboard({ currentAdmin, onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setData(null); setError("");
    getDashboard().then(value => {
      if (!isDashboardData(value)) throw new Error("Dashboard data is unavailable.");
      if (live) setData(value);
    }).catch(failure => { if (live) setError(failure.message || "Unable to load dashboard."); });
    return () => { live = false; };
  }, [attempt, currentAdmin?.id]);
  const [usersExpanded, setUsersExpanded] = useState(false);
  const mainNavigation = visibleForRole(currentAdmin?.role, navigation);
  const settingsNavigation = visibleForRole(currentAdmin?.role, settings);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="wordmark">axonl<span>i</span>nk</div>
        <nav aria-label="Main navigation">
          <p>MAIN</p>
          {mainNavigation.map((item) => item.screen === "patients" ? (
            <div className="sidebar-users" key={item.label}>
              <SidebarItem item={item} expanded={usersExpanded} onClick={() => setUsersExpanded((value) => !value)} />
              {usersExpanded && <div className="sidebar-users__submenu">
                <button type="button" onClick={() => onNavigate?.("patients")}>Patients</button>
                <button type="button" onClick={() => onNavigate?.("specialists")}>Specialist</button><button type="button" onClick={() => onNavigate?.("guest-clinicians")}>Guest Clinicians</button>
                {currentAdmin?.role === "SUPER_ADMIN" && <button type="button" onClick={() => onNavigate?.("allied-medical-officers")}>Allied Medical Officers</button>}
                <button type="button" onClick={() => onNavigate?.("facilities")}>Facilities</button>
              </div>}
            </div>
          ) : <SidebarItem item={item} active={item.screen === "dashboard"} onClick={() => onNavigate?.(item.screen)} key={item.label} />)}
          <p className="sidebar-settings-label">SETTINGS</p>
          {settingsNavigation.map((item) => <SidebarItem item={item} onClick={() => onNavigate?.(item.screen)} key={item.label} />)}
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="dashboard-header__actions">
            <label className="dashboard-search"><span>⌕</span><input type="search" placeholder="Looking for something..." /></label>
            <button className="header-profile" type="button" onClick={() => onNavigate?.("profile")}><span aria-hidden="true" /><div><b>{currentAdmin?.firstName} {currentAdmin?.lastName}</b><small>Welcome</small></div></button>
            <button className="notification-button" type="button" aria-label="Notifications" onClick={() => onNavigate?.("profile")}>♟</button>
          </div>
        </header>

        <div className="dashboard-content">
          {error ? <section className="dashboard-card" role="alert"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)}>Retry</button></section>
            : !data ? <section className="dashboard-card" role="status">Loading dashboard…</section> : <>
          <Overview items={data.overview} />
          <div className="dashboard-grid dashboard-grid--charts">
            <LineChart title="Appointment Trend" points={data.appointmentTrend} />
            <LineChart title="Referral Trend" points={data.referralTrend} />
          </div>
          <div className="dashboard-grid">
            <FeedCard title="Attention Needed" items={data.attentionNeeded} kind="attention" />
            <FeedCard title="Recent Activities" items={data.recentActivities} kind="activity" />
          </div>
          <section className="dashboard-card performers-card">
            <div className="section-heading"><h2>Top Performers</h2><button type="button">Last 7 Days⌄</button></div>
            <div className="dashboard-grid">
              <PerformerList title="Top Performing Facilities" items={data.topFacilities} tone="purple" />
              <PerformerList title="Top Performing Specialist" items={data.topSpecialists} tone="gold" />
            </div>
          </section>
          </>}
        </div>
      </main>
    </div>
  );
}
