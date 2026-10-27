import { classificationDisplayLabel } from "../utils/classificationDisplay";
import { useEffect as useReactEffect, useState } from "react";
import {
  getAppFacilities,
  getAppFacility,
  reviewAppFacility,
  reviewAppFacilityDocument,
} from "../authentication/authApi";
import "./facilities.css";
import "./facilityReview.css";

// Some facility loaders predate explicit effect callbacks and return their
// request Promise. React effects may only return cleanup functions.
const useEffect = (effect, dependencies) =>
  useReactEffect(() => {
    const cleanup = effect();
    return typeof cleanup === "function" ? cleanup : undefined;
  }, dependencies);

const title = (v) =>
  String(v || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const dateText = (v) =>
  v
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(v))
    : "—";
const initials = (v) =>
  `${v?.firstName?.[0] || ""}${v?.lastName?.[0] || ""}`.toUpperCase() || "F";

function Shell({ currentAdmin, onNavigate, children, heading = "Facilities" }) {
  return (
    <div className="fa-shell">
      <aside>
        <div className="fa-logo">
          axonl<span>i</span>nk
        </div>
        <small>MAIN</small>
        <button onClick={() => onNavigate("dashboard")}>▦ Dashboard</button>
        <button className="active">♧ Users</button>
        <div>
          <button onClick={() => onNavigate("patients")}>Patients</button>
          <button onClick={() => onNavigate("specialists")}>Specialist</button>
          <b>Facilities</b>
        </div>
        <button>♧ Referrals</button>
        <button>⬡ Activities</button>
        <button>▥ Reports</button>
        <small>SETTINGS</small>
        <button onClick={() => onNavigate("role-access")}>
          ♙ Role &amp; Access
        </button>
        <button>▣ System Control</button>
        <div className="fa-admin">
          <i>{initials(currentAdmin)}</i>
          <span>
            <b>
              {currentAdmin?.firstName} {currentAdmin?.lastName}
            </b>
            <small>{title(currentAdmin?.role)}</small>
          </span>
        </div>
      </aside>
      <main>
        <header>
          <h1>{heading}</h1>
          <label>
            ⌕ <input placeholder="Looking for something..." />
          </label>
          <b>
            {currentAdmin?.firstName} {currentAdmin?.lastName}
          </b>
        </header>
        {children}
      </main>
    </div>
  );
}
function Empty({ children }) {
  return <div className="fa-empty">{children}</div>;
}

function List({ currentAdmin, onNavigate, onSelect }) {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(
      () =>
        getAppFacilities({ search })
          .then(setData)
          .catch((e) => setError(e.message)),
      180,
    );
    return () => clearTimeout(timer);
  }, [search]);
  const o = data?.overview || {};
  return (
    <Shell currentAdmin={currentAdmin} onNavigate={onNavigate}>
      <div className="fa-content">
        <section>
          <div className="fa-title">
            <h2>Overview</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search facilities"
            />
          </div>
          <div className="fa-metrics">
            {[
              ["Total Facilities", o.total],
              ["Active Facilities", o.active],
              ["Inactive Facilities", o.inactive],
              ["Suspended / Restricted", o.suspended],
              ["Pending Facilities Verification", o.pendingVerification],
            ].map(([a, b]) => (
              <span key={a}>
                {a}
                <b>{b ?? "—"}</b>
              </span>
            ))}
          </div>
        </section>
        {error && <p className="fa-error">{error}</p>}
        <section>
          <h2>Facilities</h2>
          {data?.facilities?.length ? (
            <div className="fa-table facilities">
              <b>Facility</b>
              <b>Type</b>
              <b>Specialists</b>
              <b>Appointments</b>
              <b>Referrals</b>
              <b>Status</b>
              <b />
              {data.facilities.map((f) => (
                <div className="fa-row" key={f.id}>
                  <span>
                    <i>{f.name[0]}</i>
                    <strong>{f.name}</strong>
                    <small>
                      {[f.city, f.state].filter(Boolean).join(", ")}
                    </small>
                  </span>
                  <span>{f.type}</span>
                  <span>{f.specialists}</span>
                  <span>{f.appointments}</span>
                  <span>{f.referrals}</span>
                  <em className={f.status}>{title(f.status)}</em>
                  <button onClick={() => onSelect(f.id)}>View Profile</button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>
              {data ? "No facilities found" : "Loading facilities…"}
            </Empty>
          )}
        </section>
      </div>
    </Shell>
  );
}

function DocumentPanel({ facilityId, document, onBack, onReload }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function review(action) {
    const note = window.prompt(
      action === "REJECTED" ? "Reason for rejection:" : "Verification note:",
    );
    if (!note) return;
    setBusy(true);
    try {
      await reviewAppFacilityDocument(facilityId, document.id, {
        action,
        note,
      });
      await onReload();
      onBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="fa-doc-head">
        <button onClick={onBack}>←</button>
        <h2>{document.label}</h2>
        <em>{title(document.status)}</em>
      </div>
      <div className="fa-doc">
        <div>
          {document.url ? (
            <a href={document.url} target="_blank" rel="noreferrer">
              View Submitted Document
            </a>
          ) : (
            "Preview unavailable"
          )}
          <small>
            Submitted by {document.submittedBy} on{" "}
            {dateText(document.submittedAt)}
          </small>
        </div>
        <div>
          <h3>Submitted affiliation document</h3>
          <p>
            Open the uploaded file and record the outcome with a review note.
          </p>
          <button disabled={busy} onClick={() => review("VERIFIED")}>
            Approve
          </button>
          <button
            className="reject"
            disabled={busy}
            onClick={() => review("REJECTED")}
          >
            Reject
          </button>
          {error && <p className="fa-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}

function Profile({ currentAdmin, onNavigate, id, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffTab, setStaffTab] = useState("SPECIALIST");
  const [doc, setDoc] = useState(null);
  const load = () =>
    getAppFacility(id)
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(load, [id]);
  const decide = async (action) => {
    const note = window.prompt(`${title(action)} note:`);
    if (note === null) return;
    setBusy(true);
    setError("");
    try {
      await reviewAppFacility(id, { action, note });
      await load();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return (
      <Shell
        currentAdmin={currentAdmin}
        onNavigate={onNavigate}
        heading="Facility Profile"
      >
        <div className="fa-content">
          <Empty>{error || "Loading facility…"}</Empty>
        </div>
      </Shell>
    );
  const { facility, summary, staff, documents, appointments } = data;
  const classFor = (s) =>
    /general/i.test(s.role || s.clinician.specialty || "")
      ? "GENERALIST"
      : /special/i.test(s.role || "") || s.clinician.specialty
        ? "SPECIALIST"
        : "OTHER";
  const filtered = staff.filter((s) => classFor(s) === staffTab);
  return (
    <Shell
      currentAdmin={currentAdmin}
      onNavigate={onNavigate}
      heading="Facility Profile"
    >
      <div className="fa-content">
        <button className="fa-back" onClick={onBack}>
          ← Back to Facilities
        </button>
        {error && <p className="fa-error">{error}</p>}
        <section className="fa-profile">
          <i>{facility.name[0]}</i>
          <div>
            <h2>{facility.name}</h2>
            <p>
              Added: {dateText(facility.createdAt)}　Facility ID:{" "}
              {facility.displayId}　Type: {facility.type}
            </p>
            <span>
              Status:{" "}
              <b className={facility.status}>{title(facility.status)}</b>
            </span>
            <span>
              Location:{" "}
              {[facility.address, facility.city, facility.state]
                .filter(Boolean)
                .join(", ") || "Not recorded"}
            </span>
            <span>Source: {facility.source}</span>
            {facility.source === "TENANT" && (
              <div className="fa-review">
                <button
                  disabled={busy || facility.status === "ACTIVE"}
                  onClick={() => decide("APPROVE")}
                >
                  Approve Facility
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    decide(
                      facility.status === "SUSPENDED" ? "APPROVE" : "SUSPEND",
                    )
                  }
                >
                  {facility.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                </button>
                <button
                  className="reject"
                  disabled={busy}
                  onClick={() => decide("REJECT")}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </section>
        <section>
          <h2>Performance Summary</h2>
          <div className="fa-metrics">
            {Object.entries(summary).map(([a, b]) => (
              <span key={a}>
                {title(a)}
                <b>{b}</b>
              </span>
            ))}
          </div>
        </section>
        {doc ? (
          <DocumentPanel
            facilityId={id}
            document={doc}
            onBack={() => setDoc(null)}
            onReload={load}
          />
        ) : (
          <section>
            <h2>Staff Information</h2>
            <div className="fa-metrics">
              {[
                ["Total Staff", staff.length],
                [
                  "Specialists",
                  staff.filter((s) => classFor(s) === "SPECIALIST").length,
                ],
                [
                  "Medical Officers",
                  staff.filter((s) => classFor(s) === "GENERALIST").length,
                ],
                [
                  "Other Staff",
                  staff.filter((s) => classFor(s) === "OTHER").length,
                ],
              ].map(([a, b]) => (
                <span key={a}>
                  {a}
                  <b>{b}</b>
                </span>
              ))}
            </div>
            <nav className="fa-tabs">
              {["SPECIALIST", "GENERALIST", "OTHER", "VERIFICATION"].map(
                (t) => (
                  <button
                    className={staffTab === t ? "active" : ""}
                    onClick={() => setStaffTab(t)}
                    key={t}
                  >
                    {classificationDisplayLabel(t) === t ? title(t) : classificationDisplayLabel(t)}
                  </button>
                ),
              )}
            </nav>
            {staffTab === "VERIFICATION" ? (
              <div className="fa-folders">
                {documents.length ? (
                  documents.map((d) => (
                    <button
                      className={
                        d.status === "VERIFIED" ? "verified" : "pending"
                      }
                      onClick={() => setDoc(d)}
                      key={d.id}
                    >
                      <b>{d.label}</b>
                      <small>{title(d.status)}</small>
                    </button>
                  ))
                ) : (
                  <Empty>
                    No facility-affiliation documents have been uploaded.
                  </Empty>
                )}
              </div>
            ) : filtered.length ? (
              <div className="fa-table staff">
                <b>Date Joined</b>
                <b>Name</b>
                <b>Role / Specialty</b>
                <b>Status</b>
                {filtered.map((s) => (
                  <div className="fa-row" key={s.id}>
                    <span>{dateText(s.joinedAt)}</span>
                    <span>
                      Dr. {s.clinician.firstName} {s.clinician.lastName}
                    </span>
                    <span>
                      {classificationDisplayLabel(s.role || s.clinician.specialty || "Clinician")}
                    </span>
                    <em className={s.status}>{title(s.status)}</em>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No staff in this category.</Empty>
            )}
          </section>
        )}
        <section>
          <h2>Appointments</h2>
          {appointments.length ? (
            <div className="fa-table appointments">
              <b>Date</b>
              <b>Patient</b>
              <b>Assigned Clinician</b>
              <b>Appointment ID</b>
              <b>Status</b>
              {appointments.map((a) => (
                <div className="fa-row" key={a.id}>
                  <span>{dateText(a.date)}</span>
                  <span>
                    {a.patient.firstName} {a.patient.lastName}
                  </span>
                  <span>
                    Dr. {a.clinician.firstName} {a.clinician.lastName}
                  </span>
                  <span>#{a.displayId}</span>
                  <em className={a.status}>{title(a.status)}</em>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No facility appointments found.</Empty>
          )}
        </section>
      </div>
    </Shell>
  );
}

export default function Facilities({ currentAdmin, onNavigate }) {
  const params = new URLSearchParams(window.location.search);
  const [id, setId] = useState(params.get("facilityId") || "");
  const select = (next) => {
    window.history.pushState(
      {},
      "",
      `?screen=facilities&facilityId=${encodeURIComponent(next)}`,
    );
    setId(next);
  };
  const back = () => {
    window.history.pushState({}, "", "?screen=facilities");
    setId("");
  };
  return id ? (
    <Profile
      currentAdmin={currentAdmin}
      onNavigate={onNavigate}
      id={id}
      onBack={back}
    />
  ) : (
    <List
      currentAdmin={currentAdmin}
      onNavigate={onNavigate}
      onSelect={select}
    />
  );
}
