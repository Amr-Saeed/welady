import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useParentProfile } from "../Features/Parents/useParentProfile";
import Button from "../Ui/Button";
import ChildCards from "../Ui/ChildCards";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { data: parentProfile, isLoading, error } = useParentProfile();

  // Check if user is authenticated
  useEffect(() => {
    if (error) {
      // If there's an error fetching profile, user is likely not authenticated
      navigate("/login/parents", { replace: true });
    }
  }, [error, navigate]);

  // Function to get the correct title based on relationship
  const getTitle = () => {
    if (!parentProfile) return "أستاذ/ة";

    const { relationship } = parentProfile;

    // Use masculine title for father and brother
    if (relationship === "father" || relationship === "brother") {
      return "أستاذ";
    }

    // Use feminine title for mother and sister
    if (relationship === "mother" || relationship === "sister") {
      return "أستاذة";
    }

    return "أستاذة"; // Default
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">
          أهلًا {getTitle()} {parentProfile?.name}
        </h2>
        <p className="mb-4">دلوقتي هتقدر تسيطر علي دروس أطفالك بسهولة</p>
      </div>
      {/* Display children cards */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-4">أطفالك</h3>
        <ChildCards />
      </div>

      <Button
        onClick={() => navigate("/parent/add-child")}
        className="flex  items-center justify-center bg-blue-500 hover:bg-blue-600 text-white text-2xl px-4 py-2 rounded-lg w-full mb-6"
      >
        إضافة طفل +
      </Button>

      <Button
        onClick={() => navigate("/parent/join-group")}
        className="flex  items-center justify-center bg-purple-500 hover:bg-purple-600 text-white text-2xl px-4 py-2 rounded-lg w-full"
      >
        الانضمام لمجموعة
      </Button>
    </div>
  );
}
