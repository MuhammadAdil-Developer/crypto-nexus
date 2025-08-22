import { AdminLayout } from "@/components/admin/AdminLayout";
import { Overview } from "@/components/admin/Overview";

export default function AdminDashboard() {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Overview" }
  ];

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <Overview />
    </AdminLayout>
  );
}
