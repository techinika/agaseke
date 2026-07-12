import { Metadata } from "next";
import OrderForm from "@/components/parts/dashboard/OrderForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewOrderPage() {
  return <OrderForm />;
}
