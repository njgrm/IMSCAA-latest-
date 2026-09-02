import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "./components/Sidebar";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Searchbar from "./components/Searchbar";
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';
import placeholderImage from "./assets/profilePlaceholder.png"; 
import DateRangePicker from "./components/DateRangePicker";
import AttendanceReportChart from "./components/AttendanceReportChart";
import AttendanceReportBarChart from "./components/AttendanceReportBarChart";
import AttendanceReportAreaChart from "./components/AttendanceReportAreaChart";
import AttendanceRateChart from "./components/AttendanceRateChart";
import FilterDropdownAttendance, { AttendanceFilters } from "./components/FilterDropdownAttendance";
import { exportToPDF, ExportData } from "./utils/pdfExport";
import "./theme/react-datepicker-dark.css";

interface AttendanceRecord {
  attendance_id: number;
  user_id: number;
  requirement_id: number;
  attendance_status: 'present' | 'late' | 'absent' | 'excused';
  scan_datetime: string;
  verified_by: number;
  club_id: number;
  notes: string | null;
  // Joined data
  user_fname: string;
  user_lname: string;
  school_id: string;
  avatar: string;
  course: string;
  year: number;
  section: string;
  event_title: string;
  requirement_type: string;
  event_date: string;
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
}

interface Event {
  requirement_id: number;
  title: string;
  requirement_type: 'event' | 'activity';
  start_datetime: string;
  end_datetime: string;
  location: string;
  status: string;
  req_picture: string;
}

const initialFilters: AttendanceFilters = {
  search: "",
  statuses: { present: false, late: false, absent: false, excused: false },
  eventTypes: { event: false, activity: false },
  course: "",
  year: "",
  section: "",
};

const EventAttendanceReport: React.FC = () => {
  const [filters, setFilters] = useState<AttendanceFilters>(initialFilters);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchAttendanceRecords();
    fetchUsers();    
    fetchEvents();  
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      const res = await fetch("/my-app-server/get_attendance_records.php", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load attendance records");
      const data = await res.json();
      setAttendanceRecords(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load attendance records');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/my-app-server/get_user.php", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };
  
  const fetchEvents = async () => {
    try {
      const res = await fetch("/my-app-server/get_requirement.php", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      // Filter only events and activities
      const eventData = (Array.isArray(data) ? data : []).filter(
        (r: any) => r.requirement_type === 'event' || r.requirement_type === 'activity'
      );
      setEvents(eventData);
    } catch (e) {
      console.error(e);
    }
  };

  const userMap = useMemo(() => {
    if (!Array.isArray(users)) return {};
    return Object.fromEntries(users.map(u => [u.user_id, u]));
  }, [users]);
  
  const eventMap = useMemo(() => {
    if (!Array.isArray(events)) return {};
    return Object.fromEntries(events.map(e => [e.requirement_id, e]));
  }, [events]);

  // Filtering logic
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(record => {
      const u = userMap[record.user_id];
      const e = eventMap[record.requirement_id];
      
      // Search filter
      const hay = `${record.user_fname || u?.user_fname || ''} ${record.user_lname || u?.user_lname || ''} ${record.event_title || e?.title || ''}`.toLowerCase();
      if (filters.search && !hay.includes(filters.search.toLowerCase())) return false;
      if (search && !hay.includes(search.toLowerCase())) return false;
      
      // Status filter
      if (Object.values(filters.statuses).some(Boolean) && !filters.statuses[record.attendance_status]) return false;
      
      // Event type filter
      if (Object.values(filters.eventTypes).some(Boolean)) {
        const eventType = record.requirement_type || e?.requirement_type;
        if (!eventType || !filters.eventTypes[eventType as keyof typeof filters.eventTypes]) return false;
      }
      
      // Course/Year/Section filters
      const userCourse = record.course || u?.course;
      const userYear = record.year || u?.year;
      const userSection = record.section || u?.section;
      
      if (filters.course && userCourse !== filters.course) return false;
      if (filters.year && String(userYear) !== filters.year) return false;
      if (filters.section && userSection !== filters.section) return false;
      
      // Date range filter
      const recordDate = record.event_date || record.scan_datetime;
      const safeDate = recordDate ? new Date(recordDate.replace(' ', 'T')) : null;
      if (dateRange.start && safeDate && !isNaN(safeDate.getTime()) && safeDate < new Date(dateRange.start)) return false;
      if (dateRange.end && safeDate && !isNaN(safeDate.getTime()) && safeDate > new Date(dateRange.end)) return false;
      
      return true;
    });
  }, [attendanceRecords, filters, userMap, eventMap, search, dateRange]);

  // Pagination
  const rowsPerPage = 10;
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const da = new Date(a.scan_datetime.replace(' ', 'T'));
      const db = new Date(b.scan_datetime.replace(' ', 'T'));
      return db.getTime() - da.getTime(); // Most recent first
    });
  }, [filteredRecords]);
  
  const totalRows = sortedRecords.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedRecords = sortedRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Chart data calculations
  const presentCount = sortedRecords.filter(r => r.attendance_status === 'present').length;
  const lateCount = sortedRecords.filter(r => r.attendance_status === 'late').length;
  const absentCount = sortedRecords.filter(r => r.attendance_status === 'absent').length;
  const excusedCount = sortedRecords.filter(r => r.attendance_status === 'excused').length;

  // Get unique values for filters
  const courses = useMemo(() => [...new Set(users.map(u => u.course))], [users]);
  const years = useMemo(() => [...new Set(users.map(u => String(u.year)))], [users]);
  const sections = useMemo(() => [...new Set(users.map(u => u.section))], [users]);

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Reports' },
    { label: 'Event Attendance' }
  ];

  // Report generation handler
  const handleGenerateReport = () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error("Please select a start and end date range.");
      return;
    }
    setReportGenerated(true);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Chart data for bar chart (attendance rate by event)
  const eventAttendanceData = useMemo(() => {
    const map: Record<string, { 
      label: string; 
      present: number; 
      late: number; 
      absent: number; 
      excused: number; 
      total: number;
      attendanceRate: number;
    }> = {};
    
    sortedRecords.forEach(record => {
      const eventTitle = record.event_title || eventMap[record.requirement_id]?.title || `Event #${record.requirement_id}`;
      if (!map[eventTitle]) {
        map[eventTitle] = { label: eventTitle, present: 0, late: 0, absent: 0, excused: 0, total: 0, attendanceRate: 0 };
      }
      
      map[eventTitle][record.attendance_status]++;
      map[eventTitle].total++;
    });
    
    // Calculate attendance rates (present + late / total)
    return Object.values(map).map(event => ({
      ...event,
      attendanceRate: event.total ? ((event.present + event.late) / event.total) * 100 : 0
    })).sort((a, b) => b.attendanceRate - a.attendanceRate);
  }, [sortedRecords, eventMap]);

  // Chart data for line chart (attendance trends over time)
  const attendanceTrendsData = useMemo(() => {
    const map: Record<string, { 
      label: string; 
      present: number; 
      late: number; 
      absent: number; 
      excused: number;
    }> = {};
    
    attendanceRecords.forEach(record => {
      const dateStr = record.event_date || record.scan_datetime;
      let label = '';
      if (dateStr) {
        const dateObj = new Date(dateStr.replace(' ', 'T'));
        if (!isNaN(dateObj.getTime())) {
          label = dateObj.toISOString().slice(0, 10); // yyyy-MM-dd
        }
      }
      if (!label) return;
      
      if (!map[label]) {
        map[label] = { label, present: 0, late: 0, absent: 0, excused: 0 };
      }
      
      map[label][record.attendance_status]++;
    });
    
    return Object.values(map).sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  }, [attendanceRecords]);

  // Scroll-to-top button logic
  useEffect(() => {
    const handleScroll = () => {
      if (tableRef.current) {
        const tableTop = tableRef.current.getBoundingClientRect().top;
        setShowScrollButton(tableTop < 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add export functionality
  const handleExportPDF = async () => {
    try {
      const dateRangeText = dateRange.start && dateRange.end 
        ? `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`
        : 'All dates';

      const filterSummary = [
        filters.statuses.present && 'Present',
        filters.statuses.late && 'Late', 
        filters.statuses.absent && 'Absent',
        filters.statuses.excused && 'Excused'
      ].filter(Boolean).join(', ') || 'All statuses';

      const exportData: ExportData = {
        title: 'Event Attendance Report',
        subtitle: `Period: ${dateRangeText} | Filters: ${filterSummary}`,
        statistics: {
          'Total Records': sortedRecords.length,
          'Present': presentCount,
          'Late': lateCount,
          'Absent': absentCount,
          'Excused': excusedCount,
          'Overall Attendance Rate': `${((presentCount + lateCount) / Math.max(sortedRecords.length, 1) * 100).toFixed(1)}%`,
          'Unique Students': [...new Set(sortedRecords.map(r => r.user_id))].length,
          'Unique Events': [...new Set(sortedRecords.map(r => r.event_title))].length,
        },
        tableHeaders: [
          'Student', 'Course', 'Year', 'Section', 'Event Title', 
          'Status', 'Scan Time'
        ],
        tableData: sortedRecords.map(record => [
          `${record.user_fname} ${record.user_lname}`,
          record.course,
          record.year.toString(),
          record.section,
          record.event_title,
          record.attendance_status,
          new Date(record.scan_datetime).toLocaleString()
        ])
      };

      await exportToPDF(exportData);
      toast.success('PDF export initiated');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div className="flex min-h-screen min-w-0 w-full bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar />
      <div className="flex min-w-0 flex-1 sm:ml-64 relative flex-col">
        <div className="p-3 sm:px-5 sm:pt-5 sm:pb-1">
          <Breadcrumb items={trail} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between dark:border-gray-700 pt-0 mb-0 gap-4 sm:gap-0">
            <div className="flex-1 max-w-md">
              <Searchbar search={search} onSearchChange={setSearch} />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-0 sm:ml-4 relative">
              <ToastContainer />
              
              {/* Attendance Filters */}
              <FilterDropdownAttendance
                isOpen={showFilter}
                toggle={() => setShowFilter(!showFilter)}
                filters={filters}
                setFilters={setFilters}
                courses={courses}
                years={years}
                sections={sections}
              />
              
              <div className="flex min-w-0 w-full items-center gap-2 dark:text-white sm:w-auto sm:flex-shrink-0">
                <div id="date-range-picker" className="relative w-full">
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateReport}
                className="py-2 sm:py-3 bg-primary-600 hover:bg-primary-400 focus:ring-primary-300 px-3 flex items-center text-xs sm:text-sm font-medium text-white rounded-lg shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Zm-1 9a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2Zm2-5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 4a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0v-3Z" clipRule="evenodd"/>
                </svg>
                <span className="hidden sm:inline">Generate Report</span>
                <span className="sm:hidden">Report</span>
              </button>

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                className="py-2 sm:py-3 bg-red-500 hover:bg-red-400  focus:ring-red-300 px-3 flex items-center text-xs sm:text-sm font-medium text-white rounded-lg shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="min-w-0 flex-1 overflow-auto p-3 sm:px-5 sm:pt-0 sm:pb-5">
          {reportGenerated ? (
            <>
              {/* Table Section */}
              <div ref={tableRef} className="responsive-table-frame shadow-md relative z-10 mb-4">
                <table className="responsive-table-cards min-w-0 sm:min-w-full bg-white dark:bg-gray-800 rounded-t-lg overflow-hidden shadow dark:text-white text-xs sm:text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 bg-red-500">
                    <tr>
                      {[
                        'Student', 'Course', 'Year', 'Section', 'Event Title',
                        'Status', 'Scan Time'
                      ].map(col => (
                        <th key={col} className="px-2 sm:px-4 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No attendance records found for the selected criteria.
                        </td>
                      </tr>
                    ) : paginatedRecords.map(record => {
                      const u = userMap[record.user_id];
                      const e = eventMap[record.requirement_id];
                      const scanDate = new Date(record.scan_datetime.replace(' ', 'T'));
                      
                      return (
                        <tr key={record.attendance_id} className="border-b dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                          <td data-label="Student" className="px-2 sm:px-3.5 py-2 sm:py-3.5 flex items-center">
                            <img
                              src={record.avatar || u?.avatar || placeholderImage}
                              alt={`${record.user_fname || u?.user_fname} avatar`}
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full mr-1 sm:mr-2 object-cover"
                            />
                            <div className="max-w-[100px] sm:max-w-none truncate" title={`${record.user_fname || u?.user_fname} ${record.user_lname || u?.user_lname}`}>
                              {record.user_fname || u?.user_fname} {record.user_lname || u?.user_lname}
                            </div>
                          </td>
                          <td data-label="Course" className="px-2 sm:px-4 py-2">{record.course || u?.course || '–'}</td>
                          <td data-label="Year" className="px-2 sm:px-4 py-2">{record.year || u?.year || '–'}</td>
                          <td data-label="Section" className="px-2 sm:px-4 py-2">{record.section || u?.section || '–'}</td>
                          <td data-label="Event Title" className="px-2 sm:px-4 py-2">
                            <div className="max-w-[120px] sm:max-w-none truncate" title={record.event_title || e?.title || '–'}>
                              {record.event_title || e?.title || '–'}
                            </div>
                          </td>
                          <td data-label="Status" className="px-2 sm:px-4 py-2">
                            <span className={`capitalize px-2 py-1 rounded text-xs font-semibold ${
                              record.attendance_status === 'present' ? 'bg-green-100 text-green-800' :
                              record.attendance_status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              record.attendance_status === 'excused' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.attendance_status}
                            </span>
                          </td>
                          <td data-label="Scan Time" className="px-2 sm:px-4 py-2 text-xs sm:text-sm">
                            {!isNaN(scanDate.getTime()) ? scanDate.toLocaleString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                

                {/* Pagination */}
                <nav className="bg-gray-800 rounded-b-lg flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4" aria-label="Table navigation">
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    Showing{' '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {totalRows === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                    </span>
                    {'-'}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {Math.min(currentPage * rowsPerPage, totalRows)}
                    </span>
                    {' of '}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {totalRows}
                    </span>
                  </span>
                  <ul className="inline-flex items-stretch -space-x-px">
                    <li>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <li key={i + 1}>
                        <button
                          onClick={() => handlePageChange(i + 1)}
                          className={`flex items-center justify-center text-sm py-2 px-3 leading-tight border
                            ${currentPage === i + 1
                              ? "z-10 bg-primary-600 text-white border-primary-400 hover:bg-primary-100 hover:text-primary-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
                              : "text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                            }`}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="flex items-center justify-center h-full py-1.5 px-3 text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg shadow-sm p-6 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-blue-700 dark:text-blue-300 truncate">Total Records</dt>
                        <dd className="text-lg font-medium text-blue-900 dark:text-blue-100">{totalRows}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg shadow-sm p-6 border border-green-200 dark:border-green-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-green-700 dark:text-green-300 truncate">Attendance Rate</dt>
                        <dd className="text-lg font-medium text-green-900 dark:text-green-100">{((presentCount + lateCount) / Math.max(totalRows, 1) * 100).toFixed(1)}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg shadow-sm p-6 border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate">Unique Students</dt>
                        <dd className="text-lg font-medium text-purple-900 dark:text-purple-100">{new Set(sortedRecords.map(r => r.user_id)).size}</dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg shadow-sm p-6 border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-yellow-700 dark:text-yellow-300 truncate">Unique Events</dt>
                        <dd className="text-lg font-medium text-yellow-900 dark:text-yellow-100">{new Set(sortedRecords.map(r => r.event_title)).size}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="space-y-4 mb-4">
                {/* Top Row - Distribution charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1">
                    <AttendanceReportChart 
                      present={presentCount} 
                      late={lateCount} 
                      absent={absentCount} 
                      excused={excusedCount} 
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <AttendanceReportBarChart data={eventAttendanceData} />
                  </div>
                </div>
                
                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <AttendanceRateChart data={eventAttendanceData} />
                  <AttendanceReportAreaChart data={attendanceTrendsData} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500 text-lg py-20">
              Please select date range and click <b>Generate Report</b> to view the attendance breakdown.
            </div>
          )}
        </div>

        {showScrollButton && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-3 right-3 ml-2 transform p-3 bg-white/40 dark:bg-gray-900 rounded-full shadow-lg transition-all duration-300 hover:bg-white/70 dark:hover:bg-gray-700/70 z-50 border border-gray-200 dark:border-gray-700"
            aria-label="Scroll to top"
          >
            <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v13m0-13 4 4m-4-4-4 4"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default EventAttendanceReport; 
