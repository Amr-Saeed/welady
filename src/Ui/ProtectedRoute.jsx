import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getAccountById } from "../Services/apiAuth";

export default function ProtectedRoute({ children, allowedRole }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      setChecking(true);
      const sessionUser = await getCurrentUser();
      if (!sessionUser) {
        navigate("/", { replace: true });
        setLoading(false);
        setChecking(false);
        return;
      }
      // Fetch user role from users table
      const dbUser = await getAccountById(sessionUser.id);
      if (!dbUser || (allowedRole && dbUser.role !== allowedRole)) {
        navigate("/", { replace: true });
      } else {
        setChecking(false);
      }
      setLoading(false);
    }
    checkAuth();
    // eslint-disable-next-line
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">جاري التحقق...</p>
      </div>
    );
  }

  return children;
}
