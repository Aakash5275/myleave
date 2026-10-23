import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireRoles(["ACCOUNTANT", "ADMIN"]);
  const { id } = await context.params;
  const document = await prisma.payrollDocument.findUnique({ where: { id } });
  if (!document) return new Response("Not found", { status: 404 });
  const fileName = document.fileName.replace(/["\r\n]/g, "") || "pay-document";
  return new Response(Buffer.from(document.data), {
    headers: {
      "Content-Type": document.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
