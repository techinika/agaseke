import { Metadata } from "next";
import PayClient from "./PayClient";
import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PayStoreOrderPage() {
  return (
    <>
      <Navbar />
      <PayClient />
      <Footer />
    </>
  );
}
