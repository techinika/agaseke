import { Metadata } from "next";
import AdminComms from "@/components/pages/Dashboards/Admin/AdminCommunication";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function page() {
  return <AdminComms />;
}
