import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth-context";

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
  marginBottom: "var(--space-3)",
};

const labelStyle = {
  fontSize: "0.9rem",
  color: "var(--color-muted)",
};

const errorStyle = {
  color: "var(--color-danger)",
  fontSize: "14px",
  padding: "var(--space-1) 0",
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Bitte E-Mail-Adresse und Passwort eingeben.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Registrierung fehlgeschlagen.");
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <h1>Registrieren</h1>
      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 420 }}>
        <div style={fieldStyle}>
          <label htmlFor="register-email" style={labelStyle}>
            E-Mail
          </label>
          <input
            id="register-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="register-password" style={labelStyle}>
            Passwort
          </label>
          <input
            id="register-password"
            type="password"
            className="input"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />
        </div>
        {error ? (
          <p role="alert" style={errorStyle}>
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Registrieren …" : "Registrieren"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "var(--space-4)" }}>
        Bereits registriert? <Link to="/login">Anmelden</Link>
      </p>
    </section>
  );
}
