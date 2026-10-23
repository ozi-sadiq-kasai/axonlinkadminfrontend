import { useEffect, useRef, useState } from 'react';
import { getClassificationRequests, reviewClassificationRequest } from '../authentication/authApi';

export default function ClassificationRequests({ onBack }) {
 const [requests,setRequests]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const [checked,setChecked]=useState({}),[reasons,setReasons]=useState({});
 const inFlight=useRef(false);
 async function load(){setLoading(true);setError('');try{const result=await getClassificationRequests();setRequests(result.requests);setChecked({});}catch(e){setError(e.message);}finally{setLoading(false);}}
 useEffect(()=>{load();},[]);
 async function review(item,decision){
  if(inFlight.current)return;
  if(decision==='REJECTED'&&!reasons[item.id]?.trim())return setError('A rejection reason is required.');
  inFlight.current=true;setBusy(item.id);setError('');
  try{await reviewClassificationRequest(item.id,{decision,credentialReviewed:checked[item.id]===true,rejectionReason:reasons[item.id]?.trim()});await load();}
  catch(e){setError(e.message);}finally{inFlight.current=false;setBusy('');}
 }
 return <section className="sp-card"><button onClick={onBack} disabled={!!busy}>← Back to specialists</button><h2>Classification Change Requests</h2>
 <p>Medical Officers retain their current permissions until approval. Verify supporting credentials before deciding.</p>
 <button onClick={load} disabled={loading||!!busy}>Refresh requests</button>
 {error&&<p className="sp-error" role="alert">{error}</p>}
 {loading?<p>Loading requests…</p>:requests.length===0?<p>No pending requests.</p>:requests.map(item=><article key={item.id} className="sp-card">
  <h3>{item.clinician.firstName} {item.clinician.lastName}</h3>
  <p>Requested specialization: {item.requestedSpecialization}</p><p>Qualification: {item.qualification}</p><p>Issuing institution: {item.institution}</p><p>Submitted: {new Date(item.createdAt).toLocaleString()}</p>
  <p>Medical licence: {item.clinician.licenseVerified?'Verified':'Not verified'} · Degree: {item.clinician.degreeVerified?'Verified':'Not verified'}</p>
  {item.documentUrl?<a href={item.documentUrl} target="_blank" rel="noreferrer">View supporting credential: {item.documentName}</a>:<p>Document unavailable. Refresh before reviewing.</p>}
  <p><label><input type="checkbox" disabled={!!busy} checked={!!checked[item.id]} onChange={e=>setChecked({...checked,[item.id]:e.target.checked})}/> I reviewed and verified this supporting credential for the requested specialization.</label></p>
  <label>Rejection reason<textarea maxLength={500} disabled={!!busy} value={reasons[item.id]||''} onChange={e=>setReasons({...reasons,[item.id]:e.target.value})}/></label>
  <div className="review-actions"><button disabled={!!busy||!checked[item.id]||!item.documentUrl||!item.clinician.licenseVerified||!item.clinician.degreeVerified||item.clinician.clinicalClassification!=='GENERALIST'} onClick={()=>review(item,'APPROVED')}>Approve classification</button><button className="reject" disabled={!!busy||!reasons[item.id]?.trim()} onClick={()=>review(item,'REJECTED')}>Reject request</button></div>
 </article>)}
 </section>;
}
