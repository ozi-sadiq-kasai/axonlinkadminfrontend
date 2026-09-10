import { useEffect, useMemo, useState } from "react";
import {
  createAdminInvitation,
  getAdminManagementOverview,
  getAdminProfile,
  sendManagedAdminPasswordReset,
  updateManagedAdmin,
} from "../authentication/authApi";
import "./roleAccess.css";

const navMain = ["Dashboard", "Users", "Referrals", "Activities", "Reports"];
const navSettings = ["Role & Access", "System Control", "Communication"];
const roleLabels = { SUPER_ADMIN: "Super Admin", ADMIN: "Operational Admin", SUPPORT: "Support Admin", AUDITOR: "Compliance Admin" };
const permissionLabels = { FULL_ACCESS: "Full Access", USERS: "Users", REFERRAL: "Referral", ACTIVITY: "Activity", REPORT: "Report", SYSTEM_CONTROL: "System Control", NOTIFICATION: "Notification" };

function initials(admin) { return `${admin?.firstName?.[0] || ""}${admin?.lastName?.[0] || ""}`.toUpperCase() || "A"; }
function formatDate(value) { return value ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "—"; }
function formatTime(value) { return value ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Never"; }
function actionLabel(value) { return String(value || "Activity").toLowerCase().split("_").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" "); }

function Shell({ currentAdmin, onNavigate, title, children }) {
  const mainDestination = {
    Dashboard: "dashboard",
    Users: "patients",
    Referrals: "referrals",
    Activities: "activities",
    Reports: "reports",
  };
  const settingsDestination = {
    "Role & Access": "role-access",
    "System Control": "system-control",
    Communication: "communication",
  };

  return <div className="ra-shell">
    <aside className="ra-sidebar">
      <div className="wordmark">axonl<span>i</span>nk</div>
      <p>MAIN</p>
      {navMain.map((label) => <button key={label} onClick={mainDestination[label] ? () => onNavigate(mainDestination[label]) : undefined}><span>◫</span>{label}</button>)}
      <p>SETTINGS</p>
      {navSettings.map((label) => <button className={label === "Role & Access" ? "active" : ""} onClick={() => onNavigate(settingsDestination[label])} key={label}><span>♙</span>{label}</button>)}
      {currentAdmin && <div className="ra-sidebar-user"><i>{initials(currentAdmin)}</i><div><strong>{currentAdmin.firstName} {currentAdmin.lastName}</strong><small>{roleLabels[currentAdmin.role] || currentAdmin.role}</small></div></div>}
    </aside>
    <main className="ra-main">
      <header><h1>{title}</h1><div className="ra-header-actions"><label>⌕<input placeholder="Looking for something..." /></label>{currentAdmin && <div className="ra-current"><i>{initials(currentAdmin)}</i><div><strong>{currentAdmin.firstName} {currentAdmin.lastName}</strong><small>Welcome back</small></div></div>}<button aria-label="Notifications">♟</button></div></header>
      {children}
    </main>
  </div>;
}

function EmptyRows({ message, columns = 1 }) {
  return <div className="ra-empty" style={{ gridColumn: `1 / span ${columns}` }}><span>◇</span><strong>{message}</strong><small>Database records will appear here when available.</small></div>;
}

function Drawer({ children, onClose, wide = false }) {
  return <div className="ra-overlay" role="presentation" onMouseDown={onClose}><aside className={`ra-drawer${wide ? " wide" : ""}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className="ra-close" onClick={onClose} aria-label="Close">×</button>{children}</aside></div>;
}

function CreateAdminDrawer({ roles, onClose, onCreated }) {
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "" });
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const valid = form.firstName && form.lastName && form.email && form.role;
  async function confirm() {
    setBusy(true); setError("");
    try { const result = await createAdminInvitation(form); setInvitation(result.invitation); setStep("success"); onCreated(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  const inviteUrl = invitation?.inviteUrl || (invitation ? `${window.location.origin}${window.location.pathname}?screen=setup&email=${encodeURIComponent(invitation.email)}&firstName=${encodeURIComponent(invitation.firstName)}&lastName=${encodeURIComponent(invitation.lastName)}&inviteToken=${encodeURIComponent(invitation.token)}` : "");
  return <Drawer onClose={onClose}>
    {step === "form" && <div className="ra-drawer-content"><div className="ra-avatar-icon">♙</div><h2>Create Admin</h2><p>Add a new internal admin account and assign operational responsibilities.</p><div className="ra-form"><label>First Name<input value={form.firstName} onChange={update("firstName")} placeholder="Enter first name" /></label><label>Last Name<input value={form.lastName} onChange={update("lastName")} placeholder="Enter last name" /></label><label>Email Address<input type="email" value={form.email} onChange={update("email")} placeholder="example@gmail.com" /></label><label>Phone Number<input value={form.phone} onChange={update("phone")} placeholder="+234 000 000 0000" /></label><label>Assign Admin Role<select value={form.role} onChange={update("role")}><option value="">Select Role</option>{roles.map((role) => <option value={role.key} key={role.key}>{role.label}</option>)}</select></label></div>{form.role && <div className="ra-access-preview"><strong>Role Access Preview</strong>{roles.find((role) => role.key === form.role)?.permissions.map((item) => <span key={item}>✓ {permissionLabels[item]}</span>)}</div>}<button className="ra-primary" disabled={!valid} onClick={() => setStep("confirm")}>Proceed</button></div>}
    {step === "confirm" && <div className="ra-centered"><h2>Confirm Admin Creation</h2><p>The new admin will access assigned modules after accepting the invitation.</p><dl><div><dt>Name</dt><dd>{form.firstName} {form.lastName}</dd></div><div><dt>Email</dt><dd>{form.email}</dd></div><div><dt>Phone</dt><dd>{form.phone || "Not provided"}</dd></div><div><dt>Role</dt><dd>{roleLabels[form.role]}</dd></div></dl>{error && <div className="ra-error">{error}</div>}<div className="ra-actions"><button className="ra-primary" disabled={busy} onClick={confirm}>{busy ? "Creating…" : "Confirm"}</button><button onClick={() => setStep("form")}>Back</button></div></div>}
    {step === "success" && <div className="ra-centered"><div className="ra-avatar-icon">♢</div><h2>Admin Invitation Created</h2><p>{invitation.emailSent ? "An invitation email has been sent to the administrator." : "Email delivery is not configured. Copy and send the secure invitation link manually."}</p><div className="ra-actions"><button className="ra-primary" onClick={onClose}>Done</button><button onClick={() => navigator.clipboard.writeText(inviteUrl)}>▣ Copy Link</button></div></div>}
  </Drawer>;
}

function ProfileDrawer({ id, roles, onClose, onChanged }) {
  const [data, setData] = useState(null); const [menu, setMenu] = useState(false); const [action, setAction] = useState(""); const [role, setRole] = useState(""); const [message, setMessage] = useState("");
  useEffect(() => { getAdminProfile(id).then((result) => { setData(result); setRole(result.admin.role); }).catch((error) => setMessage(error.message)); }, [id]);
  async function save(changes) { setMessage(""); try { await updateManagedAdmin(id, changes); onChanged(); onClose(); } catch (error) { setMessage(error.message); } }
  async function reset() { try { await sendManagedAdminPasswordReset(id); setAction("sent"); } catch (error) { setMessage(error.message); } }
  if (!data) return <Drawer onClose={onClose}><div className="ra-centered"><p>{message || "Loading administrator…"}</p></div></Drawer>;
  const { admin, auditLogs, sessions } = data;
  return <Drawer onClose={onClose} wide>
    {!action && <div className="ra-profile"><div className="ra-profile-head"><i>{initials(admin)}</i><div><h2>{admin.firstName} {admin.lastName}</h2><p>Joined: {formatDate(admin.createdAt)}</p><span>Email: {admin.email}</span><span>Status: <b className={admin.status === "ACTIVE" ? "ok" : "bad"}>{admin.status}</b></span><span>Role: {roleLabels[admin.role]}</span><span>Last Active: {formatTime(admin.lastLoginAt)}</span></div><button onClick={() => setMenu((value) => !value)}>⋮</button>{menu && <div className="ra-menu"><button onClick={() => setAction("role")}>Change Role</button><button onClick={() => save({ status: admin.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}>{admin.status === "ACTIVE" ? "Suspend" : "Activate"} Admin</button><button onClick={() => setAction("reset")}>Reset Password</button></div>}</div><div className="ra-profile-grid"><section><h3>Access Scope</h3>{data.role.permissions.map((permission) => <div key={permission}>{permissionLabels[permission]} <b>✓</b></div>)}</section><section><h3>Activity Summary</h3><div>Recorded Activities<strong>{auditLogs.length}</strong></div><div>Sign-in Sessions<strong>{sessions.length}</strong></div></section></div><section className="ra-table-card"><h3>Activity Timeline</h3><div className="ra-table three"><b>Time</b><b>Action</b><b>Module</b>{auditLogs.length ? auditLogs.map((log) => <><span key={`${log.id}-time`}>{formatTime(log.createdAt)}</span><span key={`${log.id}-action`}>{actionLabel(log.action)}</span><span key={`${log.id}-module`}>{log.targetType || "Admin"}</span></>) : <EmptyRows message="No activity recorded" columns={3} />}</div></section><section className="ra-table-card"><h3>Sign In and Out Activity</h3><div className="ra-table four"><b>Time</b><b>Device</b><b>Location</b><b>Status</b>{sessions.length ? sessions.map((session) => <><span key={`${session.id}-time`}>{formatTime(session.createdAt)}</span><span key={`${session.id}-device`}>{session.userAgent || "Unknown device"}</span><span key={`${session.id}-location`}>{session.ipAddress || "Unknown"}</span><span key={`${session.id}-status`} className={session.revokedAt ? "bad" : "ok"}>{session.revokedAt ? "Ended" : "Active"}</span></>) : <EmptyRows message="No session activity" columns={4} />}</div></section></div>}
    {action === "role" && <div className="ra-centered"><h2>Change Role</h2><p>You are about to change this administrator's role.</p><dl><div><dt>Current Role</dt><dd>{roleLabels[admin.role]}</dd></div></dl><label className="ra-select-label">New Role<select value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((entry) => <option value={entry.key} key={entry.key}>{entry.label}</option>)}</select></label>{message && <div className="ra-error">{message}</div>}<button className="ra-primary" onClick={() => save({ role })}>Save Change</button></div>}
    {action === "reset" && <div className="ra-centered"><h2>Reset Admin Password</h2><p>This sends password reset instructions and invalidates the current password after completion.</p>{message && <div className="ra-error">{message}</div>}<button className="ra-primary" onClick={reset}>Proceed to Reset</button></div>}
    {action === "sent" && <div className="ra-centered"><h2>Successful</h2><p>Password reset instructions were sent to the administrator's email.</p><button className="ra-primary" onClick={onClose}>Done</button></div>}
  </Drawer>;
}

export default function RoleAccess({ currentAdmin, onNavigate }) {
  const [data, setData] = useState(null); const [error, setError] = useState(""); const [createOpen, setCreateOpen] = useState(false); const [profileId, setProfileId] = useState(""); const [selectedRole, setSelectedRole] = useState("");
  const load = () => getAdminManagementOverview().then(setData).catch((requestError) => setError(requestError.message));
  useEffect(() => {
    let active = true;
    getAdminManagementOverview()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const permissions = useMemo(() => Object.keys(permissionLabels), []);
  const roleDetail = data?.roles.find((role) => role.key === selectedRole);
  const assignedAdmins = data?.admins.filter((admin) => admin.role === selectedRole) || [];
  return <Shell currentAdmin={currentAdmin} onNavigate={onNavigate} title={roleDetail ? "Admin Role" : "Role & Access"}><div className="ra-content">{error && <div className="ra-error">{error}</div>}{!data ? <div className="ra-loading">Loading role and access data…</div> : roleDetail ? <>
    <button className="ra-back" onClick={() => setSelectedRole("")}>← Back to Role & Access</button>
    <section className="ra-card ra-role-summary"><span>Role Type</span><h2>{roleDetail.label}</h2><hr /><span>Admin Assigned</span><strong>{roleDetail.adminCount}</strong><small>Last updated: {roleDetail.adminCount ? formatDate(roleDetail.lastUpdated) : "No updates"}</small></section>
    <section className="ra-card"><h2>Access Scope</h2><div className="ra-scope-list">{permissions.map((permission) => <div key={permission}><span>{permissionLabels[permission]}</span><i className={roleDetail.permissions.includes(permission) ? "enabled" : ""}><b /></i></div>)}</div></section>
    <section className="ra-card"><div className="ra-title"><h2>Assigned Admin <small>{assignedAdmins.length}</small></h2><button className="ra-primary compact" onClick={() => setCreateOpen(true)}>＋ New Admin</button></div><div className="ra-table five"><b>Admin</b><b>Role</b><b>Status</b><b>Last Seen</b><b />{assignedAdmins.length ? assignedAdmins.map((admin) => <><span className="ra-person" key={`${admin.id}-detail-name`}><i>{initials(admin)}</i><span><strong>{admin.firstName} {admin.lastName}</strong><small>{admin.email}</small></span></span><span key={`${admin.id}-detail-role`}>{roleLabels[admin.role]}</span><span className={admin.status === "ACTIVE" ? "ok" : "bad"} key={`${admin.id}-detail-status`}>{admin.status}</span><span key={`${admin.id}-detail-seen`}>{formatTime(admin.lastLoginAt)}</span><span key={`${admin.id}-detail-view`}><button className="ra-pill" onClick={() => setProfileId(admin.id)}>View Profile</button></span></>) : <EmptyRows message="No administrators assigned" columns={5} />}</div></section>
  </> : <>
    <section className="ra-card"><h2>Overview</h2><div className="ra-metrics">{[["Total Admin", data.overview.totalAdmins], ["Active Admin", data.overview.activeAdmins], ["Super Admin", data.overview.superAdmins], ["Admin Role", data.overview.adminRoles], ["Suspended Admin", data.overview.suspendedAdmins]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>
    <section className="ra-card"><div className="ra-title"><h2>Admin Role</h2></div><div className="ra-table five"><b>Role Name</b><b>Admins</b><b>Access Scope</b><b>Last Updated</b><b />{data.roles.map((role) => <><span key={`${role.key}-name`}>{role.label}</span><span key={`${role.key}-count`}>{role.adminCount}</span><span key={`${role.key}-scope`}>{role.permissions.map((permission) => permissionLabels[permission]).join(" + ") || "No access"}</span><span key={`${role.key}-date`}>{role.adminCount ? formatDate(role.lastUpdated) : "—"}</span><span key={`${role.key}-button`}><button className="ra-pill" onClick={() => setSelectedRole(role.key)}>View</button></span></>)}</div></section>
    <section className="ra-card"><h2>Permissions Matrix</h2><div className="ra-table permission" style={{ "--role-count": data.roles.length }}><b>System Feature</b>{data.roles.map((role) => <b key={role.key}>{role.label}</b>)}{permissions.map((permission) => <><span key={`${permission}-label`}>{permissionLabels[permission]}</span>{data.roles.map((role) => <span className={role.permissions.includes(permission) ? "check" : "cross"} key={`${permission}-${role.key}`}>{role.permissions.includes(permission) ? "✓" : "×"}</span>)}</>)}</div></section>
    <section className="ra-card"><div className="ra-title"><h2>Admin</h2><button className="ra-primary compact" onClick={() => setCreateOpen(true)}>＋ New Admin</button></div><div className="ra-table five admins"><b>Admin</b><b>Role</b><b>Status</b><b>Last Seen</b><b />{data.admins.length ? data.admins.map((admin) => <><span className="ra-person" key={`${admin.id}-name`}><i>{initials(admin)}</i><span><strong>{admin.firstName} {admin.lastName}</strong><small>{admin.email}</small></span></span><span key={`${admin.id}-role`}>{roleLabels[admin.role]}</span><span className={admin.status === "ACTIVE" ? "ok" : "bad"} key={`${admin.id}-status`}>{admin.status}</span><span key={`${admin.id}-seen`}>{formatTime(admin.lastLoginAt)}</span><span key={`${admin.id}-view`}><button className="ra-pill" onClick={() => setProfileId(admin.id)}>View Profile</button></span></>) : <EmptyRows message="No administrators found" columns={5} />}</div></section>
  </>}</div>{createOpen && <CreateAdminDrawer roles={data?.roles || []} onClose={() => setCreateOpen(false)} onCreated={load} />}{profileId && <ProfileDrawer id={profileId} roles={data?.roles || []} onClose={() => setProfileId("")} onChanged={load} />}</Shell>;
}
