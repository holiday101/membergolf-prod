import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth";

export default function LogoutButton({ className }: { className?: string }) {
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <button type="button" className={className} onClick={logout}>
      Log out
    </button>
  );
}

