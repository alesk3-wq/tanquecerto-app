import { useState } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StationDetails from './pages/StationDetails';
import AddReport from './pages/AddReport';
import AddStation from './pages/AddStation';
import AddRefuel from './pages/AddRefuel';
import Profile from './pages/Profile';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#060d1f] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 sidebar-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
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

          {/* Páginas com sidebar */}
          <Route element={<AppLayout />}>
            <Route path="/"                    element={<Home />} />
            <Route path="/stations/:id"        element={<StationDetails />} />
            <Route path="/stations/:id/report"  element={<AddReport />} />
            <Route path="/stations/:id/refuel"  element={<AddRefuel />} />
            <Route path="/add-station"         element={<AddStation />} />
            <Route path="/profile"             element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
