"use server";

import { requireUser } from "@/lib/auth";
import { PAYABLE_ROLES } from "@/lib/constants";
import { extractPay, type PayDraft } from "@/lib/payroll-extract";
import { prisma } from "@/lib/prisma";
import { cleanText, parseAmount } from "@/lib/validate";
import { refresh } from "@/server/notify";

const MAX_BYTES = 4 * 1024 * 1024;

async function documentText(name: string, type: string, bytes: Uint8Array) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".doc") && !lower.endsWith(".docx")) {
    return { error: "Older .doc files cannot be read. Save the file as PDF or .docx and upload it again." };
  }
  if (lower.endsWith(".pdf") || type === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n") : String(result.text ?? "");
    return { text, mimeType: "application/pdf" };
  }
  if (lower.endsWith(".docx") || type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return {
      text: result.value ?? "",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }
  return { error: "Upload a PDF or a Word document (.docx)." };
}

export async function importPayDocument(formData: FormData): Promise<
  { error: string } | { draft: PayDraft; fileName: string; empty: boolean }
> {
  const accountant = await requireUser("ACCOUNTANT");
  const file = formData.get("file");
  const preferredId = cleanText(formData.get("userId"), 40);
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or Word document." };
  if (file.size > MAX_BYTES) return { error: "Use a file smaller than 4 MB." };

  let read: { error: string } | { text: string; mimeType: string };
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    read = await documentText(file.name, file.type, bytes);
  } catch (error) {
    console.error(error);
    return { error: "Could not read that file. Try a PDF with selectable text, or a .docx file." };
  }
  if ("error" in read) return read;

  const text = read.text.replace(/\u0000/g, "").trim();
  const people = await prisma.user.findMany({
    where: { role: { in: [...PAYABLE_ROLES] }, status: "Active" },
    select: { id: true, firstName: true, lastName: true, employeeCode: true, salary: true },
    orderBy: { firstName: "asc" },
  });
  if (!people.length) return { error: "There is nobody to attach this document to." };
  const draft = extractPay(text, people, people.some((person) => person.id === preferredId) ? preferredId : "");
  if (!draft.userId) return { error: "Choose an employee for this document." };

  const safeName = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "pay-document";
  await prisma.payrollDocument.create({
    data: {
      userId: draft.userId,
      uploadedById: accountant.id,
      fileName: safeName,
      mimeType: read.mimeType,
      data: Buffer.from(bytes),
      extractedText: text.slice(0, 20000),
    },
  });
  refresh();
  return { draft, fileName: safeName, empty: text.length < 8 };
}

export async function updateSalary(formData: FormData) {
  await requireUser("ACCOUNTANT");
  const id = cleanText(formData.get("id"), 40);
  const salary = parseAmount(formData.get("salary"));
  if (salary === null) return { error: "Enter a salary of zero or more." };
  const person = await prisma.user.findFirst({
    where: { id, role: { in: [...PAYABLE_ROLES] } },
    select: { id: true },
  });
  if (!person) return { error: "Employee not found." };
  await prisma.user.update({ where: { id }, data: { salary } });
  refresh();
  return {};
}
