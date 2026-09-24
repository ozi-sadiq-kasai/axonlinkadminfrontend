import { useEffect, useRef, useState } from "react";
import { listDeletionRequests, getDeletionRequest, updateDeletionRequest } from "../authentication/authApi";
import "./deletionRequests.css";

const label = value => String(value || "").replaceAll("_", " ");
const date = value => value ? new Date(value).toLocaleString() : "—";
function Review({ request, onChanged }) {
  const [form, setForm] = useState({ status: "IN_REVIEW", message: "", evidence: "", deletedData: "", retainedData: "", retentionBasis: "", retentionReviewAt: "", hasRetainedData: true, fulfilled: false, withdrawalConfirmed: false });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const set = key => event => setForm(current => ({ ...current, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  const field = (key, title, required = true) => <label>{title}<textarea maxLength={2000} required={required} value={form[key]} onChange={set(key)} /></label>;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await updateDeletionRequest(request.id, { ...form, version: request.version }); onChanged(result.request); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  const closed = ["COMPLETED", "CANCELLED"].includes(request.status);
  return <>
    <h2>{request.email}</h2><p>Reference: {request.id}</p><p>{request.scope === "ADMIN" ? "Platform administrator" : "Patient / clinician / facility staff"} · {label(request.status)} · Email verified {date(request.verifiedAt)}</p>
    <p className="dr-note">Email verification proves control of this mailbox, not authority over a facility or another person’s records. Match the correct account and scope before processing. Requests for platform administrators must be handled in the separate admin account system.</p>
    {!closed && <form onSubmit={submit}>
      <label>Next status<select value={form.status} onChange={set("status")}><option value="IN_REVIEW">In review</option><option value="NEEDS_INFORMATION">Needs information</option><option value="COMPLETED" disabled={request.status !== "IN_REVIEW"}>Record completed processing</option><option value="CANCELLED">Withdrawn by requester</option></select></label>
      {field("message", "Message emailed to the requester (no internal notes or clinical details)")}
      {(form.status === "COMPLETED" || form.status === "CANCELLED") && field("evidence", "Internal evidence reference and actions performed (do not paste medical records)")}
      {form.status === "COMPLETED" && <fieldset><legend>Document completed work</legend>
        <p>This action records work already performed. It does not delete accounts, files, sessions or medical records. Complete the approved operational process before submitting.</p>
        {field("deletedData", "Account closure and associated data actually deleted (included in outcome email)")}
        <label className="dr-check"><input type="checkbox" checked={form.hasRetainedData} onChange={set("hasRetainedData")} />Some associated data was retained</label>
        {form.hasRetainedData && <>{field("retainedData", "Retained data categories (included in outcome email)")}{field("retentionBasis", "Specific retention obligation and period, including backups (included in outcome email)")}<label>Retention review date<input type="date" required value={form.retentionReviewAt} onChange={set("retentionReviewAt")} /></label></>}
        <label className="dr-check"><input type="checkbox" required checked={form.fulfilled} onChange={set("fulfilled")} />I verified the account owner and completed account closure, sign-in/session revocation, deletion and service-provider follow-up. The entries above accurately describe the result.</label>
      </fieldset>}
      {form.status === "CANCELLED" && <label className="dr-check"><input type="checkbox" required checked={form.withdrawalConfirmed} onChange={set("withdrawalConfirmed")} />The verified requester asked to withdraw; I have recorded evidence.</label>}
      {error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? "Saving…" : "Save review and queue email update"}</button>
    </form>}
    <h3>Request history</h3>{request.events.map(event => <article key={event.id}><strong>{label(event.status)} · {date(event.createdAt)}</strong><p>{event.message}</p>{event.actorId && <small>Reviewer: {event.actorId}</small>}{event.evidence && <p>Internal evidence: {event.evidence}</p>}{event.deletedData && <p>Deleted: {event.deletedData}</p>}{event.retainedData && <p>Retained: {event.retainedData}<br />Basis: {event.retentionBasis}<br />Review: {date(event.retentionReviewAt)}</p>}<small>{event.notificationSentAt ? `Email accepted by provider: ${date(event.notificationSentAt)} (delivery not confirmed here)` : `Email queued / retry pending · Attempts: ${event.deliveryAttempts}`}</small></article>)}
  </>;
}

export default function DeletionRequests({ onNavigate }) {
  const selection = useRef(0);
  const [status, setStatus] = useState(""), [page, setPage] = useState(1), [data, setData] = useState(null), [request, setRequest] = useState(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  async function load() { setLoading(true); setError(""); try { setData(await listDeletionRequests(status, page)); } catch (reason) { setError(reason.message); } finally { setLoading(false); } }
  useEffect(() => { let active = true; setLoading(true); setError(""); listDeletionRequests(status, page).then(value => { if (active) setData(value); }).catch(reason => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [status, page]);
  async function open(id) { const current = ++selection.current; setError(""); setRequest(null); try { const result = await getDeletionRequest(id); if (selection.current === current) setRequest(result.request); } catch (reason) { if (selection.current === current) setError(reason.message); } }
  return <main className="dr-page"><header><button onClick={() => onNavigate("dashboard")}>← Dashboard</button><h1>Account deletion requests</h1><p>Verified requests for manual review. Clinical records are not automatically erased.</p></header>
    <div className="dr-toolbar"><label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>{["", "SUBMITTED", "IN_REVIEW", "NEEDS_INFORMATION", "COMPLETED", "CANCELLED"].map(value => <option key={value} value={value}>{label(value) || "All statuses"}</option>)}</select></label><button onClick={() => { load(); if (request) open(request.id); }}>Refresh</button></div>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Loading requests…</p>}
    <div className="dr-columns"><section><h2>Requests {data ? `(${data.total})` : ""}</h2>{!loading && data?.requests.length === 0 && <p>No requests match this filter.</p>}{data?.requests.map(item => <button className="dr-item" key={item.id} onClick={() => open(item.id)}><strong>{item.email}</strong><span>{label(item.status)} · {item.scope === "ADMIN" ? "Platform admin" : "Personal / staff"}</span><small>{date(item.createdAt)}</small></button>)}<div className="dr-toolbar"><button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button disabled={!data || page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next</button></div></section>
      <section>{request ? <Review key={`${request.id}:${request.version}`} request={request} onChanged={next => { setRequest(next); load(); }} /> : <p>Select a request to inspect its history and record your review.</p>}</section></div>
  </main>;
}
