import { requireUser } from "@/lib/auth";
import { SAMPLE_PAYSLIP, buildPayslipPdf } from "@/lib/payslip-pdf";

export async function GET() {
  await requireUser("ADMIN");
  const bytes = await buildPayslipPdf(SAMPLE_PAYSLIP.employee, SAMPLE_PAYSLIP.slip);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="payslip-sample.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
