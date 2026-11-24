import { redirect } from "next/navigation";

export default function AdminFeedbackRedirectPage() {
  redirect("/admin/comms?tab=feedback");
}
