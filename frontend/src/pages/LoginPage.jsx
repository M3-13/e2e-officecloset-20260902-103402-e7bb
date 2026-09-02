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

export default function LoginPage() {
  const { login } = useAuth();
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
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Anmeldung fehlgeschlagen.");
      setLoading(false);
    }
  };

  return (
    <section className="page">
      <h1>Anmelden</h1>
      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 420 }}>
        <div style={fieldStyle}>
          <label htmlFor="login-email" style={labelStyle}>
            E-Mail
          </label>
          <input
            id="login-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
          />
        </div>
        <div style={fieldStyle}>
          <label htmlFor="login-password" style={labelStyle}>
            Passwort
          </label>
          <input
            id="login-password"
            type="password"
            className="input"
            autoComplete="current-password"
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
          {loading ? "Anmelden …" : "Anmelden"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "var(--space-4)" }}>
        Noch kein Konto? <Link to="/register">Registrieren</Link>
      </p>
    </section>
  );
}
