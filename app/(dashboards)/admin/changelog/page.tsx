import { redirect } from "next/navigation";

export default function AdminChangelogRedirectPage() {
  redirect("/admin/comms?tab=changelog");
}
