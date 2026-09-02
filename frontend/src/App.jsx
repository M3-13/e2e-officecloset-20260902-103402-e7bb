import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/auth-context";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import WardrobePage from "./pages/WardrobePage";
import OutfitsPage from "./pages/OutfitsPage";
import OutfitCreatorPage from "./pages/OutfitCreatorPage";
import ImpressumPage from "./pages/ImpressumPage";
import DatenschutzPage from "./pages/DatenschutzPage";

function ProtectedRoute() {
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<DatenschutzPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<WardrobePage />} />
              <Route path="/outfits" element={<OutfitsPage />} />
              <Route path="/outfit-creator" element={<OutfitCreatorPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
