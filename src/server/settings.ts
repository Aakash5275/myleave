import { ORG_SETTING_ID } from "@/lib/geo";
import { prisma } from "@/lib/prisma";

export async function attendanceEnabled() {
  const policy = await prisma.orgSetting.findUnique({
    where: { id: ORG_SETTING_ID },
    select: { attendanceEnabled: true },
  });
  return policy?.attendanceEnabled !== false;
}
