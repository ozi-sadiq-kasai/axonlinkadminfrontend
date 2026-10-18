export const dashboardMetricLabels = [
  "Total Patients", "Appointment Today", "Referrals Today", "On-Going Consultation",
  "Appointments Completed", "Active Specialist", "Active Facility", "Total Facilities"
];
export const isDashboardData = value =>
  ["overview", "appointmentTrend", "referralTrend", "attentionNeeded", "recentActivities", "topFacilities", "topSpecialists"].every(key => Array.isArray(value?.[key])) &&
  dashboardMetricLabels.every(label => value.overview.some(item => item.label === label && Number.isFinite(item.value) && item.value >= 0)) &&
  [...value.appointmentTrend, ...value.referralTrend].every(point => typeof point.label === "string" && Number.isFinite(point.value) && point.value >= 0);
