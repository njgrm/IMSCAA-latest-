import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// WebSocket first, with HTTP long-polling as a fallback for networks that block it.
// Trying polling first would add request churn on every navigation.
const socket = io(window.location.origin, { autoConnect: false, transports: ['websocket', 'polling'] });

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
const SOCKET_CONNECTION_TOAST_ID = 'socket-connection-unavailable';
const SOCKET_AUTH_TOAST_ID = 'socket-auth-unavailable';

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
  const { pathname } = useLocation();
  const userClubId = user?.club_id || null;

  useEffect(() => {
    const titles: Record<string, string> = { '/':'IMSCCA','/landing':'IMSCCA','/login':'Sign In | IMSCCA','/register':'Register | IMSCCA','/dashboard':'Dashboard | IMSCCA','/members':'Members | IMSCCA','/requirements':'Requirements | IMSCCA','/transactions':'Transactions | IMSCCA','/attendance/list':'Attendance List | IMSCCA','/attendance/config':'Attendance Configuration | IMSCCA','/attendance/scan':'QR Scanner | IMSCCA','/approvals':'Approvals | IMSCCA','/reports/attendance-report':'Attendance Report | IMSCCA','/reports/transaction-report':'Transaction Report | IMSCCA','/history':'History | IMSCCA' };
    document.title = titles[pathname] || 'IMSCCA';
  }, [pathname]);

  useEffect(() => {
    if (userClubId) {
      let active = true;
      const dismissSocketWarnings = () => {
        toast.dismiss(SOCKET_CONNECTION_TOAST_ID);
        toast.dismiss(SOCKET_AUTH_TOAST_ID);
      };
      const reportAuthFailure = (status?: number) => {
        if (!active) return;
        const message = status === 401
          ? 'Your live-update session expired. Refresh the page or sign in again; other features still work.'
          : 'Live updates could not be authorized. Other features still work; refresh to retry.';
        toast.warning(message, { toastId: SOCKET_AUTH_TOAST_ID, autoClose: 8000 });
      };
      // Fetches a fresh token on every join. Tokens expire after five minutes, so
      // reusing the one fetched at mount would silently drop every later reconnect.
      const joinClub = async () => {
        dismissSocketWarnings();
        try {
          const response = await fetch('/my-app-server/get_socket_token.php', { credentials: 'include' });
          if (!response.ok) {
            reportAuthFailure(response.status);
            return;
          }
          const data = await response.json();
          if (!active) return;
          socket.emit('joinClub', { clubId: userClubId, token: data.token }, (ack?: { ok?: boolean }) => {
            if (!active || ack?.ok) return;
            reportAuthFailure();
          });
        } catch {
          reportAuthFailure();
        }
      };
      const handleConnectError = () => {
        toast.warning('Live updates are disconnected. Other features still work while IMSCCA reconnects.', {
          toastId: SOCKET_CONNECTION_TOAST_ID,
          autoClose: 6000,
        });
      };

      socket.on('connect', joinClub);
      socket.on('connect_error', handleConnectError);
      if (socket.connected) void joinClub(); else socket.connect();

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
