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
  attendance_status: 'present' | 'late' | 'excused';
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

const AttendanceList: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  
  const [filters, setFilters] = useState<AttendanceFilters>({
    search: '',
    statuses: { present: false, late: false, excused: false },
    event: '',
    course: '',
    year: '',
    section: '',
  });

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Attendance', to: '/attendance/list' },
    { label: 'List' }
  ];

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost/my-app-server/get_attendance_records.php', {
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

  useEffect(() => {
    fetchAttendanceRecords();
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

      // Event filter
      if (filters.event && record.event_title !== filters.event) return false;

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
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar />
      <div className="flex-1 sm:ml-64 relative flex flex-col">
        <div className="p-3 sm:px-5 sm:pt-5 sm:pb-1">
          <Breadcrumb items={trail} />
          
          {/* Header with search and filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between dark:border-gray-700 pt-0 mb-0 gap-4 sm:gap-0">
            <div className="flex-1 max-w-md">
              <Searchbar 
                search={filters.search}
                onSearchChange={term => setFilters(f => ({ ...f, search: term }))}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-0 sm:ml-4">
              <ToastContainer />
              
              {/* Filter Dropdown */}
              <FilterDropdownAttendance
                isOpen={showFilter}
                toggle={() => setShowFilter(v => !v)}
                filters={filters}
                setFilters={setFilters}
                events={events}
                courses={courses}
                years={years}
                sections={sections}
              />
              
              {/* Date Range Picker */}
              <div className="flex items-center gap-2 dark:text-white flex-shrink-0">
                <div id="date-range-picker" className="flex items-center relative" style={{ minWidth: 'fit-content' }}>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </div>
              </div>
              
              {/* Export button */}
              <Button
                onClick={() => toast.info('Export functionality coming soon!')}
                className="bg-primary-600 hover:bg-primary-500 text-white text-xs sm:text-sm px-3 sm:px-2 py-1"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto p-3 sm:px-5 sm:pt-0 sm:pb-5">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-4 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full bg-white dark:bg-gray-800 text-xs sm:text-sm">
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
                        Verified By
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRecords.map(record => (
                      <tr key={record.attendance_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
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
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white max-w-[100px] sm:max-w-none truncate" title={record.event_title}>
                            {record.event_title}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
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
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.attendance_status)}`}>
                            {record.attendance_status.charAt(0).toUpperCase() + record.attendance_status.slice(1)}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          <div className="max-w-[100px] sm:max-w-none">
                            <div className="sm:hidden">
                              {new Date(record.scan_datetime).toLocaleDateString()}
                            </div>
                            <div className="hidden sm:block">
                              {new Date(record.scan_datetime).toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                          <div className="max-w-[80px] sm:max-w-none truncate" title={`${record.verifier_fname} ${record.verifier_lname}`}>
                            {record.verifier_fname} {record.verifier_lname}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 pl-0 py-4 whitespace-nowrap text-center">
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
      </div>
    </div>
  );
};

export default AttendanceList; 