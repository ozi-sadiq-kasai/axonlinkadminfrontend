import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ getAppSpecialists: vi.fn(), getAppSpecialist: vi.fn(), reviewAppSpecialistDocument: vi.fn(), grantAppPatientRecordAccess: vi.fn(), revokeAppPatientRecordAccess: vi.fn() }));
vi.mock("../authentication/authApi", () => api);
import Specialists from "../Specialists/Specialists";
const base = { id: "one", firstName: "Ada", lastName: "Okafor", accountStatus: "ACTIVE", status: "ACTIVE", facilities: [], submittedDocuments: ["LICENSE", "DEGREE"] };
let approved;
beforeEach(() => { vi.clearAllMocks(); approved = false; });
it("separates account and professional statuses and excludes only verified clinicians from the unverified table", async () => {
  const statuses = ["NOT_SUBMITTED", "INCOMPLETE", "PENDING_VERIFICATION", "VERIFIED", "REJECTED", "REVOKED"];
  api.getAppSpecialists.mockResolvedValue({ specialists: statuses.map((status, i) => ({ ...base, id: String(i), firstName: `Person${i}`, accountStatus: i === 3 ? "SUSPENDED" : "ACTIVE", professionalVerificationStatus: status, professionalVerified: status === "VERIFIED" })) });
  render(<Specialists currentAdmin={{ role: "SUPER_ADMIN" }} onNavigate={() => {}} />);
  await screen.findAllByText("Person0 Okafor");
  const main = screen.getByRole("heading", { name: "Specialists", exact: true }).closest("section");
  const unverified = screen.getByRole("heading", { name: "Unverified Specialists" }).closest("section");
  expect(within(main).getByText("Account Status")).toBeInTheDocument();
  expect(within(main).getByText("Verification Status")).toBeInTheDocument();
  for (const label of ["Not Submitted", "Incomplete", "Pending Verification", "Verified", "Rejected", "Revoked", "Suspended"]) expect(within(main).getByText(label)).toBeInTheDocument();
  expect(within(unverified).queryByText("Person3 Okafor")).not.toBeInTheDocument();
  expect(within(unverified).getByText("Person5 Okafor")).toBeInTheDocument();
});
it("successful review refreshes profile and both tables without reloading the dashboard", async () => {
  const row = () => ({ ...base, verified: approved, professionalVerified: approved, professionalVerificationStatus: approved ? "VERIFIED" : "PENDING_VERIFICATION" });
  api.getAppSpecialists.mockImplementation(async () => ({ specialists: [row()] }));
  api.getAppSpecialist.mockImplementation(async () => ({ specialist: row(), appointments: [], referrals: [], accessGrants: [], verificationHistory: [], documents: { LICENSE: { present: true, verified: true }, DEGREE: { present: true, verified: approved } } }));
  api.reviewAppSpecialistDocument.mockImplementation(async () => { approved = true; });
  render(<Specialists currentAdmin={{ role: "SUPER_ADMIN" }} onNavigate={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "View Profile" }));
  fireEvent.click(await screen.findByRole("button", { name: /license verification/i }));
  fireEvent.click(screen.getByRole("button", { name: /Medical Degree/ }));
  fireEvent.click(screen.getByRole("button", { name: "Approve", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm", exact: true }));
  await waitFor(() => expect(api.getAppSpecialist).toHaveBeenCalledTimes(2));
  expect(api.reviewAppSpecialistDocument).toHaveBeenCalledWith("one", "DEGREE", { action: "APPROVED", note: "" });
  fireEvent.click(screen.getByRole("button", { name: /Back to specialists/ }));

await waitFor(() => {
  expect(screen.getByText("Verified", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Active", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("No unverified specialists")).toBeInTheDocument();
});

expect(api.getAppSpecialists).toHaveBeenCalledTimes(2);
});
