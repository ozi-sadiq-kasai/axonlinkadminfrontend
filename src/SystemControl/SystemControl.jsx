import { useEffect, useState } from "react";
import { getSystemControl, updateSystemControl } from "../authentication/authApi";
import "./systemControl.css";
import { canAccessScreen } from "../accessControl";

const pretty = (value) => String(value).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const sections = [
  { title: "Queue Rule", icon: "♧", tone: "purple", fields: [
    ["maxQueueSize", "Max Queue Size", "number"], ["maxWaitMinutes", "Max Wait Time", "minutes"],
  ] },
  { title: "Referral Rule", icon: "♙", tone: "gold", fields: [
    ["whoCanRefer", "Who Can Refer", "select", ["CLINICIANS", "SPECIALISTS", "CLINICIANS_AND_SPECIALISTS"]],
    ["whoCanAcceptReferral", "Who Can Accept Referral", "select", ["CLINICIAN", "SPECIALIST", "CLINICIANS_AND_SPECIALISTS"]],
    ["referralAutoCancelDays", "Referral Waiting Time Before Auto Cancel", "days"],
    ["reReferralEnabled", "Re-referral", "toggle"], ["multiReferralLimit", "Multi Referral Limit", "number"],
  ] },
  { title: "Appointment Policy", icon: "▣", tone: "green", fields: [
    ["maxBookingsPerPatientDay", "Max Booking Per-Patient Per-day", "number"],
    ["advanceBookingLimitDays", "Advance Booking Limit", "days"],
    ["cancellationRole", "Cancellation Role", "select", ["PATIENT", "CLINICIAN", "PATIENT_AND_CLINICIAN", "ADMIN_ONLY"]],
  ] },
  { title: "Notification", icon: "♧", tone: "purple", fields: [
    ["emailNotificationsEnabled", "Email Notification", "toggle"],
    ["pushNotificationsEnabled", "Push Notification", "toggle"],
    ["smsNotificationsEnabled", "SMS Notification", "toggle"],
  ] },
];

function Control({ field, label, type, options, value, disabled, onChange }) {
  if (type === "toggle") return <div className="sc-row"><span>{label}</span><button type="button" role="switch" aria-checked={value} className={`sc-toggle ${value ? "on" : ""}`} disabled={disabled} onClick={() => onChange(!value)}><i /></button></div>;
  if (type === "select") return <label className="sc-row"><span>{label}</span><select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>{options.map((item) => <option value={item} key={item}>{pretty(item)}</option>)}</select></label>;
  return <label className="sc-row"><span>{label}<small>{type === "minutes" ? "Maximum time a patient can wait" : type === "days" ? "Measured in days" : "System limit"}</small></span><span className="sc-step"><button type="button" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>‹</button><input type="number" min="1" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} /><button type="button" disabled={disabled} onClick={() => onChange(value + 1)}>›</button>{type === "minutes" && <em>{Math.floor(value / 60)} hrs : {String(value % 60).padStart(2, "0")} min</em>}</span></label>;
}

export default function SystemControl({ currentAdmin, onNavigate }) {
  const [settings, setSettings] = useState(null); const [error, setError] = useState(""); const [saved, setSaved] = useState(""); const [busy, setBusy] = useState(false);
  const editable = currentAdmin?.role === "SUPER_ADMIN" || currentAdmin?.role === "AUDITOR";
  useEffect(() => { getSystemControl().then(({ settings: data }) => setSettings(data)).catch((e) => setError(e.message)); }, []);
  function change(field, value) { setSettings((current) => ({ ...current, [field]: value })); setSaved(""); }
  async function save() { setBusy(true); setError(""); try { const { settings: next } = await updateSystemControl(settings); setSettings(next); setSaved("System controls saved."); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  const item = (screen, label, icon) => canAccessScreen(currentAdmin?.role, screen) ? <button className={screen === "system-control" ? "active" : ""} onClick={() => onNavigate(screen)} key={screen}>{icon} {label}</button> : null;
  return <div className="sc-shell"><aside><div className="sc-logo">axonl<span>i</span>nk</div><small>MAIN</small>{[["dashboard","Dashboard","▦"],["patients","Users","♧"],["referrals","Referrals","⇄"],["activities","Activities","⬡"],["reports","Reports","▥"]].map(([screen,label,icon]) => item(screen,label,icon))}<small>SETTINGS</small>{item("role-access","Role & Access","♙")}{item("system-control","System Control","▣")}{item("communication","Communication","⌁")}<div className="sc-admin"><i>{currentAdmin?.firstName?.[0]}{currentAdmin?.lastName?.[0]}</i><span><b>{currentAdmin?.firstName} {currentAdmin?.lastName}</b><small>{pretty(currentAdmin?.role || "Admin")}</small></span></div></aside><main><header><h1>System Control</h1><label>⌕ <input placeholder="Looking for something..." /></label><b>{currentAdmin?.firstName} {currentAdmin?.lastName}</b></header><div className="sc-content">{error && <p className="sc-error">{error}</p>}{saved && <p className="sc-success">{saved}</p>}{!settings ? <div className="sc-loading">Loading system controls…</div> : sections.map((section) => <section className={`sc-card ${section.tone}`} key={section.title}><h2><i>{section.icon}</i>{section.title}</h2><div>{section.fields.map(([field,label,type,options]) => <Control key={field} field={field} label={label} type={type} options={options} value={settings[field]} disabled={!editable || busy} onChange={(value) => change(field, value)} />)}</div>{section.title === "Notification" && <aside className="sc-note"><b>Notification Rule</b><span>• Referral Alerts<br />• Security Notifications</span><span>• Access Request Alerts<br />• Appointment Updates</span></aside>}</section>)}{settings && editable && <button className="sc-save" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Changes"}</button>}{settings && !editable && <p className="sc-readonly">Your role has read-only access to system controls.</p>}</div></main></div>;
}
