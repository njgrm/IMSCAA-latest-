import React, { useState, useContext, useEffect, useMemo } from "react";
import { ThemeContext } from './theme/ThemeContext';
import { Button, Modal } from "flowbite-react";
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Searchbar from "./components/Searchbar";
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';
import placeholderImage from "./assets/profilePlaceholder.png";
import FilterDropdownAttendance, { AttendanceFilters } from './components/FilterDropdownAttendance';
import DateRangePicker from "./components/DateRangePicker";
import "./theme/react-datepicker-dark.css";

interface AttendanceRecord {
  attendance_id: number;
  user_id: number;
  requirement_id: number;
  time_slot_id?: number;
  verified_by: number;
  club_id: number;
  scan_datetime: string;
  attendance_status: 'present' | 'late' | 'excused' | 'absent';
  notes?: string;
  // Joined fields
  user_fname: string;
  user_lname: string;
  school_id: string;
  course: string;
  year: number;
  section: string;
  avatar?: string;
  event_title: string;
  slot_name?: string;
  start_time?: string;
  end_time?: string;
  verifier_fname: string;
  verifier_lname: string;
}

type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

const AttendanceList: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  
  // Add current user state
  const [currentUser, setCurrentUser] = useState<{ user_id: number; role: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [filters, setFilters] = useState<AttendanceFilters>({
    search: '',
    statuses: { present: false, late: false, excused: false, absent: false },
    eventTypes: { event: false, activity: false },
    course: '',
    year: '',
    section: '',
  });

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // New states for request functionality
  const [requestType, setRequestType] = useState<'delete' | 'edit' | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestingRecord, setRequestingRecord] = useState<AttendanceRecord | null>(null);

  // New state for edit form
  const [editForm, setEditForm] = useState({
    attendance_status: 'present' as 'present' | 'late' | 'excused' | 'absent',
    notes: '',
  });

  // Add state for direct edit modal
  const [isDirectEditModalOpen, setIsDirectEditModalOpen] = useState(false);

  // Add state for deletion confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Attendance', to: '/attendance/list' },
    { label: 'List' }
  ];

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/my-app-server/get_attendance_records.php', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }
      
      const data = await response.json();
      setAttendanceRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load attendance records');
      console.error('Error fetching attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user information
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/my-app-server/get_current_user.php', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Trigger automatic absence processing (Adviser only)
  const triggerAutoAbsenceProcessing = async () => {
    if (isProcessing) return;
    
    // Check if user is an adviser
    if (currentUser?.role?.toLowerCase() !== 'adviser') {
      toast.error('Only advisers can trigger automatic absence processing');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      toast.info('Starting auto absence processing...', { autoClose: 2000 });
      
      // First, update event statuses based on current time
      const statusUpdateResponse = await fetch('/my-app-server/update_event_statuses.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!statusUpdateResponse.ok) {
        throw new Error('Failed to update event statuses');
      }
      
      const statusUpdateData = await statusUpdateResponse.json();
      console.log('Event status update result:', statusUpdateData);
      
      if (statusUpdateData.updated_events > 0) {
        toast.info(`Updated ${statusUpdateData.updated_events} event statuses`, { autoClose: 3000 });
      }

      const response = await fetch('/my-app-server/process_automatic_absences.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to process automatic absences');
      }

      const data = await response.json();
      console.log('Auto absence processing result:', data);

      if (data.events_processed === 0) {
        toast.info('No completed events found to process for automatic absences', { autoClose: 5000 });
      } else if (data.total_absences_created === 0) {
        toast.info(`Processed ${data.events_processed} event(s), but no new absences were needed`, { autoClose: 5000 });
      } else {
        toast.success(
          `Successfully processed ${data.events_processed} event(s) and created ${data.total_absences_created} absence record(s)`,
          { autoClose: 6000 }
        );
      }

      await fetchAttendanceRecords();
      
      window.dispatchEvent(new CustomEvent('auto-absence-processed', { 
        detail: { 
          success: true, 
          data 
        } 
      }));

    } catch (error: any) {
      console.error('Auto absence processing failed:', error);
      toast.error(`Auto absence processing failed: ${error.message}`, { autoClose: 5000 });
      
      window.dispatchEvent(new CustomEvent('auto-absence-processed', { 
        detail: { 
          success: false, 
          error: error.message 
        } 
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceRecords();
    fetchCurrentUser();
  }, []);

  // Listen for approval status changes to refresh attendance records
  useEffect(() => {
    const handler = () => fetchAttendanceRecords();
    window.addEventListener('deletion-request-status', handler);
    return () => window.removeEventListener('deletion-request-status', handler);
  }, []);

  // Listen for attendance record updates from other components
  useEffect(() => {
    const handler = () => {
      console.log('Attendance records update event received');
      fetchAttendanceRecords();
    };
    window.addEventListener('attendance-updated', handler);
    return () => window.removeEventListener('attendance-updated', handler);
  }, []);

  // Add event listener for automatic absence processing completion
  useEffect(() => {
    const handler = () => {
      console.log('Auto absence processing completed, refreshing attendance records...');
      fetchAttendanceRecords();
    };
    window.addEventListener('auto-absence-processed', handler);
    return () => window.removeEventListener('auto-absence-processed', handler);
  }, []);

  // Auto-refresh every 30 seconds to catch any new records
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendanceRecords();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Get unique values for filters
  const events = useMemo(() => [...new Set(attendanceRecords.map(r => r.event_title))], [attendanceRecords]);
  const courses = useMemo(() => [...new Set(attendanceRecords.map(r => r.course))], [attendanceRecords]);
  const years = useMemo(() => [...new Set(attendanceRecords.map(r => String(r.year)))], [attendanceRecords]);
  const sections = useMemo(() => [...new Set(attendanceRecords.map(r => r.section))], [attendanceRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchFields = `${record.user_fname} ${record.user_lname} ${record.school_id} ${record.event_title}`.toLowerCase();
        if (!searchFields.includes(searchTerm)) return false;
      }

   
      if (Object.values(filters.eventTypes).some(Boolean)) {
 
      }

      // Status filter
      if (Object.values(filters.statuses).some(Boolean) && !filters.statuses[record.attendance_status]) return false;

      // Course filter
      if (filters.course && record.course !== filters.course) return false;

      // Year filter
      if (filters.year && String(record.year) !== filters.year) return false;

      // Section filter
      if (filters.section && record.section !== filters.section) return false;

      // Date range filter
      const recordDate = new Date(record.scan_datetime);
      if (dateRange.start) {
        const fromDate = new Date(dateRange.start);
        if (recordDate < fromDate) return false;
      }
      if (dateRange.end) {
        const toDate = new Date(dateRange.end + 'T23:59:59');
        if (recordDate > toDate) return false;
      }

      return true;
    });
  }, [attendanceRecords, filters, dateRange]);

  // Scroll button functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetailModal = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'late': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'absent': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Function to request deletion (direct for advisers, request for others)
  const requestDeletion = async (record: AttendanceRecord) => {
    if (!currentUser?.role) {
      toast.error('Unable to determine user role');
      return;
    }

    const userRole = currentUser.role.toLowerCase();
    
    if (userRole === 'adviser') {
      // Adviser: delete directly with confirmation modal
      setRecordToDelete(record);
      setIsDeleteModalOpen(true);
    } else {
      // President/Officer: request deletion
      setRequestingRecord(record);
      setRequestType('delete');
      setRequestReason('');
      setIsRequestModalOpen(true);
    }
  };

  // Function to handle confirmed deletion (advisers only)
  const handleConfirmedDeletion = async () => {
    if (!recordToDelete) return;

    try {
      const response = await fetch(`/my-app-server/delete_attendance_record.php?attendance_id=${recordToDelete.attendance_id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      toast.success('Attendance record deleted successfully');
      await fetchAttendanceRecords();
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      toast.error(`Failed to delete attendance record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to request edit (direct for advisers, request for others)
  const requestEdit = (record: AttendanceRecord) => {
    const userRole = currentUser?.role?.toLowerCase();
    
    if (userRole === 'adviser') {
      // Adviser: edit directly
      setRequestingRecord(record);
      setEditForm({
        attendance_status: record.attendance_status as AttendanceStatus,
        notes: record.notes || '',
      });
      setIsDirectEditModalOpen(true);
    } else {
      // President/Officer: request edit
      setRequestingRecord(record);
      setRequestType('edit');
      setRequestReason('');
      setEditForm({
        attendance_status: record.attendance_status as AttendanceStatus,
        notes: record.notes || '',
      });
      setIsRequestModalOpen(true);
    }
  };

  // Function to save direct edit (advisers only)
  const saveDirectEdit = async () => {
    if (!requestingRecord) return;

    try {
      const response = await fetch('/my-app-server/update_attendance_record.php', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance_id: requestingRecord.attendance_id,
          attendance_status: editForm.attendance_status,
          notes: editForm.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      toast.success('Attendance record updated successfully');
      setIsDirectEditModalOpen(false);
      setRequestingRecord(null);
      setEditForm({ attendance_status: 'present', notes: '' });
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Error updating attendance record:', error);
      toast.error(`Failed to update attendance record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to submit request
  const submitRequest = async () => {
    if (!requestingRecord || !requestType || !requestReason.trim()) {
      toast.error('Please provide a reason for your request');
      return;
    }

    try {
      const requestData: any = {
        type: 'attendance',
        target_id: requestingRecord.attendance_id,
        reason: requestReason,
        approval_type: requestType === 'delete' ? 'delete' : 'attendance_edit',
      };

      // For edit requests, include the new data
      if (requestType === 'edit') {
        requestData.new_data = {
          attendance_status: editForm.attendance_status,
          notes: editForm.notes,
        };
      }

      console.log('Submitting request:', requestData); // Debug log

      const response = await fetch('/my-app-server/add_attendance_request.php', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText); // Debug log
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Response result:', result); // Debug log
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(`${requestType === 'delete' ? 'Deletion' : 'Edit'} request submitted successfully`);
      setIsRequestModalOpen(false);
      setRequestingRecord(null);
      setRequestType(null);
      setRequestReason('');
      setEditForm({ attendance_status: 'present', notes: '' });
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error(`Failed to submit ${requestType} request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex min-h-screen min-w-0 w-full bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar />
      <div className="flex min-w-0 flex-1 sm:ml-64 relative flex-col">
        <div className="p-3 sm:px-5 sm:pt-5 sm:pb-1">
          <Breadcrumb items={trail} />
          
          {/* Header with search and filters */}
          <div className="flex min-w-0 flex-col dark:border-gray-700 pt-0 mb-0 gap-3">
            <div className="w-full max-w-md">
              <Searchbar 
                search={filters.search}
                onSearchChange={term => setFilters(f => ({ ...f, search: term }))}
              />
            </div>

          <div className="flex min-w-0 w-full flex-col items-stretch gap-2 lg:flex-row lg:flex-wrap lg:items-center">
              <ToastContainer />
              
              {/* Filter Dropdown */}
              <FilterDropdownAttendance
                isOpen={showFilter}
                toggle={() => setShowFilter(v => !v)}
                filters={filters}
                setFilters={setFilters}
                courses={courses}
                years={years}
                sections={sections}
              />
              
              {/* Date Range Picker */}
            <div className="flex min-w-0 w-full items-center gap-2 dark:text-white lg:w-auto lg:flex-shrink-0">
              <div id="date-range-picker" className="relative w-full">
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </div>
              </div>
              
              {/* Export button */}
         

              {/* Auto Process Absences button - Adviser only */}
              {currentUser?.role?.toLowerCase() === 'adviser' && (
                <Button
                  onClick={triggerAutoAbsenceProcessing}
                  disabled={isProcessing}
                  className="bg-secondary-600 hover:bg-secondary-500 disabled:bg-gray-400 text-white text-xs sm:text-sm px-3 sm:px-2 py-1 flex items-center whitespace-nowrap"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-1 sm:mr-2"></div>
                      <span className="hidden sm:inline">Processing...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden sm:inline">Auto Process</span>
                      <span className="sm:hidden">Auto</span>
                    </>
                  )}
                </Button>
              )}

              {/* Test Button - Only for advisers in development */}
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/my-app-server/test_auto_absence.php', {
                      credentials: 'include'
                    });
                    const data = await response.json();
                    console.log('Auto absence test result:', data);
                    
                    if (data.success) {
                      toast.info(
                        `Found ${data.analysis.events_to_update_count} events needing status update and ${data.analysis.events_for_absence_count} ready for absence processing`,
                        { autoClose: 6000 }
                      );
                    } else {
                      toast.error(`Test failed: ${data.error}`);
                    }
                  } catch (error: any) {
                    console.error('Test failed:', error);
                    toast.error(`Test failed: ${error.message}`);
                  }
                }}
                className="bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm px-3 sm:px-2 py-1 flex items-center whitespace-nowrap"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Test Events</span>
                <span className="sm:hidden">Test</span>
              </Button>

              {/* Debug Button - Only for advisers */}
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/my-app-server/debug_auto_absence.php', {
                      credentials: 'include'
                    });
                    const data = await response.json();
                    console.log('Debug auto absence result:', data);
                    
                    if (data.success) {
                      const debug = data.debug;
                      console.log('Events with registrations:', debug.completed_events);
                      console.log('All events:', debug.all_events);
                      console.log('Registrations:', debug.registrations);
                      
                      toast.info(
                        `Debug complete - check console for details. Found ${debug.completed_events?.length || 0} completed events`,
                        { autoClose: 5000 }
                      );
                    } else {
                      toast.error(`Debug failed: ${data.error}`);
                    }
                  } catch (error: any) {
                    console.error('Debug failed:', error);
                    toast.error(`Debug failed: ${error.message}`);
                  }
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm px-3 sm:px-2 py-1 flex items-center whitespace-nowrap"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Debug</span>
                <span className="sm:hidden">Debug</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
          <div className="min-w-0 flex-1 overflow-auto p-3 sm:px-5 sm:pt-0 sm:pb-5">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-4 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {filteredRecords.length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total Records</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {filteredRecords.filter(r => r.attendance_status === 'present').length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Present</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                      {filteredRecords.filter(r => r.attendance_status === 'late').length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Late</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      {filteredRecords.filter(r => r.attendance_status === 'excused').length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Excused</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-600">
                      {filteredRecords.filter(r => r.attendance_status === 'absent').length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Absent</div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="responsive-table-frame w-full min-w-0 shadow-md rounded-lg" tabIndex={0} aria-label="Attendance records table">
                <table className="responsive-table-cards w-full sm:min-w-[880px] lg:min-w-0 bg-white dark:bg-gray-800 text-xs sm:text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Time Slot
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Scan Time
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRecords.map(record => (
                      <tr key={record.attendance_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td data-label="Student" className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                              src={record.avatar || placeholderImage}
                              alt={`${record.user_fname} ${record.user_lname}`}
                            />
                            <div className="ml-2 sm:ml-3">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                {record.user_fname} {record.user_lname}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-300">
                                {record.school_id} • {record.course} {record.year}-{record.section}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Event" className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white max-w-[100px] sm:max-w-none truncate" title={record.event_title}>
                            {record.event_title}
                          </div>
                        </td>
                        <td data-label="Time Slot" className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                            {record.slot_name ? (
                              <div>
                                <div className="max-w-[80px] sm:max-w-none truncate" title={record.slot_name}>
                                  {record.slot_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {record.start_time} - {record.end_time}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No specific time</span>
                            )}
                          </div>
                        </td>
                        <td data-label="Status" className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.attendance_status)}`}>
                            {record.attendance_status.charAt(0).toUpperCase() + record.attendance_status.slice(1)}
                          </span>
                        </td>
                        <td data-label="Scan Time" className="px-2 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          <div className="max-w-[100px] sm:max-w-none">
                            <div className="sm:hidden">
                              {new Date(record.scan_datetime).toLocaleDateString()}
                            </div>
                            <div className="hidden sm:block">
                              {new Date(record.scan_datetime).toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td data-label="Actions" className="px-2 sm:px-4 pl-0 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-left space-x-2">
                            <button
                              onClick={() => openDetailModal(record)}
                              className="py-1 pt-2 pb-2 px-2 sm:px-3 flex items-center text-xs sm:text-sm font-medium text-center text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-primary-400 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 transition-transform duration-200 ease-in-out transform hover:scale-105"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 -ml-0.5">
                                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" />
                              </svg>
                              <span className="hidden sm:inline">Preview</span>
                            </button>

                            {/* Request Edit Button */} 
                            <button
                              onClick={() => requestEdit(record)}
                              className="py-1 pt-2 pb-2 px-2 sm:px-3 flex items-center text-xs sm:text-sm font-medium text-center text-white bg-primary-600 rounded-lg hover:bg-primary-400 focus:z-10 focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-400 transition-transform duration-200 ease-in-out transform hover:scale-105"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 -ml-0.5">
                                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                                <path d="M5.25 5.25a3 3 0 00-3 3v10.5a3 3 0 003 3h10.5a3 3 0 003-3V13.5a.75.75 0 00-1.5 0v5.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V8.25a1.5 1.5 0 011.5-1.5h5.25a.75.75 0 000-1.5H5.25z" />
                              </svg>
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            {/* Request Delete Button */}
                            <button
                              onClick={() => requestDeletion(record)}
                              className="flex items-center justify-center px-4 py-2 text-sm border border-red-500 text-red-500 rounded-lg hover:bg-red-50  dark:hover:bg-red-900 whitespace-nowrap transition-transform duration-200 ease-in-out transform hover:scale-105"
                              >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 -ml-0.5">
                                <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                              </svg>
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredRecords.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No attendance records</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                    No attendance records match your current filters.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Scroll to top button */}
        {showScrollButton && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-3 right-3 p-3 bg-white/40 dark:bg-gray-900 rounded-full shadow-lg transition-all duration-300 hover:bg-white/70 dark:hover:bg-gray-700/70 z-50 border border-gray-200 dark:border-gray-700"
            aria-label="Scroll to top"
          >
            <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v13m0-13 4 4m-4-4-4 4"/>
            </svg>
          </button>
        )}

        {/* Detail Modal */}
        {selectedRecord && (
          <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}>
            <Modal.Header className="dark:bg-gray-800">
              Attendance Record Details
            </Modal.Header>
            <Modal.Body className="dark:bg-gray-800 dark:text-white">
              <div className="space-y-4">
                {/* Student Info */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    className="h-16 w-16 rounded-full object-cover"
                    src={selectedRecord.avatar || placeholderImage}
                    alt={`${selectedRecord.user_fname} ${selectedRecord.user_lname}`}
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedRecord.user_fname} {selectedRecord.user_lname}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {selectedRecord.school_id} • {selectedRecord.course} {selectedRecord.year}-{selectedRecord.section}
                    </p>
                  </div>
                </div>

                {/* Attendance Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Event</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedRecord.event_title}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRecord.attendance_status)} mt-1`}>
                      {selectedRecord.attendance_status.charAt(0).toUpperCase() + selectedRecord.attendance_status.slice(1)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Time Slot</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedRecord.slot_name ? (
                        <>
                          {selectedRecord.slot_name}<br/>
                          <span className="text-xs text-gray-500">
                            {selectedRecord.start_time} - {selectedRecord.end_time}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No specific time slot</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Scan Time</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {new Date(selectedRecord.scan_datetime).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Verified By</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedRecord.verifier_fname} {selectedRecord.verifier_lname}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {selectedRecord.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {selectedRecord.notes}
                    </p>
                  </div>
                )}
              </div>
            </Modal.Body>
          </Modal>
        )}

        {/* Direct Edit Modal (Advisers Only) */}
        <Modal show={isDirectEditModalOpen} onClose={() => setIsDirectEditModalOpen(false)}>
          <Modal.Header className="dark:bg-gray-800">
            Edit Attendance Record
          </Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white">
            {requestingRecord && (
              <div className="space-y-4">
                {/* Record Info */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src={requestingRecord.avatar || placeholderImage}
                    alt={`${requestingRecord.user_fname} ${requestingRecord.user_lname}`}
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {requestingRecord.user_fname} {requestingRecord.user_lname}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {requestingRecord.event_title} • {new Date(requestingRecord.scan_datetime).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      Current Status: <span className={`font-medium ${getStatusColor(requestingRecord.attendance_status)}`}>
                        {requestingRecord.attendance_status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Attendance Status
                    </label>
                    <select
                      name="attendance_status"
                      value={editForm.attendance_status}
                      onChange={handleEditFormChange}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400 dark:text-white"
                    >
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={editForm.notes}
                      onChange={handleEditFormChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400 dark:text-white"
                      placeholder="Add any notes about this attendance record..."
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end space-x-3">
                  <Button
                    color="gray"
                    onClick={() => setIsDirectEditModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={saveDirectEdit}
                    className="flex items-center justify-center px-7 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-400 dark:bg-primary-600 dark:hover:bg-primary-400 focus:ring-primary-300 shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>

        {/* Request Modal */}
        <Modal show={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)}>
          <Modal.Header className="dark:bg-gray-800">
            Request {requestType === 'delete' ? 'Deletion' : 'Edit'} for Attendance Record
          </Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white">
            {requestingRecord && (
              <div className="space-y-4">
                {/* Record Info */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    className="h-12 w-12 rounded-full object-cover"
                    src={requestingRecord.avatar || placeholderImage}
                    alt={`${requestingRecord.user_fname} ${requestingRecord.user_lname}`}
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {requestingRecord.user_fname} {requestingRecord.user_lname}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {requestingRecord.event_title} • {new Date(requestingRecord.scan_datetime).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      Current Status: <span className={`font-medium ${getStatusColor(requestingRecord.attendance_status)}`}>
                        {requestingRecord.attendance_status}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Request Type Info */}
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    <span className="font-medium">Note:</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {requestType === 'delete' 
                      ? 'You are requesting the deletion of this attendance record. Please provide a clear reason.'
                      : 'You are requesting to edit this attendance record. Please update the fields below and provide a clear reason for the changes.'
                    }
                  </p>
                </div>

                {/* Edit Form Fields - Only show for edit requests */}
                {requestType === 'edit' && (
                  <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Requested Changes</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Attendance Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Attendance Status
                        </label>
                        <select
                          name="attendance_status"
                          value={editForm.attendance_status}
                          onChange={handleEditFormChange}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400 dark:text-white"
                        >
                          <option value="present">Present</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                          <option value="absent">Absent</option>
                        </select>
                      </div>

                      {/* Current vs New Status Comparison */}
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current → New</div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(requestingRecord.attendance_status)}`}>
                              {requestingRecord.attendance_status}
                            </span>
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(editForm.attendance_status)}`}>
                              {editForm.attendance_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        New Notes (Optional)
                      </label>
                      <textarea
                        name="notes"
                        value={editForm.notes}
                        onChange={handleEditFormChange}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400 dark:text-white"
                        placeholder="Add any additional notes about this attendance record..."
                      />
                    </div>
                  </div>
                )}

                {/* Reason Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for {requestType === 'delete' ? 'Deletion' : 'Edit'} Request *
                    <span className="text-red-500 ml-1">Required</span>
                  </label>
                  <textarea
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border ${
                      requestReason.trim() ? 'border-gray-300 dark:border-gray-600' : 'border-red-300 dark:border-red-600'
                    } focus:ring-primary-400 focus:border-primary-400 dark:text-white`}
                    placeholder={`Please explain why you need to ${requestType} this attendance record...`}
                    required
                  />
                  {!requestReason.trim() && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      You must provide a reason for this request
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <Button
                    color="gray"
                    onClick={() => setIsRequestModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={submitRequest}
                    className={`${
                      requestType === 'delete' 
                        ? 'flex items-center justify-center px-7 py-2 text-sm font-medium text-white rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 ease-in-out transform hover:scale-105' 
                        : 'flex items-center justify-center px-7 py-2 text-sm font-medium text-white rounded-lg bg-primary-600 hover:bg-primary-400 dark:bg-primary-600 dark:hover:bg-primary-400 focus:ring-primary-300 shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105' 
                    } ${!requestReason.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!requestReason.trim()}
                    title={!requestReason.trim() ? 'Please provide a reason before submitting' : ''}
                  >
                    Submit {requestType === 'delete' ? 'Deletion' : 'Edit'} Request
                  </button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
          <Modal.Header className="dark:bg-gray-800">
            Confirm Deletion
          </Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white">
            {recordToDelete && (
              <div className="space-y-4">
                {/* Warning Icon */}
                <div className="flex justify-center">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>

                {/* Confirmation Text */}
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Delete Attendance Record
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
                    Are you sure you want to delete this attendance record? This action cannot be undone.
                  </p>
                </div>

                {/* Record Details */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-4">
                    <img
                      className="h-12 w-12 rounded-full object-cover"
                      src={recordToDelete.avatar || placeholderImage}
                      alt={`${recordToDelete.user_fname} ${recordToDelete.user_lname}`}
                    />
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">
                        {recordToDelete.user_fname} {recordToDelete.user_lname}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        {recordToDelete.school_id} • {recordToDelete.course} {recordToDelete.year}-{recordToDelete.section}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        Event: {recordToDelete.event_title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        Status: <span className={`font-medium capitalize ${getStatusColor(recordToDelete.attendance_status)}`}>
                          {recordToDelete.attendance_status}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        Scan Time: {new Date(recordToDelete.scan_datetime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    color="gray"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setRecordToDelete(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="failure"
                    onClick={handleConfirmedDeletion}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-300"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    Delete Record
                  </Button>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default AttendanceList; 
