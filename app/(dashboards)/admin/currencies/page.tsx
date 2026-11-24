import { redirect } from "next/navigation";

export default function AdminCurrenciesRedirectPage() {
  redirect("/admin/config");
}
