import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import io from 'socket.io-client';
import { useUser } from './context/UserContext';

import Landing from './landing';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

// Type for registration event
interface RegistrationEvent {
  role: string;
  fullName: string;
}

// Add this type above AppRoutes
interface DeletionRequestStatusEvent {
  status: string;
  requestedBy: number;
}

const socket = io(window.location.origin, { autoConnect: false, transports: ['websocket'] });

const MemberDashboard = React.lazy(() => import('./MemberDashboard'));
const History = React.lazy(() => import('./History'));
const Dashboard = React.lazy(() => import('./Dashboard'));
const Crud = React.lazy(() => import('./crud'));
const Requirements = React.lazy(() => import('./Requirements'));
const Transactions = React.lazy(() => import('./Transactions'));
const TransactionReport = React.lazy(() => import('./TransactionReport'));
const Approvals = React.lazy(() => import('./Approvals'));
const AttendanceList = React.lazy(() => import('./AttendanceList'));
const AttendanceConfig = React.lazy(() => import('./AttendanceConfig'));
const QRScanner = React.lazy(() => import('./QRScanner'));
const EventAttendanceReport = React.lazy(() => import('./EventAttendanceReport'));

const ADMIN_ROLES = ['adviser', 'president', 'officer'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, userRole, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = userRole?.toLowerCase() || '';
  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={ADMIN_ROLES}>{children}</ProtectedRoute>;
}

function AppRoutes() {
  const { user, userRole } = useUser();
  const userClubId = user?.club_id || null;

  useEffect(() => {
    if (userClubId) {
      let active = true;
      let socketToken = '';
      const joinClub = () => {
        if (socketToken) socket.emit('joinClub', { clubId: userClubId, token: socketToken });
      };
      const handleConnectError = () => {
        toast.warning('Live notifications are temporarily unavailable.', { toastId: 'socket-unavailable' });
      };

      socket.on('connect_error', handleConnectError);
      void fetch('/my-app-server/get_socket_token.php', { credentials: 'include' })
        .then(response => response.ok ? response.json() : Promise.reject(new Error('token unavailable')))
        .then(data => {
          if (!active) return;
          socketToken = data.token;
          socket.on('connect', joinClub);
          if (socket.connected) joinClub(); else socket.connect();
        })
        .catch(handleConnectError);

      socket.off('registration');
      socket.on('registration', ({ role, fullName }: RegistrationEvent) => {
        if (!['/login', '/register', '/landing'].includes(window.location.pathname)) {
          toast.info(`${role.charAt(0).toUpperCase() + role.slice(1)} ${fullName} has successfully registered!`, { autoClose: 6000 });
          window.dispatchEvent(new Event('member-registered'));
        }
      });

      // Listen for deletion request status changes
      socket.off('deletionRequestStatus');
      socket.on('deletionRequestStatus', (payload: DeletionRequestStatusEvent) => {
        const { status, requestedBy } = payload;
        // Only show toast if not on login/register/landing
        if (!['/login', '/register', '/landing'].includes(window.location.pathname)) {
          // Get current user id from user context
          const currentUserId = user?.user_id;
          const currentRole = userRole;
          if (String(requestedBy) === String(currentUserId)) {
            // Notify requester
            if (status === 'approved') {
              toast.success('Your deletion request was approved!', { autoClose: 6000 });
            } else if (status === 'denied') {
              toast.error('Your deletion request was denied.', { autoClose: 6000 });
            }
          } else if (["adviser", "president", "officer"].includes(currentRole || '')) {
            // Notify officers/adviser
            toast.info(`A deletion request was ${status}.`, { autoClose: 6000 });
          }
          // Trigger global event for all pages to refresh deletion requests
          window.dispatchEvent(new Event('deletion-request-status'));
        }
      });
      return () => {
        active = false;
        socket.off('registration');
        socket.off('deletionRequestStatus');
        socket.off('connect', joinClub);
        socket.off('connect_error', handleConnectError);
        socket.disconnect();
      };
    }
  }, [userRole, userClubId, user]);

  return (
    <>
      <ToastContainer position="top-center" />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-white">Loading...</div>}><Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />

        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            {userRole?.toLowerCase() === 'member' ? (
              <Suspense fallback={<div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">Loading...</div>}>
                <MemberDashboard />
              </Suspense>
            ) : (
              <Dashboard />
            )}
          </ProtectedRoute>
        } />

        <Route path="/members" element={<AdminRoute><Crud /></AdminRoute>} />
        <Route path="/requirements" element={<AdminRoute><Requirements /></AdminRoute>} />
        <Route path="/transactions" element={<AdminRoute><Transactions /></AdminRoute>} />
        <Route path="/reports/transaction-report" element={<AdminRoute><TransactionReport /></AdminRoute>} />
        <Route path="/reports/attendance-report" element={<AdminRoute><EventAttendanceReport /></AdminRoute>} />
        <Route path="/approvals" element={<ProtectedRoute allowedRoles={['adviser']}><Approvals /></ProtectedRoute>} />
        
        {/* Attendance Routes */}
        <Route path="/attendance/list" element={<AdminRoute><AttendanceList /></AdminRoute>} />
        <Route path="/attendance/config" element={<AdminRoute><AttendanceConfig /></AdminRoute>} />
        <Route path="/attendance/scan" element={<AdminRoute><QRScanner /></AdminRoute>} />
        <Route path="/history" element={<ProtectedRoute><Suspense fallback={<div>Loading...</div>}><History /></Suspense></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></Suspense>
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
