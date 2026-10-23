UPDATE "Payslip"
SET
  "netPay" = "basic" + "allowances" - "tax",
  "overtime" = 0,
  "deductions" = 0;
