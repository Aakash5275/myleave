import { requireSelf } from "@/lib/auth";
import { monthKeys } from "@/lib/format";
import { buildPayslipPdf, type PayslipFigures } from "@/lib/payslip-pdf";
import { prisma } from "@/lib/prisma";

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const user = await requireSelf();
  const month = new URL(request.url).searchParams.get("month") ?? "";
  const range = monthKeys(month);
  if (!range) return new Response("Choose a month.", { status: 400 });

  const issued = await prisma.payslip.findFirst({
    where: { userId: user.id, year: range.year, month: range.month, status: "Issued" },
  });
  const basic = issued?.basic ?? user.salary;
  const allowances = issued?.allowances ?? 0;
  const tax = issued?.tax ?? 0;
  const slip: PayslipFigures = {
    month: range.month,
    year: range.year,
    basic,
    allowances,
    tax,
    netPay: basic + allowances - tax,
    status: issued?.status ?? "Standard",
    notes: issued ? issued.notes : "Standard monthly pay from salary.",
  };
  const bytes = await buildPayslipPdf(user, slip);
  const filename = `payslip-${user.employeeCode}-${range.year}-${String(range.month).padStart(2, "0")}.pdf`;
  return pdfResponse(bytes, filename);
}
