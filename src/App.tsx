import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Users from './pages/Users';
import Services from './pages/Services';
import UserServices from './pages/UserServices';
import Withdraws from './pages/Withdraws';
import Spool from './pages/Spool';
import Pays from './pages/Pays';
import Servers from './pages/Servers';
import Templates from './pages/Templates';
import Config from './pages/Config';
import Promo from './pages/Promo';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Profiles from './pages/Profiles';
import Bonuses from './pages/Bonuses';
import Storage from './pages/Storage';
import Events from './pages/Events';
import ServerGroups from './pages/ServerGroups';
import Identities from './pages/Identities';
import SpoolHistory from './pages/SpoolHistory';
import Branding from './pages/Branding';
import Appearance from './pages/Appearance';
import CacheSettings from './pages/CacheSettings';
import SHMCloud from './pages/SHMCloud';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    const handleToastClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const toastDiv = target.closest('.toast-with-close');
      if (toastDiv) {
        const rect = target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        if (clickX > width - 40) {
          toast.dismiss();
        }
      }
    };

    document.addEventListener('click', handleToastClick);
    return () => document.removeEventListener('click', handleToastClick);
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#22d3ee',
              secondary: '#1e293b',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#1e293b',
            },
          },
          className: 'toast-with-close',
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="users" element={<Users />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="user-services" element={<UserServices />} />
          <Route path="withdraws" element={<Withdraws />} />
          <Route path="pays" element={<Pays />} />
          <Route path="bonuses" element={<Bonuses />} />
          <Route path="storage" element={<Storage />} />
          <Route path="promo" element={<Promo />} />
          <Route path="services" element={<Services />} />
          <Route path="events" element={<Events />} />
          <Route path="servers" element={<Servers />} />
          <Route path="server-groups" element={<ServerGroups />} />
          <Route path="identities" element={<Identities />} />
          <Route path="spool" element={<Spool />} />
          <Route path="spool-history" element={<SpoolHistory />} />
          <Route path="templates" element={<Templates />} />
          <Route path="config" element={<Config />} />
          <Route path="branding" element={<Branding />} />
          <Route path="appearance" element={<Appearance />} />
          <Route path="cache" element={<CacheSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
