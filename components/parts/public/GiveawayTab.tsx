import { Star } from "lucide-react";
import { ProtectedSection } from "./ProtectedSection";

export const GiveawayTab = ({
  isLoggedIn,
  setIsModalOpen,
}: {
  isLoggedIn: boolean;
  setIsModalOpen: any;
}) => {
  return (
    <div className="animate-in fade-in">
      {!isLoggedIn ? (
        <ProtectedSection
          isLoggedIn={false}
          hasGifted={false}
          type="login"
          setIsModalOpen={setIsModalOpen}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-linear-to-br from-orange-600 to-orange-400 p-8 rounded-2xl text-white shadow-xl">
            <Star className="mb-4" fill="white" />
            <h3 className="text-2xl font-bold">Supporter Giveaways</h3>
            <p className="opacity-90">
              Only supporters appear on the wheel. The more you gift, the higher
              your chances.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
