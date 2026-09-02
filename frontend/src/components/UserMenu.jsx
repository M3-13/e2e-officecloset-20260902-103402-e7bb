import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--space-4)",
  background: "rgba(0, 0, 0, 0.65)",
  backdropFilter: "blur(4px)",
  zIndex: 100,
};

const panelStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  maxWidth: 520,
  width: "100%",
  padding: "var(--space-4)",
  boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
};

const actionsStyle = {
  display: "flex",
  gap: "var(--space-2)",
  justifyContent: "flex-end",
  marginTop: "var(--space-4)",
};

const errorStyle = {
  color: "var(--color-danger)",
  fontSize: "14px",
  padding: "var(--space-1) 0",
};

export default function UserMenu() {
  const { user, isAuthenticated, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      navigate("/register");
    } catch (err) {
      setError(err.message || "Konto konnte nicht gelöscht werden.");
      setDeleting(false);
    }
  };

  return (
    <nav className="usermenu" aria-label="Konto">
      <span className="usermenu__user">
        {user && user.id ? `#${user.id}` : "Profil"}
      </span>
      <button type="button" className="btn btn-secondary" onClick={handleLogout}>
        Abmelden
      </button>
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => setConfirming(true)}
      >
        Konto löschen
      </button>

      {confirming ? (
        <div
          className="modal"
          style={overlayStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onClick={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setConfirming(false);
            }
          }}
        >
          <div style={panelStyle}>
            <h2 id="delete-account-title" style={{ marginBottom: "var(--space-2)" }}>
              Konto löschen?
            </h2>
            <p className="muted">
              Dein Konto und alle zugehörigen Daten (Profil, Kleidungsstücke,
              Outfits und hochgeladene Bilder) werden dauerhaft gelöscht. Dieser
              Schritt kann nicht rückgängig gemacht werden.
            </p>
            {error ? (
              <p role="alert" style={errorStyle}>
                {error}
              </p>
            ) : null}
            <div style={actionsStyle}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Löschen …" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
