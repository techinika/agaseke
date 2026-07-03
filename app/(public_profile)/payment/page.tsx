import { Metadata } from "next";
import PaymentCallback from "@/components/parts/PaymentCallback";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function page() {
  return <PaymentCallback />;
}
