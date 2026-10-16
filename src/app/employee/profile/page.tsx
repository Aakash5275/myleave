import { ProfileForms } from "@/components/employee-forms";
import { PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("EMPLOYEE");
  const facts = [
    ["Employee ID", user.employeeCode],
    ["Email", user.email],
    ["Department", user.department],
    ["Job title", user.jobTitle],
    ["Hire date", formatDate(user.hireDate)],
    ["Status", user.status],
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title={`${user.firstName} ${user.lastName}`} description="Work details are managed by HR. You can update contact information and your password." />
      <Panel>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-mist">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
      <ProfileForms
        phone={user.phone}
        address={user.address}
        emergencyName={user.emergencyName}
        emergencyPhone={user.emergencyPhone}
      />
    </div>
  );
}
