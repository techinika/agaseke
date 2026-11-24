import { redirect } from "next/navigation";

export default function AdminCategoriesRedirectPage() {
  redirect("/admin/config?tab=categories");
}
