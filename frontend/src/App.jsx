import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import BottomNav from './components/BottomNav';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import RootRoute from './components/RootRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConfirmEmail from './pages/ConfirmEmail';
import Install from './pages/Install';
import StationDetails from './pages/StationDetails';
import AddReport from './pages/AddReport';
import AddServiceReview from './pages/AddServiceReview';
import AddStation from './pages/AddStation';
import AddRefuel from './pages/AddRefuel';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

function AppLayout() {
  return (
    <div className="flex h-dvh bg-navy-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 sidebar-main">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Páginas sem sidebar */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password"       element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/confirm-email/:token"  element={<ConfirmEmail />} />
          <Route path="/instalar" element={<Install />} />

          {/* Raiz: apresentação pra quem não está logado, mapa pra quem está */}
          <Route path="/" element={<RootRoute />} />

          {/* Páginas com sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/mapa"         element={<Home />} />
            <Route path="/stations/:id" element={<StationDetails />} />

            {/* Rotas que exigem login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/stations/:id/report" element={<AddReport />} />
              <Route path="/stations/:id/service-review" element={<AddServiceReview />} />
              <Route path="/stations/:id/refuel" element={<AddRefuel />} />
              <Route path="/add-station"         element={<AddStation />} />
              <Route path="/profile"             element={<Profile />} />
            </Route>

            {/* Painel administrativo — o portão de verdade é o backend */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
