export const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Finance",
  "People",
  "Sales",
  "Operations",
] as const;

export const OTHER_DEPARTMENT = "Other";

export function departmentOptions(extra: string[] = []) {
  const known = new Set<string>(DEPARTMENTS);
  const custom = extra.filter((item) => item && !known.has(item)).sort((a, b) => a.localeCompare(b));
  return [...DEPARTMENTS, ...custom];
}

export const LEAVE_TYPES = ["Unpaid"] as const;

export const LEAVE_ALLOWANCE: Record<(typeof LEAVE_TYPES)[number], number> = {
  Unpaid: 0,
};

export const ACCOUNT_ROLES = ["EMPLOYEE", "MANAGER", "ACCOUNTANT"] as const;

export const PAYABLE_ROLES = ["EMPLOYEE", "MANAGER", "ACCOUNTANT"] as const;

export function roleLabel(role: string) {
  if (role === "ADMIN") return "Admin";
  if (role === "MANAGER") return "Manager";
  if (role === "ACCOUNTANT") return "Accountant";
  return "Employee";
}

export const REQUEST_STATUSES = [
  "Pending",
  "In Progress",
  "Approved",
  "Rejected",
  "Resolved",
] as const;

export const HR_CATEGORIES = [
  "Payroll",
  "Benefits",
  "Workplace",
  "Policy",
  "IT Access",
  "Other",
] as const;

export const DOC_TYPES = [
  "Employment Verification",
  "Salary Certificate",
  "Experience Letter",
  "Address Proof",
  "Tax Statement",
  "No Objection Certificate",
] as const;

export const PRIORITIES = ["Low", "Medium", "High"] as const;

export const ATTENDANCE_STATUSES = [
  "Present",
  "Late",
  "Half Day",
  "Absent",
  "On Leave",
] as const;

export const EMPLOYEE_STATUSES = ["Active", "Inactive"] as const;

export function isOneOf<T extends string>(
  value: string,
  list: readonly T[],
): value is T {
  return (list as readonly string[]).includes(value);
}
