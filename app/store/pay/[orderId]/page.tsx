import { Metadata } from "next";
import PayClient from "./PayClient";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PayStoreOrderPage() {
  return <PayClient />;
}