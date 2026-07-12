import { Metadata } from "next";
import ProductForm from "@/components/parts/dashboard/ProductForm";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewProductPage() {
  return <ProductForm />;
}
