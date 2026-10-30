import {useEffect,useState} from 'react';
import {Shell} from './Specialists';
import {getAppGuestClinicians} from '../authentication/authApi';
const label=value=>value==='GENERALIST'?'Medical Officer':String(value||'Not provided').replaceAll('_',' ');
const date=value=>value?new Date(value).toLocaleDateString():'—';
export default function GuestClinicians({currentAdmin,onNavigate}) {
 const [page,setPage]=useState(1),[data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setData(null);setError('');getAppGuestClinicians(page).then(d=>active&&setData(d)).catch(e=>active&&setError(e.message));return()=>{active=false}},[page]);
 return <Shell currentAdmin={currentAdmin} onNavigate={onNavigate} pageTitle="Guest Clinicians"><div className="sp-content">
 <p>Grouped by self-reported email for operational reporting. Matching declarations do not prove identity. Historical submissions remain unverified at submission.</p>
 {error&&<p role="alert">{error}</p>}
 {!data&&!error&&<p>Loading guest clinicians…</p>}
 {data?.items?.length===0&&<p>No published guest contributions.</p>}
 {data?.items?.map(row=><section className="sp-card" key={row.email||'unknown'}><h2>{row.email||'Email unavailable'}</h2>
 <p>Registration: {label(row.registrationStatus)} · Current professional verification: {label(row.professionalVerificationStatus)}</p>
 <p>Successful contributions: {row.contributionCount} · Unique patients: {row.uniquePatientCount}</p>
 <p>First contribution: {date(row.firstContributionAt)} · Latest contribution: {date(row.latestContributionAt)}</p>
 <h3>Original identity declarations</h3>{row.declarations?.map((d,i)=><div key={i}><p>{d.firstName||d.lastName?`${d.firstName||''} ${d.lastName||''}`:d.fullName||'Name unavailable'} · {d.phone||'Phone unavailable'}</p><p>{label(d.classification)}{d.profession?` · ${d.profession}`:''}{d.category?` · ${d.category}`:''} · {d.facilityName||'Facility unavailable'}</p></div>)}
 </section>)}
 <button disabled={page===1||!data} onClick={()=>setPage(page-1)}>Previous</button> <span>Page {page}</span> <button disabled={!data?.hasMore} onClick={()=>setPage(page+1)}>Next</button>
 </div></Shell>;
}
