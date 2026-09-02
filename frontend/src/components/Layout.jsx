import { Link, NavLink, Outlet } from "react-router-dom";
import UserMenu from "./UserMenu";

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="nav-header">
        <div className="container nav-header__inner">
          <Link to="/" className="nav-header__logo">
            Glamour Closet
          </Link>
          <nav className="nav-header__links" aria-label="Hauptnavigation">
            <NavLink to="/" end>
              Garderobe
            </NavLink>
            <NavLink to="/outfits">Outfits</NavLink>
            <NavLink to="/outfit-creator">Outfit-Creator</NavLink>
          </nav>
          <UserMenu />
        </div>
      </header>

      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <span className="footer__brand">Glamour Closet</span>
          <nav className="footer__links" aria-label="Rechtliches">
            <Link to="/impressum">Impressum</Link>
            <Link to="/datenschutz">Datenschutzerklärung</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
