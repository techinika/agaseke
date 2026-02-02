import AuthGuard from "@/auth/AuthGuard";
import AdminDashboard from "@/components/pages/Dashboards/AdminPage";

function page() {
  return (
    <AuthGuard>
      <AdminDashboard />
    </AuthGuard>
  );
}

export default page;
