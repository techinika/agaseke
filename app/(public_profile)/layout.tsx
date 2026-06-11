import Navbar from "@/components/parts/Navigation";
import Footer from "@/components/parts/Footer";

export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-orange-100">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
