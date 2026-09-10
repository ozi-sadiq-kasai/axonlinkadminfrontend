import React from "react";
import {render,screen} from "@testing-library/react";
import {beforeEach,describe,expect,it,vi} from "vitest";
const {getCurrentAdmin}=vi.hoisted(()=>({getCurrentAdmin:vi.fn()}));
vi.mock("../authentication/authApi",()=>({getCurrentAdmin}));
vi.mock("../authentication/AuthenticationApp",()=>({default:()=> <div>Admin sign in</div>}));
vi.mock("../Dashboard/dashboard/Dashboard",()=>({default:()=> <div>Admin dashboard</div>}));
import App from "../App";
import {canAccessScreen,visibleForRole} from "../accessControl";

describe("Admin authorization",()=>{
 beforeEach(()=>getCurrentAdmin.mockReset());
 it("maps user-directory screens through role permissions",()=>{expect(canAccessScreen("SUPER_ADMIN","patients")).toBe(true);expect(canAccessScreen("ADMIN","patients")).toBe(false);expect(visibleForRole("AUDITOR",[{screen:"system-control"},{screen:"communication"}])).toEqual([{screen:"system-control"}])});
 it("shows loading while checking a protected session",async()=>{let resolve;getCurrentAdmin.mockReturnValue(new Promise(done=>{resolve=done}));history.replaceState({},"","/?screen=dashboard");render(<App/>);expect(screen.getByText("Checking your admin session…")).toBeInTheDocument();resolve({role:"SUPER_ADMIN"});expect(await screen.findByText("Admin dashboard")).toBeInTheDocument()});
 it("blocks a direct route that the signed-in role cannot access",async()=>{getCurrentAdmin.mockResolvedValue({role:"ADMIN"});history.replaceState({},"","/?screen=patients");render(<App/>);expect(await screen.findByText("Access restricted")).toBeInTheDocument()});
});
