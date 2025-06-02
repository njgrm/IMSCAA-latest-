import React, { useState, useContext, useEffect, useRef } from "react";
import { ThemeContext } from './theme/ThemeContext';
import { Button, Modal } from "flowbite-react";
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';
import placeholderImage from "./assets/profilePlaceholder.png";
import QrScanner from 'qr-scanner';
import Searchbar from './components/Searchbar';

interface Event {
  requirement_id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
}

interface TimeSlot {
  slot_id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  date: string;
  is_active: boolean;
}

interface ScannedUser {
  user_id: number;
  user_fname: string;
  user_lname: string;
  school_id: string;
  course: string;
  year: number;
  section: string;
  avatar?: string;
  email: string;
  qr_code_data: string;
}

interface AttendanceForm {
  event_id: number;
  time_slot_id?: number;
  attendance_status: 'present' | 'late' | 'excused';
  notes: string;
}

const QRScanner: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>({
    event_id: 0,
    time_slot_id: undefined,
    attendance_status: 'present',
    notes: ''
  });

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Attendance', to: '/attendance/scan' },
    { label: 'QR Scanner' }
  ];

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost/my-app-server/get_requirement.php', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      // Filter only events
      const eventData = Array.isArray(data) ? data.filter(req => req.requirement_type === 'event') : [];
      setEvents(eventData);
    } catch (error) {
      toast.error('Failed to load events');
      console.error('Error fetching events:', error);
    }
  };

  // Fetch time slots for selected event
  const fetchTimeSlots = async (eventId: number) => {
    try {
      const response = await fetch(`http://localhost/my-app-server/get_time_slots.php?requirement_id=${eventId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }
      
      const data = await response.json();
      setTimeSlots(Array.isArray(data) ? data.filter(slot => slot.is_active) : []);
    } catch (error) {
      toast.error('Failed to load time slots');
      console.error('Error fetching time slots:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchTimeSlots(selectedEvent.requirement_id);
      setAttendanceForm(prev => ({ ...prev, event_id: selectedEvent.requirement_id }));
    }
  }, [selectedEvent]);

  // Initialize QR Scanner
  const initializeScanner = async () => {
    if (!videoRef.current || !selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    try {
      setLoading(true);
      
      // Check if QrScanner is supported
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        toast.error('No camera found');
        return;
      }

      // Stop existing scanner if any
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }

      // Create new scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result: { data: string }) => handleQRScan(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'back',
          maxScansPerSecond: 3,
        }
      );

      await qrScannerRef.current.start();
      setIsScanning(true);
      toast.success('Scanner started. Point camera at QR code.');
    } catch (error: any) {
      console.error('Scanner initialization error:', error);
      toast.error('Failed to start camera: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Stop QR Scanner
  const stopScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      setIsScanning(false);
      toast.info('Scanner stopped');
    }
  };

  // Handle QR code scan
  const handleQRScan = async (qrData: string) => {
    if (!selectedEvent || !qrData) return;

    // Temporarily stop scanner to prevent multiple scans
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      setIsScanning(false);
    }

    try {
      setLoading(true);
      
      // Verify QR code with backend
      const response = await fetch('http://localhost/my-app-server/verify_qr_code.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code_data: qrData })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'QR code verification failed');
      }

      if (data.success && data.user) {
        setScannedUser(data.user);
        setIsVerificationModalOpen(true);
        toast.success(`User identified: ${data.user.user_fname} ${data.user.user_lname}`);
      } else {
        toast.error('Invalid QR code or user not found');
        // Restart scanner after error
        setTimeout(() => {
          if (qrScannerRef.current && videoRef.current) {
            qrScannerRef.current.start();
            setIsScanning(true);
          }
        }, 2000);
      }
    } catch (error: any) {
      toast.error(error.message || 'QR verification failed');
      // Restart scanner after error
      setTimeout(() => {
        if (qrScannerRef.current && videoRef.current) {
          qrScannerRef.current.start();
          setIsScanning(true);
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Record attendance
  const recordAttendance = async () => {
    if (!scannedUser || !selectedEvent) return;

    try {
      setLoading(true);
      
      const response = await fetch('http://localhost/my-app-server/record_attendance.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: scannedUser.user_id,
          requirement_id: selectedEvent.requirement_id,
          time_slot_id: attendanceForm.time_slot_id || null,
          attendance_status: attendanceForm.attendance_status,
          notes: attendanceForm.notes
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record attendance');
      }

      toast.success('Attendance recorded successfully!');
      setIsVerificationModalOpen(false);
      setScannedUser(null);
      setAttendanceForm(prev => ({ ...prev, notes: '', time_slot_id: undefined, attendance_status: 'present' }));
      
      // Restart scanner
      setTimeout(() => {
        if (qrScannerRef.current && videoRef.current) {
          qrScannerRef.current.start();
          setIsScanning(true);
        }
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  // Scan again without recording
  const scanAgain = () => {
    setIsVerificationModalOpen(false);
    setScannedUser(null);
    
    // Restart scanner
    setTimeout(() => {
      if (qrScannerRef.current && videoRef.current) {
        qrScannerRef.current.start();
        setIsScanning(true);
      }
    }, 500);
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAttendanceForm(prev => ({ 
      ...prev, 
      [name]: name === 'time_slot_id' ? (value ? parseInt(value) : undefined) : value 
    }));
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar />
      <div className="flex-1 sm:ml-64 relative flex flex-col">
        <div className="p-3 sm:px-5 sm:pt-5 sm:pb-1">
          <Breadcrumb items={trail} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between dark:border-gray-700 pt-0 mb-0 gap-4 sm:gap-0">
            <div className="flex-1 max-w-md">
              <Searchbar 
                search={search}
                onSearchChange={setSearch}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-0 sm:ml-4">
              <ToastContainer />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-3 sm:px-5 sm:pt-0 sm:pb-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Event Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Event
              </h2>
              
              <div className="space-y-3">
                {events.map(event => (
                  <div
                    key={event.requirement_id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEvent?.requirement_id === event.requirement_id
                            ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">{event.title}</h3>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center">
                        <svg className="w-3 h-3 text-gray-500 dark:text-primary-400 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M11.906 1.994a8.002 8.002 0 0 1 8.09 8.421 7.996 7.996 0 0 1-1.297 3.957.996.996 0 0 1-.133.204l-.108.129c-.178.243-.37.477-.573.699l-5.112 6.224a1 1 0 0 1-1.545 0L5.982 15.26l-.002-.002a18.146 18.146 0 0 1-.309-.38l-.133-.163a.999.999 0 0 1-.13-.202 7.995 7.995 0 0 1 6.498-12.518ZM15 9.997a3 3 0 1 1-5.999 0 3 3 0 0 1 5.999 0Z" clipRule="evenodd"/>
                        </svg>
                        {event.location}
                      </div>
                      <div className="flex items-center">
                        <svg className="w-3 h-3 text-gray-500 dark:text-primary-400 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd"/>
                        </svg>
                        {new Date(event.start_datetime).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedEvent && timeSlots.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Available Time Slots
                  </h3>
                  <div className="space-y-2">
                    {timeSlots.map(slot => (
                      <div key={slot.slot_id} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="font-medium text-gray-900 dark:text-white">{slot.slot_name}</div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {slot.start_time} - {slot.end_time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scanner */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Camera Scanner
                </h2>
                
                <div className="flex space-x-2">
                  {!isScanning ? (
                    <Button
                      onClick={initializeScanner}
                      disabled={!selectedEvent || loading}
                      className="bg-primary-600 hover:bg-primary-500 text-white"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Starting...
                        </div>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                          </svg>
                          Start Scanner
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={stopScanner}
                      color="failure"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6"/>
                      </svg>
                      Stop Scanner
                    </Button>
                  )}
                </div>
              </div>

              {/* Video Container */}
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {!isScanning && !loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <div className="text-center text-white">
                      <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                      <h3 className="text-lg font-medium">Camera Not Active</h3>
                      <p className="text-sm text-gray-300 mt-1">
                        {!selectedEvent ? 'Select an event first, then start the scanner' : 'Click "Start Scanner" to begin'}
                      </p>
                    </div>
                  </div>
                )}
                
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-sm">Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scanner Status */}
              {isScanning && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                      Scanner Active - Point camera at QR code
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification Modal */}
        {scannedUser && (
          <Modal show={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} size="lg">
            <Modal.Header className="dark:bg-gray-800">
              Verify Student Identity
            </Modal.Header>
            <Modal.Body className="dark:bg-gray-800 dark:text-white">
              <div className="space-y-6">
                {/* Student Info */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-lg"
                    src={scannedUser.avatar || placeholderImage}
                    alt={`${scannedUser.user_fname} ${scannedUser.user_lname}`}
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {scannedUser.user_fname} {scannedUser.user_lname}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {scannedUser.school_id}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {scannedUser.course} {scannedUser.year}-{scannedUser.section}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {scannedUser.email}
                    </p>
                  </div>
                </div>

                {/* Event Info */}
                {selectedEvent && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1">Event</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-300">{selectedEvent.title}</p>
                    <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center">
                      <svg className="w-3 h-3 text-blue-600 dark:text-blue-400 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M11.906 1.994a8.002 8.002 0 0 1 8.09 8.421 7.996 7.996 0 0 1-1.297 3.957.996.996 0 0 1-.133.204l-.108.129c-.178.243-.37.477-.573.699l-5.112 6.224a1 1 0 0 1-1.545 0L5.982 15.26l-.002-.002a18.146 18.146 0 0 1-.309-.38l-.133-.163a.999.999 0 0 1-.13-.202 7.995 7.995 0 0 1 6.498-12.518ZM15 9.997a3 3 0 1 1-5.999 0 3 3 0 0 1 5.999 0Z" clipRule="evenodd"/>
                      </svg>
                      {selectedEvent.location}
                    </div>
                  </div>
                )}

                {/* Attendance Form */}
                <div className="space-y-4">
                  {/* Time Slot Selection */}
                  {timeSlots.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Time Slot (Optional)
                      </label>
                      <select
                        name="time_slot_id"
                        value={attendanceForm.time_slot_id || ''}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">No specific time slot</option>
                        {timeSlots.map(slot => (
                          <option key={slot.slot_id} value={slot.slot_id}>
                            {slot.slot_name} ({slot.start_time} - {slot.end_time})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Attendance Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Attendance Status
                    </label>
                    <select
                      name="attendance_status"
                      value={attendanceForm.attendance_status}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={attendanceForm.notes}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Add any additional notes..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between space-x-3">
                  <Button
                    onClick={scanAgain}
                    color="gray"
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Scan Again
                  </Button>
                  
                  <Button
                    onClick={recordAttendance}
                    disabled={loading}
                    className="flex-1 bg-primary-600 hover:bg-primary-500 text-white"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Recording...
                      </div>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                        Verify & Record
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Modal.Body>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default QRScanner; 