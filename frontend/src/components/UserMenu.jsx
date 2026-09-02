import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";

export default function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <nav className="usermenu" aria-label="Konto">
        <Link to="/login" className="btn btn-secondary">
          Anmelden
        </Link>
        <Link to="/register" className="btn btn-primary">
          Registrieren
        </Link>
      </nav>
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="usermenu" aria-label="Konto">
      <span className="usermenu__user">{user && user.id ? `#${user.id}` : "Profil"}</span>
      <button type="button" className="btn btn-secondary" onClick={handleLogout}>
        Abmelden
      </button>
    </nav>
  );
}
