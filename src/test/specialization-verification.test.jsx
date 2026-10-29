import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { it, expect, vi, beforeEach } from 'vitest';
const { review } = vi.hoisted(() => ({ review: vi.fn() }));
vi.mock('../authentication/authApi', () => ({ reviewAppSpecialistDocument: review, getAppSpecialist:vi.fn(),getAppSpecialists:vi.fn(),grantAppPatientRecordAccess:vi.fn(),revokeAppPatientRecordAccess:vi.fn(),getClassificationRequests:vi.fn(),getClassificationRequest:vi.fn(),reviewClassificationRequest:vi.fn() }));
import { CredentialFolders, DocumentReview, EmploymentDocument } from '../Specialists/Specialists';
const document = { id:'one',present:true,verified:false,status:'PENDING_VERIFICATION',version:3,certificateTitle:'Cardiology',institution:'University',name:'credential.pdf',url:'https://storage.invalid/signed-document' };
beforeEach(() => { review.mockReset();review.mockResolvedValue({status:'APPROVED'}); });
it('lists distinct IDs even for equal titles and selects the exact certificate',()=>{
 const onSelect=vi.fn();render(<CredentialFolders documents={{'SPECIALIZATION:one':document,'SPECIALIZATION:two':{...document,id:'two'}}} onSelect={onSelect}/>);
 expect(screen.getByText('Specialization Certificates')).toBeInTheDocument();const cards=screen.getAllByRole('button');expect(cards).toHaveLength(2);fireEvent.click(cards[1]);expect(onSelect).toHaveBeenCalledWith('SPECIALIZATION:two');
});
const open=props=>render(<DocumentReview specialistId="clinician" type="SPECIALIZATION:one" document={document} history={[]} onBack={()=>{}} onUpdated={vi.fn()} canReview {...props}/>);
it('secure viewer and approval submit stable ID and current version',async()=>{open();expect(screen.getByRole('link',{name:/View Document/})).toHaveAttribute('href',document.url);fireEvent.click(screen.getByRole('button',{name:'Approve'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));await waitFor(()=>expect(review).toHaveBeenCalledWith('clinician','SPECIALIZATION:one',{action:'APPROVED',note:'',expectedVersion:3}));});
it('rejection requires a reason and preserves exact document selection',async()=>{open();fireEvent.click(screen.getByRole('button',{name:'Reject'}));expect(screen.getByRole('button',{name:'Proceed'})).toBeDisabled();fireEvent.change(screen.getByRole('combobox'),{target:{value:'Certificate is unreadable'}});fireEvent.click(screen.getByRole('button',{name:'Proceed'}));await waitFor(()=>expect(review).toHaveBeenCalledWith('clinician','SPECIALIZATION:one',{action:'REJECTED',note:'Certificate is unreadable',expectedVersion:3}));});
it('stale review errors remain visible without claiming approval',async()=>{review.mockRejectedValue(Error('Document replaced. Refresh before reviewing.'));open();fireEvent.click(screen.getByRole('button',{name:'Approve'}));fireEvent.click(screen.getByRole('button',{name:'Confirm'}));expect(await screen.findByText('Document replaced. Refresh before reviewing.')).toBeInTheDocument();});
it('read-only reviewer cannot see mutation controls',()=>{open({canReview:false});expect(screen.queryByRole('button',{name:'Approve'})).not.toBeInTheDocument();});
it('history viewer links the historical version, not the active replacement',()=>{open({history:[{id:'event',documentType:'SPECIALIZATION:one',documentVersion:2,documentUrl:'https://storage.invalid/previous',action:'REJECTED',createdAt:'2026-10-24',note:'Unreadable'}]});fireEvent.click(screen.getByRole('button',{name:'View'}));expect(screen.getByRole('link',{name:'View Submitted Document'})).toHaveAttribute('href','https://storage.invalid/previous');});

it('hospital employment filing has a secure viewing link without review controls',()=>{
 render(<EmploymentDocument documents={[{
  affiliationId:'a',
  hospital:'Axon Hospital',
  name:'letter.pdf',
  submitted:true,
  url:'/api/assets?sig=employment'
 }]}/>);
 expect(screen.getByText('Axon Hospital')).toBeInTheDocument();
 expect(screen.getByText('Submitted')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'View Employment Document'})).toHaveAttribute('href','/api/assets?sig=employment');
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('missing hospital employment document is shown as not submitted',()=>{
 render(<EmploymentDocument documents={[{
  affiliationId:'b',
  hospital:'Second Hospital',
  submitted:false,
  url:null
 }]}/>);
 expect(screen.getByText('Second Hospital')).toBeInTheDocument();
 expect(screen.getByText('Not Submitted')).toBeInTheDocument();
 expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('multiple hospital employment documents display separately without legacy filing',()=>{
 render(<EmploymentDocument documents={[
  {affiliationId:'a',hospital:'Axon Hospital',name:'letter.pdf',submitted:true,url:'/api/assets?sig=affiliation'},
  {affiliationId:'b',hospital:'Second Hospital',submitted:false,url:null}
 ]}/>);
 expect(screen.getByText('Axon Hospital')).toBeInTheDocument();
 expect(screen.getByText('Second Hospital')).toBeInTheDocument();
 expect(screen.getByText('Submitted')).toBeInTheDocument();
 expect(screen.getByText('Not Submitted')).toBeInTheDocument();
 expect(screen.queryByText('Legacy Employment Document')).not.toBeInTheDocument();
 expect(screen.getAllByRole('link')).toHaveLength(1);
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
