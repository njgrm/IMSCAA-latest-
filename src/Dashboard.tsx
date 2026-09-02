import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import headerlogo from './assets/headerlogo.png';
import headerlogoDark from './assets/headerlogoDark.png';
import Sidebar from './components/Sidebar';
import { ThemeContext } from './theme/ThemeContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QRCodeDisplay from './components/QRCodeDisplay';
import placeholderImage from './assets/questionPlaceholder.png';

interface QRCodeData {
  qr_id: number;
  qr_code_data: string;
  generated_at: string;
  is_active: boolean;
}

interface Transaction {
  transaction_id: number;
  user_id: number;
  requirement_id: number;
  amount_due: number;
  amount_paid: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_method: string | null;
  due_date: string;
  verified_by: number;
  date_added: string;
  fee_description: string;
}

interface User {
  user_id: number;
  username: string;
  user_fname: string;
  user_lname: string;
  school_id: string;
  avatar: string;    
  course: string;
  year: number;
  section: string;
  email?: string;
  role?: string;
}

interface Requirement {
  requirement_id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  requirement_type: string;
  status: string;
  club_id: number;
  amount_due: number;
  req_picture: string;
  date_added: string;
}

interface TimeSlot {
  slot_id: number;
  requirement_id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  date: string;
  is_active: boolean;
  created_at: string;
  event_title: string;
}

const Dashboard: React.FC = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const isDarkMode = theme === "dark";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [clubId, setClubId] = useState<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Requirement[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  
  // Admin/Adviser metrics
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [pendingPayments, setPendingPayments] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number>(0);
  const [metricsLoading, setMetricsLoading] = useState(true);
  
  // Personal member stats
  const [myPayments, setMyPayments] = useState<Transaction[]>([]);
  const [myAttendanceCount, setMyAttendanceCount] = useState<number>(0);
  const [myUpcomingEvents, setMyUpcomingEvents] = useState<number>(0);
  const [myTotalPaid, setMyTotalPaid] = useState<number>(0);
  const [memberStatsLoading, setMemberStatsLoading] = useState(true);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [feeRequirements, setFeeRequirements] = useState<Requirement[]>([]);
  const [isQrRegenerateModalOpen, setIsQrRegenerateModalOpen] = useState(false);
  const [mainLoading, setMainLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const username = localStorage.getItem('username') || 'User';

  useEffect(() => {
    const initDashboard = async () => {
      setMainLoading(true);
      try {
        // Get current user first to determine role-based data fetching
        const userRes = await fetch("/my-app-server/get_current_user.php", {
          credentials: "include",
        });
        
        if (!userRes.ok) return;
        
        const user = await userRes.json();
        setCurrentUser(user);
        setUserId(user.user_id);
        setUserRole(user.role);
        
        // Fetch QR code for this user
        await fetchQRCode(user.user_id);
        
        // Fetch events and time slots
        await fetchUpcomingEvents();
        await fetchTimeSlots();
        
        // Fetch role-specific data
        const userRole = (user.role || 'Member').toLowerCase();
        if (userRole === 'adviser' || userRole === 'president' || userRole === 'officer') {
          fetchAdminMetrics();
          fetchMemberStats(user.user_id, user.club_id); 
        } else {
          fetchMemberStats(user.user_id, user.club_id);
        }
      } catch (error) {
        console.error('Error initializing dashboard:', error);
      } finally {
        setMainLoading(false);
      }
    };

    initDashboard();
  }, []);

  const fetchMemberStats = async (userId: number, clubId: number) => {
    try {
      setMemberStatsLoading(true);
      
      // Fetch personal transactions
      const transactionsRes = await fetch(`/my-app-server/get_transaction.php?user_id=${userId}&type=fee`, {
        credentials: 'include'
      });
      if (transactionsRes.ok) {
        const userTransactions = await transactionsRes.json();
        const normalizedTransactions = Array.isArray(userTransactions) ? userTransactions.map(t => ({
          ...t,
          amount_due: typeof t.amount_due === 'string' ? parseFloat(t.amount_due) : t.amount_due,
          amount_paid: t.amount_paid == null ? 0 : typeof t.amount_paid === 'string' ? parseFloat(t.amount_paid) : t.amount_paid
        })) : [];
        setMyPayments(normalizedTransactions);
        
        // Calculate total paid
        const totalPaid = normalizedTransactions.reduce((sum, t) => sum + (t.amount_paid || 0), 0);
        setMyTotalPaid(totalPaid);
      }

      // Fetch fee requirements for calculations
      const feeReqRes = await fetch(`/my-app-server/get_requirement.php?type=fee&club_id=${clubId}`, {
        credentials: 'include'
      });
      if (feeReqRes.ok) {
        const feeReqs = await feeReqRes.json();
        setFeeRequirements(Array.isArray(feeReqs) ? feeReqs : []);
      }

      // Fetch personal attendance records
      const attendanceRes = await fetch(`/my-app-server/get_attendance_records.php?user_id=${userId}`, {
        credentials: 'include'
      });
      if (attendanceRes.ok) {
        const attendance = await attendanceRes.json();
        const presentCount = Array.isArray(attendance) ? 
          attendance.filter(a => a.attendance_status === 'present' || a.attendance_status === 'late').length : 0;
        setMyAttendanceCount(presentCount);
      }

      // Count upcoming events for this club
      const eventsRes = await fetch(`/my-app-server/get_requirement.php?type=event&club_id=${clubId}`, {
        credentials: 'include'
      });
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        const upcomingCount = Array.isArray(events) ? 
          events.filter(e => e.status !== 'completed' && e.status !== 'canceled' && new Date(e.end_datetime) > new Date()).length : 0;
        setMyUpcomingEvents(upcomingCount);
      }
    } catch (error) {
      console.error('Error fetching member stats:', error);
    } finally {
      setMemberStatsLoading(false);
    }
  };

  const fetchQRCode = async (userIdParam?: number) => {
    const targetUserId = userIdParam || userId;
    if (!targetUserId) return;
    setQrLoading(true);
    try {
      const response = await fetch(`/my-app-server/generate_qr_code.php?user_id=${targetUserId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeData(data);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch QR code:', errorData.error);
        toast.error('Failed to load QR code');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error('Error loading QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const regenerateQRCode = async () => {
    setIsQrRegenerateModalOpen(true);
  };

  const confirmRegenerateQR = async () => {
    if (!userId) return;
    setQrLoading(true);
    setIsQrRegenerateModalOpen(false);
    try {
      const response = await fetch('/my-app-server/generate_qr_code.php', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          regenerate: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeData(data);
        toast.success('QR code regenerated successfully! Please download the new QR code.');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to regenerate QR code');
      }
    } catch (error) {
      console.error('Error regenerating QR code:', error);
      toast.error('Error regenerating QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/my-app-server/get_requirement.php?type=event', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const events = await response.json();
        const upcoming = events.filter((event: Requirement) => 
          event.status !== 'completed' && 
          event.status !== 'canceled' &&
          new Date(event.end_datetime) > new Date()
        ).slice(0, 5);
        
        setUpcomingEvents(upcoming);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await fetch('/my-app-server/get_time_slots.php?active_only=true', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const slots = await response.json();
        // Filter for today and future time slots
        const upcomingSlots = slots.filter((slot: TimeSlot) => 
          new Date(`${slot.date} ${slot.end_time}`) > new Date()
        );
        
        setTimeSlots(upcomingSlots);
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const fetchAdminMetrics = async () => {
    try {
      // First try to get admin metrics from dedicated endpoint
      let response = await fetch('/my-app-server/get_admin_metrics.php', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const metrics = await response.json();
        setTotalMembers(metrics.total_members || 0);
        setTotalTransactions(metrics.total_transactions || 0);
        setPendingPayments(metrics.pending_payments || 0);
        setRecentTransactions(metrics.recent_transactions || []);
        setAttendanceRate(metrics.attendance_rate || 0);
      } else {
        // Fallback: fetch basic metrics from existing endpoints
        await fetchBasicMetrics();
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      // Fallback: fetch basic metrics from existing endpoints
      await fetchBasicMetrics();
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchBasicMetrics = async () => {
    try {
      // Fetch users count and user data
      const usersResponse = await fetch('/my-app-server/get_user.php', {
        credentials: 'include'
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const usersArray = Array.isArray(usersData) ? usersData : [];
        setUsers(usersArray);
        setTotalMembers(usersArray.length);
      }

      // Fetch fee requirements data
      const feeReqResponse = await fetch('/my-app-server/get_requirement.php?type=fee', {
        credentials: 'include'
      });
      if (feeReqResponse.ok) {
        const feeReqData = await feeReqResponse.json();
        setFeeRequirements(Array.isArray(feeReqData) ? feeReqData : []);
      }

      // Fetch transactions with proper mapping
      const transactionsResponse = await fetch('/my-app-server/get_transaction.php', {
        credentials: 'include'
      });
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        if (Array.isArray(transactionsData)) {
          const normalizedTransactions = transactionsData.map(t => ({
            ...t,
            amount_due: typeof t.amount_due === 'string' ? parseFloat(t.amount_due) : t.amount_due,
            amount_paid: t.amount_paid == null ? 0 : typeof t.amount_paid === 'string' ? parseFloat(t.amount_paid) : t.amount_paid
          }));
          setTransactions(normalizedTransactions);
          setTotalTransactions(normalizedTransactions.length);
          
          const pending = normalizedTransactions.filter(t => t.payment_status === 'unpaid' || t.payment_status === 'partial');
          setPendingPayments(pending.length);
          
          // Get recent transactions (last 5) with user and requirement mapping
          const recent = normalizedTransactions
            .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
            .slice(0, 5);
          setRecentTransactions(recent);
        }
      }

      // Calculate basic attendance rate (from attendance records)
      const attendanceResponse = await fetch('/my-app-server/get_attendance_records.php', {
        credentials: 'include'
      });
      if (attendanceResponse.ok) {
        const attendance = await attendanceResponse.json();
        if (Array.isArray(attendance) && attendance.length > 0) {
          const presentCount = attendance.filter(a => a.attendance_status === 'present' || a.attendance_status === 'late').length;
          const rate = (presentCount / attendance.length) * 100;
          setAttendanceRate(rate);
        }
      }
    } catch (error) {
      console.error('Error fetching basic metrics:', error);
    }
  };

  // Create maps for easy lookup
  const userMap = React.useMemo(() => {
    return Object.fromEntries(users.map(u => [u.user_id, u]));
  }, [users]);

  const feeRequirementMap = React.useMemo(() => {
    return Object.fromEntries(feeRequirements.map(f => [f.requirement_id, f]));
  }, [feeRequirements]);

  // Only show the latest transaction per (user_id, requirement_id) for member view
  const latestMyPayments = React.useMemo(() => {
    const map = new Map<string, Transaction>();
    myPayments.forEach(t => {
      const key = `${t.user_id || userId}-${t.requirement_id}`;
      if (!map.has(key) || t.transaction_id > map.get(key)!.transaction_id) {
        map.set(key, t);
      }
    });
    return Array.from(map.values());
  }, [myPayments, userId]);

  const isAdminRole = userRole?.toLowerCase() === 'adviser' || userRole?.toLowerCase() === 'president' || userRole?.toLowerCase() === 'officer';
  const isMember = userRole?.toLowerCase() === 'member';

  return (
    <div className="flex min-h-screen min-w-0 w-full bg-gray-50 dark:bg-gray-900">
    <Sidebar />
    <ToastContainer />

<div className="flex min-w-0 flex-1 flex-col sm:ml-64">
        {/* Header */}
        <header className="relative flex items-center justify-center bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleSidebar}
            className="absolute left-4 p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            {/* Hamburger icon */}
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 4h16M2 10h16M2 16h16" />
            </svg>
          </button>
          
          <h1 className="mx-auto text-xl font-semibold text-gray-900 dark:text-white">
            Welcome, {userName}
            </h1>

        </header>

        {/* Main Content */}
        <main className="min-w-0 p-3 py-5 sm:p-6 sm:py-7 flex-1 overflow-auto">
          <div className="space-y-6">
            {/* Metric Cards Row - Show based on role */}
            {isAdminRole ? (
              // Admin Roles (Adviser, President, Officer) - Show oversight metrics
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Members Card */}
                <Link 
                  to="/members"
                  className="block bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-blue-100">Total Members</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {metricsLoading ? (
                          <div className="animate-pulse bg-blue-300 h-8 w-16 rounded"></div>
                        ) : (
                          totalMembers
                        )}
                      </p>
                    </div>
                    <div className="bg-blue-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Total Transactions Card */}
                <Link 
                  to="/transactions"
                  className="block bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-green-100">Total Transactions</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {metricsLoading ? (
                          <div className="animate-pulse bg-green-300 h-8 w-16 rounded"></div>
                        ) : (
                          totalTransactions
                        )}
                      </p>
                    </div>
                    <div className="bg-green-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Pending Payments Card */}
                <Link 
                  to="/transactions"
                  className="block bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-orange-100">Pending Payments</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {metricsLoading ? (
                          <div className="animate-pulse bg-orange-300 h-8 w-16 rounded"></div>
                        ) : (
                          pendingPayments
                        )}
                      </p>
                    </div>
                    <div className="bg-red-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </Link>

                {/* Attendance Rate Card */}
                <Link 
                  to="/attendance/list"
                  className="block bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-purple-100">Attendance Rate</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {metricsLoading ? (
                          <div className="animate-pulse bg-purple-300 h-8 w-16 rounded"></div>
                        ) : (
                          `${attendanceRate.toFixed(1)}%`
                        )}
                      </p>
                    </div>
                    <div className="bg-purple-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            ) : isMember ? (
              // Member Dashboard - Show personal stats
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* My Total Paid Card */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-green-100">Total Paid</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {memberStatsLoading ? (
                          <div className="animate-pulse bg-green-300 h-8 w-20 rounded"></div>
                        ) : (
                          `₱${myTotalPaid.toFixed(0)}`
                        )}
                      </p>
                    </div>
                    <div className="bg-green-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* My Payments Count Card */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-blue-100">My Payments</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {memberStatsLoading ? (
                          <div className="animate-pulse bg-blue-300 h-8 w-16 rounded"></div>
                        ) : (
                          latestMyPayments.length
                        )}
                      </p>
                    </div>
                    <div className="bg-blue-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M12 7.205c4.418 0 8-1.165 8-2.602S16.418 2 12 2s-8 1.165-8 2.603S7.582 7.205 12 7.205ZM12 22c4.963 0 8-1.686 8-2.603v-4.404c-.052.032-.112.06-.165.09a7.75 7.75 0 0 1-.745.387c-.193.088-.394.173-.6.253-.063.024-.124.05-.189.073a18.934 18.934 0 0 1-6.3.998c-2.135.027-4.26-.31-6.3-.998-.065-.024-.126-.05-.189-.073a10.143 10.143 0 0 1-.852-.373 7.75 7.75 0 0 1-.493-.267c-.053-.03-.113-.058-.165-.09v4.404C4 20.315 7.037 22 12 22Z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Pending Payments Card */}
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-yellow-100">Pending</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {memberStatsLoading ? (
                          <div className="animate-pulse bg-yellow-300 h-8 w-16 rounded"></div>
                        ) : (
                          latestMyPayments.filter(p => p.payment_status === 'unpaid' || p.payment_status === 'partial').length
                        )}
                      </p>
                    </div>
                    <div className="bg-yellow-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Completed Payments Card */}
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-emerald-100">Completed</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {memberStatsLoading ? (
                          <div className="animate-pulse bg-emerald-300 h-8 w-16 rounded"></div>
                        ) : (
                          latestMyPayments.filter(p => p.payment_status === 'paid').length
                        )}
                      </p>
                    </div>
                    <div className="bg-emerald-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* My Attendance Card */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-purple-100">Events Attended</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {memberStatsLoading ? (
                          <div className="animate-pulse bg-purple-300 h-8 w-16 rounded"></div>
                        ) : (
                          myAttendanceCount
                        )}
                      </p>
                    </div>
                    <div className="bg-purple-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Upcoming Events Card */}
                <Link 
                  to="/requirements"
                  className="block bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg shadow text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-medium text-orange-100">Upcoming Events</h2>
                      <p className="mt-1 text-3xl font-bold">
                        {memberStatsLoading ? (
                          <div className="animate-pulse bg-orange-300 h-8 w-16 rounded"></div>
                        ) : (
                          myUpcomingEvents
                        )}
                      </p>
                    </div>
                    <div className="bg-orange-400 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            ) : null}

            {/* Content Row - QR Code, Payments, and Upcoming Events */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
              {/* QR Code Card - Smaller width (1 column) */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow duration-200 lg:col-span-1">
                <h2 className="text-lg font-bold mb-4 text-primary-600 dark:text-primary-400">
                  {isAdminRole ? 'Admin QR Code' : 'My QR Code'}
                </h2>
                {qrLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">Loading QR code...</span>
                  </div>
                ) : qrCodeData ? (
                  <div className="text-center">
                    <QRCodeDisplay
                      qrCodeData={qrCodeData.qr_code_data}
                      size={isAdminRole ? 160 : 200}
                      downloadFileName={`${userName.replace(/\s+/g, '_')}_${isAdminRole ? 'Admin_' : ''}QR_Code`}
                      className="mb-4"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Generated: {new Date(qrCodeData.generated_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 break-all">
                      Code: {qrCodeData.qr_code_data}
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={regenerateQRCode}
                        className="w-full bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Generate New
                      </button>
                    </div>
                    <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700">
                      <div className="flex items-center text-blue-300 mb-2">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                        </svg>
                        <span className="font-medium text-sm">How to use:</span>
                      </div>
                      <p className="text-xs text-blue-200">
                      Present this QR code to officers in charge of attendance for verification. Download it to your phone for easy access.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mb-4">No QR code available</p>
                    <button
                      onClick={() => fetchQRCode()}
                      className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-block"
                    >
                      Generate QR Code
                    </button>
                  </div>
                )}
              </div>

              {/* My Payments Card - For both admins and members */}
              {(isAdminRole || isMember) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow duration-200 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-primary-600 dark:text-primary-400">My Payments</h2>
                    <Link 
                      to="/transactions" 
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      View All
                    </Link>
                  </div>
                  
                  {memberStatsLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400"></div>
                      <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">Loading my payments...</span>
                    </div>
                  ) : latestMyPayments.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No personal payments found</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto max-h-[66vh]">
                      {latestMyPayments.map(tx => {
                        const req = feeRequirementMap[tx.requirement_id];
                        const amountPaid = typeof tx.amount_paid === 'number' ? tx.amount_paid : parseFloat(tx.amount_paid) || 0;
                        const amountDue = req && req.amount_due != null && !isNaN(Number(req.amount_due)) ? Number(req.amount_due) : 0;
                        
                        return (
                          <div key={tx.transaction_id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                            {/* Payment Image - Full width */}
                            <img
                              src={req?.req_picture || placeholderImage}
                              alt={req?.title || 'Fee'}
                              className="w-full h-48 object-cover"
                            />
                            
                            <div className="p-3">
                              <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                                {req?.title || '—'}
                              </h3>
                              
                              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                                {/* Due Date */}
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                                  </svg>
                                  Due: {req?.end_datetime ? new Date(req.end_datetime.replace(' ', 'T')).toLocaleDateString() : req?.start_datetime ? new Date(req.start_datetime.replace(' ', 'T')).toLocaleDateString() : 'Not specified'}
                                </div>
                                
                                {/* Amount Info */}
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                                  </svg>
            
                                  Paid: ₱{amountPaid.toFixed(2)} / ₱{amountDue.toFixed(2)}
                                </div>
                              </div>
                              
                              {tx.fee_description && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                                  {tx.fee_description}
                                </p>
                              )}
                              
                              {/* Payment Progress Bar */}
                              <div className="mb-3">
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <span>Payment Progress</span>
                                  <span>{amountDue > 0 ? ((amountPaid / amountDue) * 100).toFixed(0) : 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      tx.payment_status === 'paid' ? 'bg-green-500' :
                                      tx.payment_status === 'partial' ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${amountDue > 0 ? Math.min((amountPaid / amountDue) * 100, 100) : 0}%` }}
                                  ></div>
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <div>
                                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                  tx.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                  tx.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {tx.payment_status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Upcoming Events */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow duration-200 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-primary-600 dark:text-primary-400">Upcoming Events</h2>
                  <Link 
                    to="/requirements" 
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    View All
                  </Link>
                </div>
                
                {eventsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400"></div>
                    <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">Loading events...</span>
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-4 overflow-y-auto max-h-[66vh]">
                    {upcomingEvents.map(event => {
                      const eventTimeSlots = timeSlots.filter(slot => slot.requirement_id === event.requirement_id);
                      
                      return (
                        <div key={event.requirement_id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200">
                          {/* Event Image - Full width */}
                          <img
                            src={event.req_picture || placeholderImage}
                            alt={event.title}
                            className="w-full h-48 object-cover"
                          />
                          
                          <div className="p-3">
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                              {event.title}
                            </h3>
                            
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                              {/* Event Date */}
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                                </svg>
                                {event.start_datetime ? new Date(event.start_datetime.replace(' ', 'T')).toLocaleDateString() : 'Date TBA'}
                              </div>
                              
                              {/* Event Time */}
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                                </svg>
                                {event.start_datetime ? new Date(event.start_datetime.replace(' ', 'T')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Time TBA'}
                              </div>
                              
                              {/* Location */}
                              {event.location && (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                                  </svg>
                                  {event.location}
                                </div>
                              )}
                              
                            
                            </div>
                            
                            {event.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            
                            {/* Status Badge */}
                            <div className="flex justify-between items-center">
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                event.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                event.status === 'ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                event.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                              }`}>
                                {event.status}
                              </span>
                              
                              {/* Days until event */}
                              {event.start_datetime && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {(() => {
                                    const daysUntil = Math.ceil((new Date(event.start_datetime.replace(' ', 'T')).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                    return daysUntil > 0 ? `${daysUntil} days left` : daysUntil === 0 ? 'Today' : 'In progress';
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* QR Code Regeneration Confirmation Modal */}
        {isQrRegenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Regenerate QR Code?
                </h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This will generate a new QR code and invalidate your current one. 
                <strong className="text-orange-600 dark:text-orange-400"> You will need to download the new QR code again to keep it updated.</strong>
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsQrRegenerateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRegenerateQR}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200"
                >
                  Yes, Regenerate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
