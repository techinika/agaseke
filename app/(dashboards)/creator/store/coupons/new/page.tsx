import { Metadata } from "next";
import CouponForm from "@/components/parts/dashboard/CouponForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewCouponPage() {
  return <CouponForm />;
}
