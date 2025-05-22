import React, { useEffect, useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';
import ReactDOM from 'react-dom';

import Landing from './landing';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import Dashboard from './Dashboard';
import Crud from './crud';
import Requirements from './Requirements';
import Transactions from './Transactions';
import TransactionReport from './TransactionReport';
import Approvals from './Approvals';

// Type for registration event
interface RegistrationEvent {
  role: string;
  fullName: string;
}

const socket = io('http://localhost:3001', { autoConnect: false });

const MemberDashboard = React.lazy(() => import('./MemberDashboard'));

function AppRoutes() {
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userClubId, setUserClubId] = useState<number | null>(null);

  useEffect(() => {
    fetch('http://localhost/my-app-server/get_current_user.php', { credentials: 'include' })
      .then(res => res.json())
      .then(user => {
        setUserRole(user && user.role ? user.role.toLowerCase() : null);
        setUserClubId(user && user.club_id ? user.club_id : null);
      })
      .catch(() => {
        setUserRole(null);
        setUserClubId(null);
      });
  }, []);

  useEffect(() => {
    if (userClubId) {
      if (!socket.connected) socket.connect();
      socket.emit('joinClub', userClubId);

      socket.off('registration');
      socket.on('registration', ({ role, fullName }: RegistrationEvent) => {
        if (!['/login', '/register', '/landing'].includes(location.pathname)) {
          toast.info(`${role.charAt(0).toUpperCase() + role.slice(1)} ${fullName} has successfully registered!`, { autoClose: 6000 });
          window.dispatchEvent(new Event('member-registered'));
        }
      });
    }
  }, [location.pathname, userRole, userClubId]);

  return (
    <>
      <ToastContainer position="top-center" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />

        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />

        <Route path="/dashboard" element={
          userRole === 'member' ? (
            <Suspense fallback={<div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">Loading...</div>}>
              <MemberDashboard />
            </Suspense>
          ) : (
            <Dashboard />
          )
        } />

        <Route path="/members" element={<Crud />} />
        <Route path="/requirements" element={<Requirements />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/reports/transaction-report" element={<TransactionReport />} />
        <Route path="/approvals" element={<Approvals />} />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;