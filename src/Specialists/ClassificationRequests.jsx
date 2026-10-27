import { classificationDisplayLabel } from "../utils/classificationDisplay";
import { useEffect, useRef, useState } from 'react';
import { getClassificationRequests, getClassificationRequest, reviewClassificationRequest } from '../authentication/authApi';
const labels={PENDING_REVIEW:'Pending',APPROVED:'Approved',REJECTED:'Rejected'};
const classification=value=>classificationDisplayLabel(value) || 'Not classified';
const date=value=>value?new Date(value).toLocaleString():'—';

export default function ClassificationRequests({ onBack }) {
 const [status,setStatus]=useState('PENDING_REVIEW'),[requests,setRequests]=useState([]),[pendingCount,setPendingCount]=useState(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[success,setSuccess]=useState('');
 const [detail,setDetail]=useState(null),[detailLoading,setDetailLoading]=useState(false),[detailError,setDetailError]=useState('');
 const [checked,setChecked]=useState(false),[identity,setIdentity]=useState(false),[reason,setReason]=useState(''),[confirm,setConfirm]=useState(false);
 const inFlight=useRef(false),listVersion=useRef(0),detailVersion=useRef(0);
 async function load(filter=status){
  const version=++listVersion.current;setLoading(true);setError('');
  try{const result=await getClassificationRequests(filter);if(!Array.isArray(result.requests))throw Error('Classification requests could not be retrieved.');if(version===listVersion.current){setRequests(result.requests);setPendingCount(result.pendingCount??null);}}
  catch(e){if(version===listVersion.current)setError(e.message);}
  finally{if(version===listVersion.current)setLoading(false);}
 }
 useEffect(()=>{load(status);return()=>{listVersion.current++;detailVersion.current++;};},[status]);
 async function open(id){
  const version=++detailVersion.current;setDetail(null);setDetailError('');setDetailLoading(true);setConfirm(false);setChecked(false);setIdentity(false);setReason('');
  try{const result=await getClassificationRequest(id);if(!result.request||!Array.isArray(result.history))throw Error('Request details could not be retrieved.');if(version===detailVersion.current)setDetail(result);}
  catch(e){if(version===detailVersion.current)setDetailError(e.message);}
  finally{if(version===detailVersion.current)setDetailLoading(false);}
 }
 async function review(decision){
  if(inFlight.current||!detail)return;
  if(decision==='APPROVED'&&(!confirm||!checked||!identity))return;
  if(decision==='REJECTED'&&!reason.trim())return setDetailError('A rejection reason is required.');
  inFlight.current=true;setBusy(true);setDetailError('');setSuccess('');
  try{await reviewClassificationRequest(detail.request.id,{decision,credentialReviewed:checked,identityReviewed:identity,rejectionReason:reason.trim()});setSuccess(decision==='APPROVED'?'Classification change approved.':'Classification change rejected.');setConfirm(false);await open(detail.request.id);await load();}
  catch(e){setDetailError(e.message);setConfirm(false);}
  finally{inFlight.current=false;setBusy(false);}
 }
 const item=detail?.request;
 const eligible=item?.status==='PENDING_REVIEW'&&item?.clinician?.clinicalClassification==='GENERALIST'&&item?.credentialsApproved===true&&item?.clinician?.user?.verified===true&&!!item.documentUrl;
 return <section className="sp-card">
  <button onClick={onBack} disabled={busy}>← Back to specialists</button><h2>Classification Change Requests</h2>
  <p>Medical Officers retain their permissions until approval. Professional verification remains independent.</p>
  <p>Pending requests: {pendingCount??'—'}</p>
  <nav aria-label="Request status">{Object.entries(labels).map(([key,label])=><button key={key} disabled={busy} aria-pressed={status===key} onClick={()=>{detailVersion.current++;setDetail(null);setDetailError('');setDetailLoading(false);setStatus(key);}}>{label}</button>)}</nav>
  <button onClick={()=>load()} disabled={loading||busy}>Refresh requests</button>
  {success&&<p role="status">{success}</p>}
  {loading?<p role="status">Loading requests…</p>:error?<p className="sp-error" role="alert">Unable to retrieve requests: {error}</p>:requests.length===0?<p>No {labels[status].toLowerCase()} requests.</p>:<div style={{overflowX:'auto'}}><table><thead><tr>{['Clinician','Current classification','Requested classification','Specialty','Submitted','Status',''].map((label,index)=><th key={index}>{label}</th>)}</tr></thead><tbody>{requests.map(row=><tr key={row.id}><td>{row.clinician.firstName} {row.clinician.lastName}</td><td>{classification(row.clinician.clinicalClassification)}</td><td>Specialist</td><td>{row.requestedSpecialization}</td><td>{date(row.createdAt)}</td><td><em className={`state ${row.status}`}>{labels[row.status]}</em></td><td><button disabled={busy} onClick={()=>open(row.id)}>Review request</button></td></tr>)}</tbody></table></div>}
  {detailLoading&&<p role="status">Loading request details…</p>}
  {detailError&&<p className="sp-error" role="alert">{detailError}</p>}
  {item&&<article className="sp-card"><h3>{item.clinician.firstName} {item.clinician.lastName}</h3>
   <p>Clinician ID: {item.clinicianId} · Email: {item.clinician.user.email}</p><p>Email identity: {item.clinician.user.verified?'Verified':'Not verified'}</p>
   <p>Current: {classification(item.clinician.clinicalClassification)} · Requested: Specialist · Status: {labels[item.status]}</p>
   <p>Proposed specialty: {item.requestedSpecialization}</p><p>Reason for change: {item.requestReason||'Not recorded on this historical request'}</p>
   <p>Qualification: {item.qualification}</p><p>Issuing institution: {item.institution}</p><p>Submitted: {date(item.createdAt)}</p>
   <p>Professional verification: {item.credentialsApproved?'Verified':'Not verified'}</p>
   <p>Medical licence: {item.clinician.licenseVerified?'Verified':'Not verified'} · Degree: {item.clinician.degreeVerified?'Verified':'Not verified'}</p>
   {[[item.documentUrl,'Supporting credential'],[item.clinician.licenseDocumentUrl,'Medical licence'],[item.clinician.degreeDocumentUrl,'Professional degree']].map(([url,label])=>url?<p key={label}><a href={url} target="_blank" rel="noreferrer">View {label.toLowerCase()}</a></p>:<p key={label}>{label} unavailable</p>)}
   {item.status==='PENDING_REVIEW'&&<><p><label><input type="checkbox" disabled={busy} checked={identity} onChange={e=>setIdentity(e.target.checked)}/> I verified the clinician identity.</label></p>
    <p><label><input type="checkbox" disabled={busy} checked={checked} onChange={e=>setChecked(e.target.checked)}/> I reviewed and verified the supporting credential for this specialty.</label></p>
    <label>Rejection reason<textarea maxLength={500} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <div className="review-actions"><button disabled={busy||!eligible||!checked||!identity} onClick={()=>setConfirm(true)}>Approve classification change</button><button className="reject" disabled={busy||!reason.trim()} onClick={()=>review('REJECTED')}>Reject request</button></div>
   </>}
   <h3>Request history</h3>{detail.history.map(entry=><div key={entry.id}><p>{entry.requestedSpecialization} — {labels[entry.status]} · Submitted {date(entry.createdAt)} · Decision {date(entry.reviewedAt)}</p><p>Reviewer: {entry.reviewerId||'Not reviewed'}{entry.rejectionReason?` · Reason: ${entry.rejectionReason}`:''}</p></div>)}
  </article>}
  {confirm&&<div className="sp-overlay centered"><div className="review-modal" role="dialog" aria-modal="true" aria-labelledby="classification-confirm"><h2 id="classification-confirm">Confirm classification approval</h2><p>Approve {item?.clinician.firstName} {item?.clinician.lastName} as a Specialist in {item?.requestedSpecialization}? Professional verification requirements remain in force.</p><button disabled={busy} onClick={()=>review('APPROVED')}>{busy?'Approving…':'Confirm approval'}</button><button disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></div></div>}
 </section>;
}
