import PayoutPolicy from "@/components/pages/Legal/PayoutPolicyPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payout Policy | Agaseke for Creators",
  description:
    "Learn how and when creators receive their funds on Agaseke for Creators.",
};

export default function page() {
  return <PayoutPolicy />;
}
