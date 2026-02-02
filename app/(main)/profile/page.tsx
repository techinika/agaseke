import AuthGuard from "@/auth/AuthGuard";
import ProfileEditPage from "@/components/pages/ProfilePage";

function page() {
  return (
    <AuthGuard>
      <ProfileEditPage />
    </AuthGuard>
  );
}

export default page;
