import { classificationDisplayLabel } from "../utils/classificationDisplay";
import { useEffect, useState } from "react";
import { denyAppPatientRecordAccess, getAppPatient, getAppPatients, grantAppPatientRecordAccess, liftAppUserSuspension, resetAppUserAccess, revokeAppPatientRecordAccess, suspendAppUser } from "../authentication/authApi";
import "./patients.css";

const labels = { PENDING: "Pending", WAITING: "Waiting", CONFIRMED: "Up-Coming", COMPLETED: "Completed", CANCELLED: "Canceled", DECLINED: "Declined", NO_SHOW: "No-Show" };
const referralLabels = { SENT: "Pending", PENDING: "Pending", ACCEPTED: "Accepted", COMPLETED: "Completed", CANCELLED: "Canceled", REJECTED: "Declined", DECLINED: "Declined" };
const initials = (item) => `${item?.firstName?.[0] || ""}${item?.lastName?.[0] || ""}`.toUpperCase() || "P";
const dateText = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const timeText = (value) => value ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";

function Shell({ currentAdmin, onNavigate, title, children }) {
  return <div className="pm-shell"><aside><div className="wordmark">axonl<span>i</span>nk</div><p>MAIN</p>{["Dashboard", "Users", "Referrals", "Activities", "Reports"].map((item) => <button className={item === "Users" ? "active" : ""} onClick={item === "Dashboard" ? () => onNavigate("dashboard") : item === "Users" ? () => onNavigate("patients") : undefined} key={item}>◫ <span>{item}</span></button>)}<div className="pm-sub"><b>Patients</b><button type="button" onClick={() => onNavigate("specialists")}>Specialist</button><button type="button" onClick={() => onNavigate("facilities")}>Facilities</button></div><p>SETTINGS</p><button onClick={() => onNavigate("role-access")}>♙ <span>Role & Access</span></button><button>▣ <span>System Control</span></button><button>♧ <span>Notification</span></button>{currentAdmin && <div className="pm-admin"><i>{initials(currentAdmin)}</i><div><strong>{currentAdmin.firstName} {currentAdmin.lastName}</strong><small>{currentAdmin.role.replaceAll("_", " ")}</small></div></div>}</aside><main><header><h1>{title}</h1><label>⌕ <input placeholder="Looking for something..." /></label><div className="pm-current"><i>{initials(currentAdmin)}</i><div><strong>{currentAdmin?.firstName} {currentAdmin?.lastName}</strong><small>Welcome</small></div></div></header>{children}</main></div>;
}

function Empty({ message }) { return <div className="pm-empty"><b>◇</b><strong>{message}</strong><small>Information will appear when it becomes available.</small></div>; }

function AppointmentDrawer({ item, onClose }) {
  if (!item) return null;
  const referral = item.referral;
  return <div className="pm-overlay" onMouseDown={onClose}><aside className="pm-detail" onMouseDown={(event) => event.stopPropagation()}><button className="pm-close" onClick={onClose}>×</button><h2>Appointment Details</h2><section><div><span>Appointment ID</span><strong>#{item.displayId}</strong></div><div><span>Date<br />Time</span><strong>{dateText(item.date)}<br />{timeText(item.date)}</strong></div><div><span>Appointment Type<br />Status</span><strong>{item.visitType || "General"}<br /><em className={`status ${item.status}`}>{labels[item.status] || item.status}</em></strong></div>{item.status === "PENDING" && <p className="notice warning">ⓘ Waiting for facility to accept appointment request</p>}{item.status === "NO_SHOW" && <p className="notice">ⓘ Patient failed to attend appointment</p>}</section><section><h3>{referral ? "Referring Facility" : "Facility Details"}</h3><div><span>Facility</span><strong>{item.facility?.name || "Not recorded"}<small>{[item.facility?.city, item.facility?.state].filter(Boolean).join(", ")}</small></strong></div><div><span>Clinician</span><strong>Dr. {item.clinician.firstName} {item.clinician.lastName}<small>{classificationDisplayLabel(item.clinician.specialty || "Clinician")}</small></strong></div></section>{referral && <section><h3>Referral Details</h3><div><span>From</span><strong>Dr. {referral.fromClinician.firstName} {referral.fromClinician.lastName}</strong></div><div><span>To</span><strong>Dr. {referral.toClinician.firstName} {referral.toClinician.lastName}</strong></div></section>}</aside></div>;
}

function ReferralParty({ label, clinician }) {
  const facility = clinician?.facility;
  return <section><h3>{label}</h3><div><span>Facility</span><strong>{facility?.name || "Not recorded"}<small>{[facility?.city, facility?.state].filter(Boolean).join(", ")}</small></strong></div><div><span>{label.startsWith("To") ? "Specialist" : "Clinician"}</span><strong>Dr. {clinician?.firstName} {clinician?.lastName}<small>{classificationDisplayLabel(clinician?.specialty || "Clinician")}</small></strong></div></section>;
}

function ReferralDrawer({ item, relatedAppointment, onViewAppointment, onClose }) {
  if (!item) return null;
  const pending = ["SENT", "PENDING"].includes(item.status);
  const decisionLabel = item.status === "REJECTED" ? "Declined by" : item.status === "CANCELLED" ? "Canceled by" : "";
  return <div className="pm-overlay" onMouseDown={onClose}><aside className="pm-detail" onMouseDown={(event) => event.stopPropagation()}><button className="pm-close" onClick={onClose}>×</button><h2>Referral Details</h2><section><div><span>Referral ID</span><strong>#{item.displayId}</strong></div><div><span>Date Sent<br />Time Sent</span><strong>{dateText(item.createdAt)}<br />{timeText(item.createdAt)}</strong></div><div><span>Status</span><strong><em className={`status ${item.status}`}>{referralLabels[item.status] || item.status}</em></strong></div>{pending && <p className="notice warning">ⓘ Waiting for receiving facility to accept referral.</p>}</section><ReferralParty label="From (Referring Facility)" clinician={item.fromClinician} /><ReferralParty label="To (Receiving Clinician)" clinician={item.toClinician} />{decisionLabel && item.decisionBy && <section className="pm-decision"><h3>{decisionLabel}</h3><div><span>Decision</span><strong>Dr. {item.decisionBy.firstName} {item.decisionBy.lastName}<small>{dateText(item.updatedAt)} · {timeText(item.updatedAt)}</small></strong></div>{item.decisionReason && <div><span>Reason</span><strong>{item.decisionReason}</strong></div>}</section>}{relatedAppointment && <button className="pm-related" onClick={() => onViewAppointment(relatedAppointment)}>View Related Appointment</button>}</aside></div>;
}

function SuspendModal({ patient, onClose, onDone }) {
  const [reason, setReason] = useState(""); const [description, setDescription] = useState(""); const [durationDays, setDurationDays] = useState(30); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [complete, setComplete] = useState(false);
  async function submit() { setBusy(true); setError(""); try { await suspendAppUser(patient.userId, { reason, description, durationDays: Number(durationDays) }); setComplete(true); onDone(); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  return <div className="pm-overlay centered" onMouseDown={onClose}><section className="pm-modal" onMouseDown={(event) => event.stopPropagation()}><button className="pm-close" onClick={onClose}>×</button>{complete ? <><div className="pm-success">✓</div><h2>Suspension Completed</h2><p>User suspension was successful. You can revert this action at any time.</p><button className="pm-primary" onClick={onClose}>Done</button></> : <><h2>Suspend {patient.firstName} {patient.lastName}</h2><p>User access will be revoked and active sessions will be ended.</p><label>Reason for Suspension<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter reason" /></label><label>Duration<input type="number" min="1" max="3650" value={durationDays} onChange={(event) => setDurationDays(event.target.value)} /></label><label>Description (Optional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Briefly explain the reason for suspension" /></label>{error && <div className="pm-error">{error}</div>}<button className="pm-primary" disabled={!reason || busy} onClick={submit}>{busy ? "Suspending…" : "Proceed to Suspend"}</button></>}</section></div>;
}

const accessLevelLabel = (value) => value === "View and Edit" ? "Full Access" : value;
const accessActionLabel = (grant) => grant.status === "DENIED" ? "Access Denied" : grant.status === "REVOKED" ? "Access Revoked" : grant.status === "PENDING" ? "Access Requested" : "Access Granted";
const durationText = (grant) => {
  const start = new Date(grant.adminGrantedAt || grant.usedAt || grant.createdAt).getTime();
  const end = new Date(grant.expiresAt).getTime();
  const hours = Math.max(0, Math.round((end - start) / 3600000));
  if (hours % 168 === 0) return `${hours / 168} ${hours === 168 ? "Week" : "Weeks"}`;
  if (hours % 24 === 0) return `${hours / 24} ${hours === 24 ? "Day" : "Days"}`;
  return `${hours} ${hours === 1 ? "Hour" : "Hours"}`;
};

function AccessParty({ grant }) {
  const clinician = grant.clinician;
  return <section><h3>{grant.status === "PENDING" ? "Request From" : "User"}</h3><div><span>Clinician</span><strong>{clinician ? `Dr. ${clinician.firstName} ${clinician.lastName}` : "Not recorded"}<small>{classificationDisplayLabel(clinician?.specialty || "Clinician")}</small></strong></div><div><span>Facility</span><strong>{clinician?.facility?.name || "Not recorded"}<small>{[clinician?.facility?.city, clinician?.facility?.state].filter(Boolean).join(", ")}</small></strong></div></section>;
}

function GrantAccessFlow({ patientId, grant, onClose, onDone }) {
  const [step, setStep] = useState("form");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [accessLevel, setAccessLevel] = useState("FULL_ACCESS");
  const [durationValue, setDurationValue] = useState(48);
  const [durationUnit, setDurationUnit] = useState("HOURS");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason && description.trim() && durationValue > 0;
  async function confirm() {
    setBusy(true); setError("");
    try { await grantAppPatientRecordAccess(patientId, grant.id, { reason, description, accessLevel, durationValue: Number(durationValue), durationUnit }); setStep("success"); await onDone(); }
    catch (requestError) { setError(requestError.message); setStep("form"); }
    finally { setBusy(false); }
  }
  return <div className="pm-overlay" onMouseDown={onClose}><aside className="pm-detail pm-access-flow" onMouseDown={(event) => event.stopPropagation()}><button className="pm-close" onClick={onClose}>×</button>{step === "success" ? <div className="pm-access-success"><div className="pm-success">♢</div><h2>Access Granted Successfully</h2><p>Clinician now has access to this patient’s record.</p><button className="pm-primary" onClick={onClose}>Done</button></div> : step === "confirm" ? <div className="pm-access-success"><div className="pm-success">♢</div><h2>Confirm Access</h2><p>You are granting access without direct patient approval.</p>{error && <div className="pm-error">{error}</div>}<div className="pm-confirm-actions"><button className="pm-primary" disabled={busy} onClick={confirm}>{busy ? "Granting…" : "Confirm"}</button><button onClick={() => setStep("form")}>Cancel</button></div></div> : <><div className="pm-access-heading"><div className="pm-success">♢</div><h2>Grant Access</h2><p>Granting access requires justification. Please provide a valid reason.</p></div><div className="pm-access-form"><label>Reason for Granting Access<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Select Reason</option><option value="EMERGENCY_SITUATION">Emergency situation</option><option value="PATIENT_UNABLE_TO_APPROVE">Patient unable to approve</option><option value="SYSTEM_ISSUE">System issue</option><option value="OTHER">Others</option></select></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detail reason for granting access" /></label><label>Access Level<select value={accessLevel} onChange={(event) => setAccessLevel(event.target.value)}><option value="FULL_ACCESS">Full Access</option><option value="VIEW_ONLY">View Only</option></select></label><label>Duration<div className="pm-duration"><input type="number" min="1" value={durationValue} onChange={(event) => setDurationValue(event.target.value)} /><select value={durationUnit} onChange={(event) => setDurationUnit(event.target.value)}><option value="HOURS">Hours</option><option value="DAYS">Days</option><option value="WEEKS">Weeks</option></select></div></label>{error && <div className="pm-error">{error}</div>}</div><button className="pm-primary" disabled={!valid} onClick={() => setStep("confirm")}>Proceed</button></>}</aside></div>;
}

function AccessDetailsDrawer({ patientId, grant, onClose, onChanged, onGrant }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function revoke() { const reason = window.prompt("Reason for removing this access:"); if (!reason?.trim()) return; setBusy(true); setError(""); try { await revokeAppPatientRecordAccess(patientId, grant.id, reason); await onChanged(); onClose(); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  async function deny() { const reason = window.prompt("Reason for denying this request:"); if (!reason) return; setBusy(true); setError(""); try { await denyAppPatientRecordAccess(patientId, grant.id, reason); await onChanged(); onClose(); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } }
  const pending = grant.status === "PENDING";
  return <div className="pm-overlay" onMouseDown={onClose}><aside className="pm-detail" onMouseDown={(event) => event.stopPropagation()}><button className="pm-close" onClick={onClose}>×</button><h2>{pending ? "Pending Request Details" : grant.status === "ACTIVE" ? "Active Access Details" : "Access History Details"}</h2><section><div><span>{pending ? "Requested Access" : "Action"}</span><strong>{pending ? accessLevelLabel(grant.accessLevel) : accessActionLabel(grant)}</strong></div><div><span>Access Level</span><strong>{accessLevelLabel(grant.accessLevel)}</strong></div>{!pending && <div><span>Granted by</span><strong>{grant.grantedBy === "ADMIN" ? "Admin" : "Patient"}</strong></div>}{grant.status === "ACTIVE" && <div><span>Access Duration</span><strong>{durationText(grant)}</strong></div>}<div><span>Status</span><strong className={`status ${grant.status}`}>{grant.status}</strong></div><div><span>Date<br />Time</span><strong>{dateText(grant.adminGrantedAt || grant.createdAt)}<br />{timeText(grant.adminGrantedAt || grant.createdAt)}</strong></div></section><AccessParty grant={grant} />{grant.sectionsAccessed?.length > 0 && <section className="pm-access-reason"><h3>Sections Accessed</h3>{grant.sectionsAccessed.map((event) => <div key={event.id}><span>{event.section}</span><strong>{event.action}</strong></div>)}</section>}{grant.grantReason && <section className="pm-access-reason"><h3>Granted by</h3><div><span>Reason</span><strong>{grant.grantReason.replaceAll("_", " ")}<small>{grant.grantDescription}</small></strong></div></section>}{grant.denialReason && <section className="pm-decision"><h3>Access denied</h3><div><span>Reason</span><strong>{grant.denialReason}</strong></div></section>}{error && <div className="pm-error">{error}</div>}{pending ? <div className="pm-drawer-actions"><button className="pm-related" disabled={busy} onClick={onGrant}>♢ Grant Access</button><button className="pm-danger" disabled={busy} onClick={deny}>Deny</button></div> : grant.status === "ACTIVE" ? <button className="pm-danger" disabled={busy} onClick={revoke}>{busy ? "Revoking…" : "Revoke Access"}</button> : null}</aside></div>;
}

function RecordAccess({ patientId, grants, onReload }) {
  const [tab, setTab] = useState("active");
  const [selected, setSelected] = useState(null);
  const [granting, setGranting] = useState(null);
  const active = grants.filter((item) => item.status === "ACTIVE");
  const pending = grants.filter((item) => item.status === "PENDING");
  const denied = grants.filter((item) => item.status === "DENIED");
  const history = grants.filter((item) => item.status !== "PENDING");
  const rows = tab === "active" ? active : tab === "pending" ? pending : history;
  return <section className="pm-card"><h2>Record Access</h2><div className="pm-access-count"><span>Active Access Grants<strong>{active.length}</strong></span><span>Pending Requests<strong>{pending.length}</strong></span><span>Denied Requests<strong>{denied.length}</strong></span></div><nav className="pm-access-tabs"><button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active Access</button><button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>Pending Request</button><button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>Access History</button></nav>{rows.length ? <div className={`pm-table access ${tab === "history" ? "history" : ""}`}><b>Name</b><b>{tab === "history" ? "Action" : "Type"}</b><b>{tab === "pending" ? "Requested Access" : "Access Level"}</b><b>{tab === "history" ? "Date" : "Status"}</b><b />{rows.map((grant) => <><span key={`${grant.id}-name`}>{grant.clinician ? `Dr. ${grant.clinician.firstName} ${grant.clinician.lastName}` : "Unassigned"}<small>{grant.clinician?.facility?.name || "No facility recorded"}</small></span><span key={`${grant.id}-type`}>{tab === "history" ? accessActionLabel(grant) : "Clinician"}</span><span key={`${grant.id}-level`}>{accessLevelLabel(grant.accessLevel)}</span><span className={`status ${grant.status}`} key={`${grant.id}-status`}>{tab === "history" ? dateText(grant.updatedAt) : grant.status}</span><span key={`${grant.id}-view`}><button onClick={() => setSelected(grant)}>View</button></span></>)}</div> : <Empty message={`No ${tab === "active" ? "active access grants" : tab === "pending" ? "pending requests" : "access history"}`} />}{selected && <AccessDetailsDrawer patientId={patientId} grant={selected} onClose={() => setSelected(null)} onChanged={onReload} onGrant={() => { setGranting(selected); setSelected(null); }} />}{granting && <GrantAccessFlow patientId={patientId} grant={granting} onClose={() => setGranting(null)} onDone={onReload} />}</section>;
}

function PatientList({ onSelect }) {
  const [data, setData] = useState(null); const [search, setSearch] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; setLoading(true); setError(""); const timer = setTimeout(() => getAppPatients({ search }).then((result) => { if (active) setData(result); }).catch((requestError) => { if (active) { setData(null); setError(requestError.message); } }).finally(() => { if (active) setLoading(false); }), 250); return () => { active = false; clearTimeout(timer); }; }, [search]);
  return <div className="pm-content"><section className="pm-card"><div className="pm-title"><h2>Patients</h2><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" /></div>{error && <div className="pm-error">{error}</div>}{loading ? <div className="pm-loading">Loading patients…</div> : error ? <Empty message="Patient data is currently unavailable" /> : data?.patients.length ? <div className="pm-table patients"><b>Patient</b><b>Contact</b><b>Status</b><b>Joined</b><b />{data.patients.map((patient) => <><span className="pm-person" key={`${patient.id}-person`}><i>{initials(patient)}</i><span><strong>{patient.firstName} {patient.lastName}</strong><small>{patient.displayId}</small></span></span><span key={`${patient.id}-email`}>{patient.email}<small>{patient.phone || "No phone"}</small></span><span className={`status ${patient.status}`} key={`${patient.id}-status`}>{patient.status}</span><span key={`${patient.id}-joined`}>{dateText(patient.joinedAt)}</span><span key={`${patient.id}-view`}><button onClick={() => onSelect(patient.id)}>View Profile</button></span></> )}</div> : <Empty message="No patients found" />}</section></div>;
}

function PatientProfile({ patientId, onBack }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("activities");
  const [appointment, setAppointment] = useState(null);
  const [referral, setReferral] = useState(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const load = () => getAppPatient(patientId).then(setData).catch((requestError) => setError(requestError.message));

  useEffect(() => {
    let active = true;
    getAppPatient(patientId).then((result) => active && setData(result)).catch((requestError) => active && setError(requestError.message));
    return () => { active = false; };
  }, [patientId]);

  if (error) return <div className="pm-content"><div className="pm-error">{error}</div></div>;
  if (!data) return <div className="pm-loading">Loading patient profile…</div>;
  const { patient, summary } = data;
  const metrics = [["Total Records", summary.totalRecords], ["Total Appointment", summary.totalAppointments], ["Appointment Completed", summary.completedAppointments], ["Pending Appointments", summary.pendingAppointments], ["Canceled Appointment", summary.cancelledAppointments], ["No-Show", summary.noShows], ["Appointment Comp Rate", `${summary.completionRate}%`], ["Specialist Seen", summary.specialistsSeen], ["Visited Facilities", summary.facilitiesVisited], ["Total Referral", summary.totalReferrals], ["Completed Referral", summary.completedReferrals], ["Pending Referral", summary.pendingReferrals], ["Declined Referral", summary.declinedReferrals], ["Canceled Referral", summary.cancelledReferrals]];
  const relatedAppointment = referral?.appointmentId ? data.appointments.find((item) => item.id === referral.appointmentId) : null;

  async function reactivate() { await liftAppUserSuspension(patient.userId); load(); }
  async function resetAccess() { if (!window.confirm("Reset this user's active sessions and record access grants?")) return; await resetAppUserAccess(patient.userId); setMenu(false); load(); }
  function viewRelatedAppointment(item) { setReferral(null); setAppointment(item); }

  return <div className="pm-content">
    <button className="pm-back" onClick={onBack}>← Patient List</button>
    <section className="pm-card pm-profile"><i>{initials(patient)}</i><div><h2>{patient.firstName} {patient.lastName}</h2><p>Joined: {dateText(patient.joinedAt)}　 User ID: {patient.displayId}　 Gender: {patient.gender || "Not provided"}</p><span>Email: {patient.email}</span><span>Phone: {patient.phone || "Not provided"}</span><span>DOB: {dateText(patient.dateOfBirth)}</span><span>Status: <b className={`status ${patient.status}`}>{patient.status}</b></span></div><button onClick={() => setMenu((value) => !value)}>⋮</button>{menu && <div className="pm-menu">{patient.status === "SUSPENDED" ? <button onClick={reactivate}>Lift Suspension</button> : <button onClick={() => setSuspendOpen(true)}>Suspend</button>}<button onClick={resetAccess}>Reset Access</button></div>}</section>
    <section className="pm-card"><h2>Summary</h2><div className="pm-summary">{metrics.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
    <section className="pm-card">
      <nav className="pm-tabs">{["activities", "appointments", "referral"].map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
      {tab === "activities" && (data.activities.length ? <div className="pm-feed">{data.activities.map((item) => <div key={item.id}><strong>{item.action.replaceAll("_", " ")}</strong><small>{item.details || dateText(item.createdAt)}</small></div>)}</div> : <Empty message="No patient activity" />)}
      {tab === "appointments" && (data.appointments.length ? <div className="pm-table appointments"><b>Date</b><b>Clinician</b><b>Facility</b><b>Appointment ID</b><b>Status</b><b />{data.appointments.map((item) => <><span key={`${item.id}-date`}>{dateText(item.date)}</span><span key={`${item.id}-clinician`}>Dr. {item.clinician.firstName} {item.clinician.lastName}<small>{classificationDisplayLabel(item.clinician.specialty)}</small></span><span key={`${item.id}-facility`}>{item.facility?.name || "Not recorded"}</span><span key={`${item.id}-id`}>#{item.displayId}</span><span className={`status ${item.status}`} key={`${item.id}-status`}>{labels[item.status] || item.status}</span><span key={`${item.id}-view`}><button onClick={() => setAppointment(item)}>View</button></span></>)}</div> : <Empty message="No appointments found" />)}
      {tab === "referral" && (data.referrals.length ? <div className="pm-table referrals"><b>Date</b><b>From</b><b>To</b><b>Referral ID</b><b>Status</b><b />{data.referrals.map((item) => <><span key={`${item.id}-date`}>{dateText(item.createdAt)}</span><span key={`${item.id}-from`}>{item.fromClinician.facility?.name || `Dr. ${item.fromClinician.firstName} ${item.fromClinician.lastName}`}<small>Dr. {item.fromClinician.firstName} {item.fromClinician.lastName}</small></span><span key={`${item.id}-to`}>{item.toClinician.facility?.name || `Dr. ${item.toClinician.firstName} ${item.toClinician.lastName}`}<small>Dr. {item.toClinician.firstName} {item.toClinician.lastName}</small></span><span key={`${item.id}-display`}>#{item.displayId}</span><span className={`status ${item.status}`} key={`${item.id}-status`}>{referralLabels[item.status] || item.status}</span><span key={`${item.id}-view`}><button onClick={() => setReferral(item)}>View</button></span></>)}</div> : <Empty message="No referrals found" />)}
    </section>
    <RecordAccess patientId={patientId} grants={data.accessGrants} onReload={load} />
    {appointment && <AppointmentDrawer item={appointment} onClose={() => setAppointment(null)} />}
    {referral && <ReferralDrawer item={referral} relatedAppointment={relatedAppointment} onViewAppointment={viewRelatedAppointment} onClose={() => setReferral(null)} />}
    {suspendOpen && <SuspendModal patient={patient} onClose={() => setSuspendOpen(false)} onDone={load} />}
  </div>;
}

export default function Patients({ currentAdmin, onNavigate }) {
  const params = new URLSearchParams(window.location.search); const [patientId, setPatientId] = useState(params.get("patientId") || "");
  function select(id) { window.history.pushState({}, "", `?screen=patients&patientId=${encodeURIComponent(id)}`); setPatientId(id); }
  function back() { window.history.pushState({}, "", "?screen=patients"); setPatientId(""); }
  return <Shell currentAdmin={currentAdmin} onNavigate={onNavigate} title={patientId ? "Patient Profile" : "Patients"}>{patientId ? <PatientProfile patientId={patientId} onBack={back} /> : <PatientList onSelect={select} />}</Shell>;
}
