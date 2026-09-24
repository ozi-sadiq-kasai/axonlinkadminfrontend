export const ROLE_SCREEN_ACCESS = Object.freeze({
  SUPER_ADMIN: ["dashboard", "users", "referrals", "activities", "reports", "role-access", "system-control", "communication", "profile", "deletion-requests"],
  ADMIN: ["dashboard", "referrals", "activities", "communication", "profile"],
  SUPPORT: ["dashboard", "users", "activities", "communication", "profile"],
  AUDITOR: ["dashboard", "users", "system-control", "profile"],
});

const USER_SCREENS = new Set(["patients", "specialists", "facilities"]);

export function permissionScreen(screen) {
  return USER_SCREENS.has(screen) ? "users" : screen;
}

export function canAccessScreen(role, screen) {
  return Boolean(role && ROLE_SCREEN_ACCESS[role]?.includes(permissionScreen(screen)));
}

export function visibleForRole(role, items) {
  return items.filter((item) => canAccessScreen(role, item.screen));
}
