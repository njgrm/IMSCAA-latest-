import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import placeholderImage from './assets/questionPlaceholder.png';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import QRCodeDisplay from './components/QRCodeDisplay';

interface Transaction {
  transaction_id: number;
  user_id: number;
  requirement_id: number;
  amount_paid: number;
  description: string;
  date: string;
  type: string;
  payment_status: string;
}

interface Requirement {
  requirement_id: number;
  title: string;
  description: string;
  start_datetime?: string;
  end_datetime?: string;
  due_date?: string;
  location?: string;
  requirement_type: string;
  status?: string;
  club_id: number;
  amount_due?: number;
  req_picture?: string;
  date_added?: string;
}

interface QRCodeData {
  qr_id: number;
  qr_code_data: string;
  generated_at: string;
  is_active: boolean;
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

const MemberDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feeRequirements, setFeeRequirements] = useState<Requirement[]>([]);
  const [eventRequirements, setEventRequirements] = useState<Requirement[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [clubId, setClubId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch user info
    fetch('http://localhost/my-app-server/get_current_user.php', { credentials: 'include' })
      .then(res => res.json())
      .then(user => {
        if (user && user.user_id) {
          setUserId(user.user_id);
          setUserName(user.user_fname ? `${user.user_fname} ${user.user_lname || ''}` : 'Member');
          setClubId(user.club_id || null);
        }
      });
  }, []);

  useEffect(() => {
    if (!userId || !clubId) return;
    setLoading(true);
    
    // Fetch QR code
    fetchQRCode();
    
    // Fetch transactions (fees)
    fetch(`http://localhost/my-app-server/get_transaction.php?user_id=${userId}&type=fee`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setTransactions(Array.isArray(data) ? data : []));
    // Fetch requirements (fees)
    fetch(`http://localhost/my-app-server/get_requirement.php?type=fee&club_id=${clubId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setFeeRequirements(Array.isArray(data) ? data : []));
    // Fetch requirements (events)
    fetch(`http://localhost/my-app-server/get_requirement.php?type=event&club_id=${clubId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        // Only future events with correct type and club
        const now = new Date();
        setEventRequirements(Array.isArray(data) ? data.filter((e: Requirement) => e.requirement_type === 'event' && new Date(e.end_datetime || e.due_date || '') > now) : []);
        setLoading(false);
      });
      
    // Fetch time slots
    fetch('http://localhost/my-app-server/get_time_slots.php?active_only=true', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        // Filter for today and future time slots
        const upcomingSlots = Array.isArray(data) ? data.filter((slot: TimeSlot) => 
          new Date(`${slot.date} ${slot.end_time}`) > new Date()
        ) : [];
        setTimeSlots(upcomingSlots);
      })
      .catch(error => console.error('Error fetching time slots:', error));
  }, [userId, clubId]);

  const fetchQRCode = async () => {
    if (!userId) return;
    setQrLoading(true);
    try {
      const response = await fetch(`http://localhost/my-app-server/generate_qr_code.php?user_id=${userId}`, {
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

  const feeRequirementMap = React.useMemo(() => {
    return Object.fromEntries(feeRequirements.map(f => [f.requirement_id, f]));
  }, [feeRequirements]);

  // Only show the latest transaction per (user_id, requirement_id)
  const latestTxns = React.useMemo(() => {
    const map = new Map<string, Transaction>();
    transactions.forEach(t => {
      const key = `${t.user_id || userId}-${t.requirement_id}`;
      if (!map.has(key) || t.transaction_id > map.get(key)!.transaction_id) {
        map.set(key, t);
      }
    });
    return Array.from(map.values());
  }, [transactions, userId]);

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <Sidebar />
      <ToastContainer position="top-right" theme="dark" />
      <div className="flex-1 flex flex-col sm:ml-64">
        {/* Header */}
        <header className="relative flex items-center justify-center bg-gray-800 px-4 py-4 border-b border-gray-700">
          <h1 className="mx-auto text-xl font-semibold text-white">
            Welcome, {userName}
          </h1>
        </header>
        {/* Main Content */}
        <main className="p-4 flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* QR Code Card */}
            <div className="bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4 text-primary-400">My QR Code</h2>
              {qrLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
                  <span className="ml-2 text-gray-400">Loading QR code...</span>
                </div>
              ) : qrCodeData ? (
                <div className="text-center">
                  <QRCodeDisplay
                    qrCodeData={qrCodeData.qr_code_data}
                    size={200}
                    downloadFileName={`${userName.replace(/\s+/g, '_')}_QR_Code`}
                    className="mb-4"
                  />
                  <div className="text-xs text-gray-400 mb-4">
                    Generated: {new Date(qrCodeData.generated_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 mb-4 break-all">
                    Code: {qrCodeData.qr_code_data}
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={regenerateQRCode}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
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
                <div className="text-center text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mb-4">No QR code available</p>
                  <button
                    onClick={fetchQRCode}
                    className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-block"
                  >
                    Generate QR Code
                  </button>
                </div>
              )}
            </div>

            {/* Payments Card */}
            <div className="bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4 text-primary-400">My Payments</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : latestTxns.length === 0 ? (
                <div className="text-gray-400">No payments found.</div>
              ) : (
                <div className="flex flex-col space-y-8">
                  {latestTxns.map((tx, idx) => {
                    const req = feeRequirementMap[tx.requirement_id];
                    const amountPaid = typeof tx.amount_paid === 'number' ? tx.amount_paid : parseFloat(tx.amount_paid as any) || 0;
                    const amountDue = req && req.amount_due != null && !isNaN(Number(req.amount_due)) ? Number(req.amount_due) : 0;
                    return (
                      <React.Fragment key={tx.transaction_id}>
                        <img
                          src={req?.req_picture || placeholderImage}
                          alt={req?.title || 'Fee'}
                          className="w-full h-48 object-cover rounded mb-0"
                        />
                        <div className="mb-2">
                          <div className="font-bold text-lg text-primary-300 mb-1">{req?.title || '—'}</div>
                          <div className="text-s text-gray-400 mb-1">
                            Due: {req?.end_datetime ? new Date(req.end_datetime.replace(' ', 'T')).toLocaleDateString() : req?.start_datetime ? new Date(req.start_datetime.replace(' ', 'T')).toLocaleDateString() : ''}
                          </div>
                          <div className="text-xs text-gray-400 mb-1">{tx.description}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mb-2">
                          <span className={`capitalize px-2 py-1 rounded font-semibold text-xs mr-2 ${
                            tx.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            tx.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {tx.payment_status}
                          </span>
                          <span className="text-gray-400">Paid: <span className="font-bold text-white">₱{amountPaid.toFixed(2)}</span></span>
                          <span className="text-gray-400">Amount Due: <span className="font-bold text-white">₱{amountDue.toFixed(2)}</span></span>
                        </div>
                        {idx !== latestTxns.length - 1 && <hr className="my-4 border-gray-700" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Events Card */}
            <div className="bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4 text-primary-400">Upcoming Events</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : eventRequirements.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
                  {eventRequirements.map(ev => {
                    const eventTimeSlots = timeSlots.filter(slot => slot.requirement_id === ev.requirement_id);
                    
                    return (
                      <div key={ev.requirement_id} className="border border-gray-600 rounded-lg overflow-hidden">
                        {/* Event Image - Full width like payments */}
                        <img
                          src={ev.req_picture || placeholderImage}
                          alt={ev.title}
                          className="w-full h-32 object-cover"
                        />
                        
                        <div className="p-3">
                          <h3 className="font-medium text-white text-sm mb-2">
                            {ev.title}
                          </h3>
                          
                          <div className="text-xs text-gray-400 space-y-1 mb-3">
                            {/* Date with SVG icon */}
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd"/>
                              </svg>
                              {ev.start_datetime ? new Date(ev.start_datetime.replace(' ', 'T')).toLocaleDateString() : ''}
                            </div>
                            
                            {/* Time with SVG icon */}
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd"/>
                              </svg>
                              {ev.start_datetime ? new Date(ev.start_datetime.replace(' ', 'T')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''} - {ev.end_datetime ? new Date(ev.end_datetime.replace(' ', 'T')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </div>
                            
                            {/* Location with SVG icon */}
                            {ev.location && (
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" d="M11.906 1.994a8.002 8.002 0 0 1 8.09 8.421 7.996 7.996 0 0 1-1.297 3.957.996.996 0 0 1-.133.204l-.108.129c-.178.243-.37.477-.573.699l-5.112 6.224a1 1 0 0 1-1.545 0L5.982 15.26l-.002-.002a18.146 18.146 0 0 1-.309-.38l-.133-.163a.999.999 0 0 1-.13-.202 7.995 7.995 0 0 1 6.498-12.518ZM15 9.997a3 3 0 1 1-5.999 0 3 3 0 0 1 5.999 0Z" clipRule="evenodd"/>
                                </svg>
                                {ev.location}
                              </div>
                            )}
                          </div>
                          
                          {ev.description && (
                            <p className="text-xs text-gray-300 mb-3 line-clamp-2">
                              {ev.description}
                            </p>
                          )}
                          
                          {eventTimeSlots.length > 0 && (
                            <div className="mb-3 p-2 bg-gray-700/50 rounded">
                              <div className="text-xs font-medium text-primary-400 mb-2 flex items-center">
                                <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                  <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd"/>
                                </svg>
                                Attendance Time Slots:
                              </div>
                              <div className="space-y-1">
                                {eventTimeSlots.slice(0, 3).map(slot => (
                                  <div key={slot.slot_id} className="flex items-center text-xs">
                                    <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 flex-shrink-0"></span>
                                    <span className="text-gray-300 truncate">
                                      <span className="text-white font-medium">{slot.slot_name}:</span> {slot.start_time} - {slot.end_time}
                                    </span>
                                  </div>
                                ))}
                                {eventTimeSlots.length > 3 && (
                                  <div className="text-xs text-gray-400 ml-4">
                                    +{eventTimeSlots.length - 3} more slots
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {ev.status && (
                            <div>
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                ev.status === 'scheduled' ? 'bg-blue-900 text-blue-300' :
                                ev.status === 'ongoing' ? 'bg-green-900 text-green-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {ev.status}
                              </span>
                            </div>
                          )}
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

export default MemberDashboard; 