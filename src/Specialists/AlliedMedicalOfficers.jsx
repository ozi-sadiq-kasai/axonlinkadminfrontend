import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell, DocumentReview, EmploymentDocument } from "./Specialists";
import { getAppAlliedMedicalOfficers, getAppAlliedMedicalOfficer, reviewAppAlliedMedicalOfficer } from "../authentication/authApi";

const statusText = value => String(value || "NOT_SUBMITTED").replaceAll("_", " ");
const statusClass = value => value === "APPROVED" ? "ACTIVE" : value === "REJECTED" ? "REJECTED" : "pending";
const reviewCredential = (id, type, details) => reviewAppAlliedMedicalOfficer(id, { ...details, documentType: type });
const rejectionReasons = ["Certificate is unreadable", "Document does not match the declared profession", "Uploaded document is incomplete", "Issuing institution cannot be verified", "Incorrect document uploaded", "Expired"];

function AlliedProfile({ id, currentAdmin, onNavigate, onBack }) {
  const [data, setData] = useState(null), [error, setError] = useState(""), [documentType, setDocumentType] = useState("");
  const load = useCallback(async () => { setError(""); const result = await getAppAlliedMedicalOfficer(id); setData(result); }, [id]);
  useEffect(() => { let live = true; getAppAlliedMedicalOfficer(id).then(value => { if (live) setData(value); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [id]);
  const officer = data?.clinician, credential = data?.credential;
  const documents = credential ? {
    CERTIFICATE: { url: credential.certificateUrl, name: credential.certificateName, label: "Professional Certificate", status: credential.certificateStatus, rejectionReason: credential.certificateRejectionReason },
    LICENCE: { url: credential.licenceUrl, name: credential.licenceName, label: "Professional Licence", status: credential.licenceStatus, rejectionReason: credential.licenceRejectionReason }
  } : {};
  const selected = documents[documentType];
  return <Shell currentAdmin={currentAdmin} onNavigate={onNavigate} pageTitle="Allied Medical Officer Profile"><div className="sp-content">
    <button className="back" onClick={onBack}>← Back to Allied Medical Officers</button>
    <button onClick={() => load().catch(e => setError(e.message))}>Refresh credentials</button>
    {error && <p className="sp-error" role="alert">{error}</p>}
    {!officer ? <div className="sp-empty">{error ? "Profile unavailable" : "Loading profile…"}</div> : <>
      <section className="sp-card profile-head"><div><h2>{officer.firstName} {officer.lastName}</h2><div>
        {[["Email", officer.email], ["Verification Status", statusText(credential?.status)], ["Allied Category", credential?.category], ["Profession", credential?.profession], ["Professional Qualification", credential?.qualification], ["Registration Number", credential?.registrationNumber], ["Training Institution", credential?.institution], ["Submission Version", credential?.version]].map(([label,value]) => <span key={label}>{label}: {value || "Not provided"}</span>)}
      </div></div></section>
      <EmploymentDocument documents={data.employmentDocuments} />
      {credential?.status === "REJECTED" && <section className="sp-card"><h3>Rejection reason</h3><p>{credential.rejectionReason}</p><p>A fresh certificate or licence is required before resubmission.</p></section>}
      {credential?.status === "PENDING_VERIFICATION" && credential.version > 1 && <p>Resubmitted credentials — version {credential.version}, awaiting review.</p>}
      <section className="sp-card"><h2>Professional Credentials</h2><p>Credential approval does not grant clinical workflow access or public Specialist discovery.</p>
        <div className="folders">{Object.entries(documents).map(([type, doc]) => <button key={type} className={doc.status === "REJECTED" && doc.url ? "rejected" : doc.status === "APPROVED" ? "verified" : "pending"} disabled={!doc.url} onClick={() => setDocumentType(type)}><b>{doc.label}</b><span>{doc.url ? statusText(doc.status) : "Not submitted"}</span></button>)}</div>
        {!credential && <div className="sp-empty">No credentials submitted</div>}
      </section>
      {selected && <DocumentReview key={`${id}-${documentType}-${credential.version}-${selected.status}`} specialistId={id} type={documentType}
        document={{ present: Boolean(selected.url), url: selected.url, name: selected.name, verified: selected.status === "APPROVED", status: selected.status, version: credential.version, qualification: credential.qualification, institution: credential.institution, registrationNumber: credential.registrationNumber, submittedAt: credential.submittedAt, reviewedAt: credential.reviewedAt, rejectionReason: selected.rejectionReason }}
        documentTitle={selected.label} verificationChecks={["Name Matches Document", "Professional Qualification", "Issuing Institution"]} rejectionReasons={rejectionReasons}
        history={data.verificationHistory || []} onBack={() => setDocumentType("")} onUpdated={load}
        canReview={currentAdmin?.role === "SUPER_ADMIN" && selected.status === "PENDING_VERIFICATION"}
        reviewDocument={reviewCredential} allowedActions={["approve", "reject"]} />}
    </>}
  </div></Shell>;
}

export default function AlliedMedicalOfficers({ currentAdmin, onNavigate }) {
  const [id, setId] = useState(() => new URLSearchParams(window.location.search).get("alliedId") || "");
  const [rows, setRows] = useState(null), [error, setError] = useState(""), [search, setSearch] = useState(""), [status, setStatus] = useState("");
  useEffect(() => { if (id) return; let live = true; setError(""); getAppAlliedMedicalOfficers().then(data => { if (live) setRows(data.clinicians || []); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, [id]);
  const filtered = useMemo(() => (rows || []).filter(row => (!status || row.status === status) && [row.firstName,row.lastName,row.email,row.category,row.profession].join(" ").toLowerCase().includes(search.trim().toLowerCase())), [rows,search,status]);
  const select = next => { window.history.pushState({}, "", `?screen=allied-medical-officers${next ? `&alliedId=${encodeURIComponent(next)}` : ""}`); setId(next); };
  if (id) return <AlliedProfile key={id} id={id} currentAdmin={currentAdmin} onNavigate={onNavigate} onBack={() => select("")} />;
  return <Shell currentAdmin={currentAdmin} onNavigate={onNavigate} pageTitle="Allied Medical Officers"><div className="sp-content">
    <section className="sp-card"><div className="sp-heading"><h2>Overview</h2><input aria-label="Search Allied Medical Officers" placeholder="Search Allied Medical Officers" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="sp-metrics">{[["Total",rows?.length],["Pending Verification",rows?.filter(row => row.status === "PENDING_VERIFICATION").length],["Approved",rows?.filter(row => row.status === "APPROVED").length],["Rejected",rows?.filter(row => row.status === "REJECTED").length]].map(([label,value]) => <div key={label}><span>{label}</span><b>{value ?? "—"}</b></div>)}</div>
    </section>
    {error && <p className="sp-error" role="alert">{error}</p>}
    <section className="sp-card"><div className="sp-heading"><h2>Allied Medical Officers</h2><select aria-label="Verification status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{["NOT_SUBMITTED","PENDING_VERIFICATION","APPROVED","REJECTED"].map(value => <option key={value} value={value}>{statusText(value)}</option>)}</select></div>
      {filtered.length ? <div className="sp-table"><b>Name</b><b>Allied Category</b><b>Profession</b><b>Qualification</b><b>Status</b><b />{filtered.map(row => <div className="sp-row" key={row.id}><span className="sp-person"><span><strong>{row.firstName} {row.lastName}</strong><small>{row.email}</small></span></span><span>{row.category || "—"}</span><span>{row.profession || "—"}</span><span>{row.qualification || "—"}</span><em className={`state ${statusClass(row.status)}`}>{statusText(row.status)}</em><button onClick={() => select(row.id)}>View Profile</button></div>)}</div> : <div className="sp-empty">{rows ? "No Allied Medical Officers found" : error ? "Unable to load officers" : "Loading Allied Medical Officers…"}</div>}
    </section>
  </div></Shell>;
}
