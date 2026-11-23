import { redirect } from "next/navigation";

export default function VerifyRedirectPage() {
  redirect("/creator/settings?tab=verification");
}
