import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatMonth, fullName } from "@/lib/format";

export type PayslipPerson = {
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
  jobTitle: string;
};

export type PayslipFigures = {
  month: number;
  year: number;
  basic: number;
  allowances: number;
  overtime: number;
  deductions: number;
  tax: number;
  netPay: number;
  status: string;
  notes: string;
};

export const SAMPLE_PAYSLIP: { employee: PayslipPerson; slip: PayslipFigures } = {
  employee: {
    firstName: "Sample",
    lastName: "Employee",
    employeeCode: "ML-0000",
    department: "People",
    jobTitle: "Staff",
  },
  slip: {
    month: 10,
    year: 2026,
    basic: 40000,
    allowances: 5000,
    overtime: 2000,
    deductions: 2000,
    tax: 1500,
    netPay: 43500,
    status: "Standard",
    notes: "Sample only. Every payslip uses this layout.",
  },
};

function inr(value: number) {
  const amount = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  return `INR ${amount}`;
}

function clip(value: string, max: number) {
  const clean = value.replace(/[^\x20-\x7E]/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}.` : clean;
}

export async function buildPayslipPdf(employee: PayslipPerson, slip: PayslipFigures) {
  const doc = await PDFDocument.create();
  const period = new Date(Date.UTC(slip.year, slip.month - 1, 1));
  doc.setTitle(`Payslip ${slip.year}-${String(slip.month).padStart(2, "0")}`);
  doc.setCreator("MyLeave");
  doc.setProducer("MyLeave");
  doc.setCreationDate(period);
  doc.setModificationDate(period);
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.12, 0.16);
  const mist = rgb(0.38, 0.42, 0.48);
  const teal = rgb(0.05, 0.45, 0.45);
  const line = rgb(0.86, 0.88, 0.9);
  const gross = slip.basic + slip.allowances + slip.overtime;
  const taken = slip.deductions + slip.tax;

  page.drawRectangle({ x: 36, y: 36, width: 523, height: 770, borderColor: line, borderWidth: 1 });
  page.drawText("MYLEAVE", { x: 56, y: 760, size: 11, font: bold, color: teal });
  page.drawText("Payslip", { x: 56, y: 732, size: 22, font: bold, color: ink });
  page.drawText(clip(formatMonth(slip.year, slip.month), 40), { x: 56, y: 710, size: 12, font, color: mist });
  page.drawText(clip(slip.status, 20), { x: 430, y: 732, size: 12, font: bold, color: ink });

  const identity = [
    ["Employee", fullName(employee)],
    ["Employee ID", employee.employeeCode],
    ["Job", employee.jobTitle],
    ["Department", employee.department],
  ];
  identity.forEach(([label, value], index) => {
    const y = 670 - index * 18;
    page.drawText(label, { x: 56, y, size: 10, font, color: mist });
    page.drawText(clip(value, 42), { x: 160, y, size: 11, font: bold, color: ink });
  });

  page.drawLine({ start: { x: 56, y: 590 }, end: { x: 539, y: 590 }, thickness: 1, color: line });

  const rows: Array<[string, string, boolean]> = [
    ["Earnings", "", true],
    ["Basic", inr(slip.basic), false],
    ["Allowances", inr(slip.allowances), false],
    ["Overtime", inr(slip.overtime), false],
    ["Gross", inr(gross), true],
    ["", "", false],
    ["Deductions", "", true],
    ["Deductions", inr(slip.deductions), false],
    ["Tax", inr(slip.tax), false],
    ["Total deductions", inr(taken), true],
  ];
  rows.forEach(([label, value, strong], index) => {
    if (!label) return;
    const y = 566 - index * 20;
    page.drawText(label, { x: 56, y, size: 11, font: strong ? bold : font, color: strong ? ink : mist });
    if (value) page.drawText(value, { x: 400, y, size: 11, font: strong ? bold : font, color: ink });
  });

  page.drawRectangle({ x: 56, y: 300, width: 483, height: 42, color: rgb(0.95, 0.95, 0.93) });
  page.drawText("Net pay", { x: 72, y: 316, size: 13, font: bold, color: ink });
  page.drawText(inr(slip.netPay), { x: 390, y: 316, size: 14, font: bold, color: ink });

  if (slip.notes) {
    page.drawText(clip(slip.notes, 90), { x: 56, y: 270, size: 10, font, color: mist });
  }
  page.drawText("Generated for this month. The file is not kept on the server.", {
    x: 56,
    y: 56,
    size: 9,
    font,
    color: mist,
  });

  return doc.save();
}
