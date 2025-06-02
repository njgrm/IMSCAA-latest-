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
  const [upcomingEvents, setUpcomingEvents] = useState<Requirement[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const username = localStorage.getItem('username') || 'User';

  useEffect(() => {
    // Fetch user info
    fetch('http://localhost/my-app-server/get_current_user.php', { credentials: 'include' })
      .then(res => res.json())
      .then(user => {
        if (user && user.user_id) {
          setUserId(user.user_id);
          setUserName(user.user_fname ? `${user.user_fname} ${user.user_lname || ''}` : 'Admin');
          // Fetch QR code after getting user info
          fetchQRCode(user.user_id);
        }
      });
    
    // Fetch upcoming events and time slots
    fetchUpcomingEvents();
    fetchTimeSlots();
  }, []);

  const fetchQRCode = async (userIdParam?: number) => {
    const targetUserId = userIdParam || userId;
    if (!targetUserId) return;
    setQrLoading(true);
    try {
      const response = await fetch(`http://localhost/my-app-server/generate_qr_code.php?user_id=${targetUserId}`, {
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
    if (!userId) return;
    setQrLoading(true);
    try {
      const response = await fetch('http://localhost/my-app-server/generate_qr_code.php', {
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
        toast.success('QR code regenerated successfully!');
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
      const response = await fetch('http://localhost/my-app-server/get_requirement.php?type=event', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const events = await response.json();
        // Filter for upcoming events (not completed or canceled)
        const upcoming = events.filter((event: Requirement) => 
          event.status !== 'completed' && 
          event.status !== 'canceled' &&
          new Date(event.end_datetime) > new Date()
        ).slice(0, 5); // Limit to 5 most recent
        
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
      const response = await fetch('http://localhost/my-app-server/get_time_slots.php?active_only=true', {
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

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
    <Sidebar />
    <ToastContainer />

<div className="flex-1 flex flex-col sm:ml-64">
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
            Welcome, {username}
            </h1>

        </header>

        {/* Main Content */}
        <main className="p-6 flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* QR Code Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4 text-primary-600 dark:text-primary-400">Admin QR Code</h2>
              {qrLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
                  <span className="ml-2 text-gray-500 dark:text-gray-400">Loading QR code...</span>
                </div>
              ) : qrCodeData ? (
                <div className="text-center">
                  <QRCodeDisplay
                    qrCodeData={qrCodeData.qr_code_data}
                    size={200}
                    downloadFileName={`${userName.replace(/\s+/g, '_')}_Admin_QR_Code`}
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

            {/* Placeholder cards */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Total Clubs
              </h2>
              <p className="mt-2 text-3xl font-bold text-primary-600">—</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Total Members
              </h2>
              <p className="mt-2 text-3xl font-bold text-primary-600">—</p>
            </div>
            
            {/* Upcoming Events */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
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
                <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
                  {upcomingEvents.map(event => {
                    const eventTimeSlots = timeSlots.filter(slot => slot.requirement_id === event.requirement_id);
                    
                    return (
                      <div key={event.requirement_id} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                        {/* Event Image - Full width like payments */}
                        <img
                          src={event.req_picture || placeholderImage}
                          alt={event.title}
                          className="w-full h-32 object-cover"
                        />
                        
                        <div className="p-3">
                          <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                            {event.title}
                          </h3>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                            {/* Date with SVG icon */}
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd"/>
                              </svg>
                              {new Date(event.start_datetime).toLocaleDateString()}
                            </div>
                            
                            {/* Time with SVG icon */}
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd"/>
                              </svg>
                              {new Date(event.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(event.end_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            
                            {/* Location with SVG icon */}
                            {event.location && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" d="M11.906 1.994a8.002 8.002 0 0 1 8.09 8.421 7.996 7.996 0 0 1-1.297 3.957.996.996 0 0 1-.133.204l-.108.129c-.178.243-.37.477-.573.699l-5.112 6.224a1 1 0 0 1-1.545 0L5.982 15.26l-.002-.002a18.146 18.146 0 0 1-.309-.38l-.133-.163a.999.999 0 0 1-.13-.202 7.995 7.995 0 0 1 6.498-12.518ZM15 9.997a3 3 0 1 1-5.999 0 3 3 0 0 1 5.999 0Z" clipRule="evenodd"/>
                                </svg>
                                {event.location}
                              </div>
                            )}
                          </div>
                          
                          {eventTimeSlots.length > 0 && (
                            <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                                <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd"/>
                                </svg>
                                Attendance Time Slots:
                              </div>
                              <div className="space-y-1">
                                {eventTimeSlots.slice(0, 2).map(slot => (
                                  <div key={slot.slot_id} className="flex items-center text-xs">
                                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {slot.slot_name}: {slot.start_time} - {slot.end_time}
                                    </span>
                                  </div>
                                ))}
                                {eventTimeSlots.length > 2 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                                    +{eventTimeSlots.length - 2} more slots
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                              event.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                              event.status === 'ongoing' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {event.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;