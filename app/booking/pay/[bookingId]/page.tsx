import { Metadata } from "next";
import PayClient from "./PayClient";

export const metadata: Metadata = {
  title: "Complete Booking Payment | Agaseke",
};

export default function Page() {
  return <PayClient />;
}
