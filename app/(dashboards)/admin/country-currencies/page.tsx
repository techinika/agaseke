import { redirect } from "next/navigation";

export default function AdminCountryCurrenciesRedirectPage() {
  redirect("/admin/config?tab=country-currencies");
}
