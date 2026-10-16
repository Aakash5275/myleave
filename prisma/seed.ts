import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { parseKey, todayKey } from "../src/lib/format";
import { cleanEmail, validPassword } from "../src/lib/validate";

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", status: "Active" },
  });
  if (existingAdmin) {
    console.log("An active admin already exists. No accounts were created.");
    return;
  }

  const email = cleanEmail(process.env.INITIAL_ADMIN_EMAIL ?? "");
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "";
  const fullName = (process.env.INITIAL_ADMIN_NAME ?? "").trim().replace(/\s+/g, " ");
  if (!email || !validPassword(password) || fullName.length < 2) {
    throw new Error(
      "Set INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, and INITIAL_ADMIN_PASSWORD (8–72 characters, with a letter and a number) before creating the first admin.",
    );
  }

  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ") || "Admin";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      employeeCode: "ML-1000",
      firstName,
      lastName,
      department: "People",
      jobTitle: "Administrator",
      hireDate: parseKey(todayKey()),
      status: "Active",
    },
  });

  console.log(`Created the first admin for ${email}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
