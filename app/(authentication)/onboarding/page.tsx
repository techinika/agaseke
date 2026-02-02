import AuthGuard from "@/auth/AuthGuard";
import CreatorOnboarding from "@/components/pages/StartPage";

function page() {
  return (
    <AuthGuard>
      <CreatorOnboarding />
    </AuthGuard>
  );
}

export default page;
