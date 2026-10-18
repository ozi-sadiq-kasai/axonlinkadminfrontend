import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, it, vi, beforeEach } from "vitest";
const {getDashboard}=vi.hoisted(()=>({getDashboard:vi.fn()}));
vi.mock("../authentication/authApi",()=>({getDashboard}));
import Dashboard from "../Dashboard/dashboard/Dashboard";
const labels=["Total Patients","Appointment Today","Referrals Today","On-Going Consultation","Appointments Completed","Active Specialist","Active Facility","Total Facilities"];
const payload={overview:labels.map(label=>({label,value:0})),appointmentTrend:[{label:"00:00",value:0}],referralTrend:[],attentionNeeded:[],recentActivities:[],topFacilities:[],topSpecialists:[]};
beforeEach(()=>getDashboard.mockReset());
it("shows loading before actual data and renders valid zeros and genuine empty sections",async()=>{
 let resolve;getDashboard.mockReturnValue(new Promise(done=>{resolve=done;}));render(<Dashboard currentAdmin={{id:"a",role:"SUPER_ADMIN"}}/>);
 expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");expect(screen.queryByText("No recent activities")).not.toBeInTheDocument();
 resolve(payload);await waitFor(()=>expect(screen.getAllByText("0")).toHaveLength(8));expect(screen.getByText("No recent activities")).toBeInTheDocument();
 expect(screen.getByRole("img",{name:"Appointment Trend data"}).querySelector("polyline").getAttribute("points")).not.toMatch(/NaN|Infinity/);
});
it("displays API failure distinctly and supports recovery",async()=>{
 getDashboard.mockRejectedValueOnce(Error("Service unavailable")).mockResolvedValueOnce({...payload,overview:payload.overview.map(item=>({...item,value:item.label === "Total Patients" ? 37 : 0})),attentionNeeded:[{title:"2 pending appointment requests",time:"Current"}],topFacilities:[{name:"Test facility",score:3,detail:"Completed appointments"}]});
 render(<Dashboard currentAdmin={{id:"a",role:"SUPER_ADMIN"}}/>);expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");expect(screen.queryByText("No recent activities")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Retry"}));expect(await screen.findByText("37")).toBeInTheDocument();expect(screen.getByText("Test facility")).toBeInTheDocument();expect(screen.getByText("2 pending appointment requests")).toBeInTheDocument();
});
it("rejects malformed responses rather than presenting empty data",async()=>{getDashboard.mockResolvedValue({});render(<Dashboard currentAdmin={{id:"a",role:"AUDITOR"}}/>);expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard data is unavailable");});
