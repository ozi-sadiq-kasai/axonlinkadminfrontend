export default function AccountDeletionLink({ compact = false }) {
  let href = "";
  try {
    const base = new URL(import.meta.env.VITE_ADMIN_API_URL);
    if (["https:", "http:"].includes(base.protocol)) href = new URL("/account-deletion", base.origin).toString();
  } catch { /* A missing API configuration must not send the user to an unrelated site. */ }
  return <section aria-label="Account deletion" style={{ padding: compact ? "12px 0" : "20px", margin: "16px 0", borderRadius: 10, background: compact ? "transparent" : "#f4f1ff", lineHeight: 1.6 }}>
    {!compact && <><h3 style={{ marginTop: 0 }}>Account and data deletion</h3><p>Request deletion of your own account and associated data. Verify your email on the request page. Our team reviews the request and explains any records that must be retained. This does not immediately delete clinical records or close a facility.</p></>}
    {href ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#52489c", fontWeight: 650 }}>Request account deletion ↗</a> : <p>Account deletion is temporarily unavailable because the account service is not configured.</p>}
  </section>;
}
