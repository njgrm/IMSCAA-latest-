import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "./components/Sidebar";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Searchbar from "./components/Searchbar";
import FilterDropdownTxn, { TxnFilters } from "./components/FilterDropdownTxn";
import TransactionReportChart from "./components/TransactionReportChart";
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';
import placeholderImage from "./assets/profilePlaceholder.png"; 
import { Flowbite, Datepicker } from 'flowbite-react';
import DateRangePicker from "./components/DateRangePicker";
import "./theme/react-datepicker-dark.css";
import TransactionReportBarChart from "./components/TransactionReportBarChart";
import TransactionReportAreaChart from "./components/TransactionReportAreaChart";


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
  course: string,
  year: number,
  section: string,
}

interface Requirement {
  requirement_id: number;
  title: string;
  amount_due: number;
  end_datetime: string;  
  req_picture: string;
}

const initialFilters: TxnFilters = {
  search: "",
  statuses: { unpaid: false, partial: false, paid: false },
  methods: {},
  course: "",
  year: "",
  section: "",
};

// Define formatDate before the component
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TransactionReport: React.FC = () => {
  const [filters, setFilters] = useState<TxnFilters>(initialFilters);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [feeRequirements, setFeeRequirements] = useState<Requirement[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Reset reportGenerated when dateRange changes


  // Fetch data on mount
  useEffect(() => {
    fetchTransactions();
    fetchUsers();    
    fetchFeeRequirements();  
  }, []);

  

  const fetchTransactions = async () => {
    try {
      const res = await fetch("http://localhost/my-app-server/get_transaction.php", {
        credentials: "include",
      });
      const dataRaw = await res.json();
      const txs: Transaction[] = (Array.isArray(dataRaw) ? dataRaw : []).map(t => ({
        ...t,
        amount_due: typeof t.amount_due === 'string' ? parseFloat(t.amount_due) : t.amount_due,
        amount_paid: t.amount_paid == null ? 0 : typeof t.amount_paid === 'string' ? parseFloat(t.amount_paid) : t.amount_paid
      }));
      setTransactions(txs);
    } catch (e) {
      toast.error('Failed to load transactions');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost/my-app-server/get_user.php", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };
  
  const fetchFeeRequirements = async () => {
    try {
      const res = await fetch("http://localhost/my-app-server/get_fee_requirement.php", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load fees");
      let data = await res.json();
      data = (Array.isArray(data) ? data : []).map((f: any) => ({
        requirement_id: f.requirement_id,
        title: f.title,
        amount_due: typeof f.amount_due === "string" ? parseFloat(f.amount_due) : f.amount_due,
        end_datetime: f.end_datetime,
        req_picture: f.req_picture
      }));
      setFeeRequirements(data);
    } catch (e) {
      console.error(e);
    }
  };

  const userMap = useMemo(() => {
    if (!Array.isArray(users)) return {};
    return Object.fromEntries(users.map(u => [u.user_id, u]));
  }, [users]);
  
  const requirementMap = useMemo(() => {
    if (!Array.isArray(feeRequirements)) return {};
    return Object.fromEntries(feeRequirements.map(f => [f.requirement_id, f]));
  }, [feeRequirements]);

  // Only keep the latest transaction for each (user_id, requirement_id) pair (by highest transaction_id)
  const latestTxns = useMemo(() => {
    const map = new Map<string, Transaction>();
    transactions.forEach(t => {
      const key = `${t.user_id}-${t.requirement_id}`;
      if (!map.has(key) || t.transaction_id > map.get(key)!.transaction_id) {
        map.set(key, t);
      }
    });
    return Array.from(map.values());
  }, [transactions]);

  // Filtering logic (same as before, but use latestTxns)
  const filteredTxns = useMemo(() => {
    return latestTxns.filter(t => {
      const u = users.find(u => u.user_id === t.user_id);
      const r = feeRequirements.find(f => f.requirement_id === t.requirement_id);
      const hay = `${u?.user_fname} ${u?.user_lname} ${r?.title}`.toLowerCase();
      if (filters.search && !hay.includes(filters.search.toLowerCase())) return false;
      if (search && !hay.includes(search.toLowerCase())) return false;
      if (Object.values(filters.statuses).some(Boolean) && !filters.statuses[t.payment_status]) return false;
      if (Object.values(filters.methods).some(Boolean)) {
        if (!t.payment_method || !filters.methods[t.payment_method]) return false;
      }
      if (filters.course && u?.course !== filters.course) return false;
      if (filters.year && String(u?.year) !== filters.year) return false;
      if (filters.section && u?.section !== filters.section) return false;
      // Date range filter (use date_added)
      if (dateRange.start && new Date(t.date_added) < new Date(dateRange.start)) return false;
      if (dateRange.end && new Date(t.date_added) > new Date(dateRange.end)) return false;
      return true;
    });
  }, [latestTxns, filters, users, feeRequirements, search, dateRange]);

  // Use filteredTxns for all further logic
  // Move rowsPerPage above sortedTxns and pagination logic
  const rowsPerPage = 10;

  // Sort filteredTxns by date_added ascending before paginating
  const sortedTxns = useMemo(() => {
    return [...filteredTxns].sort((a, b) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime());
  }, [filteredTxns]);
  const totalRows = sortedTxns.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedTxns = sortedTxns.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Chart data
  const paidCount = sortedTxns.filter(t => t.payment_status === 'paid').length;
  const unpaidCount = sortedTxns.filter(t => t.payment_status === 'unpaid').length;
  const partialCount = sortedTxns.filter(t => t.payment_status === 'partial').length;

  const methodsList = useMemo(() => {
    const setm = new Set<string>();
    transactions.forEach(t => { if (t.payment_method) setm.add(t.payment_method); });
    return Array.from(setm);
  }, [transactions]);
  const courses = useMemo(() => [...new Set(users.map(u => u.course))], [users]);
  const years = useMemo(() => [...new Set(users.map(u => String(u.year)))], [users]);
  const sections = useMemo(() => [...new Set(users.map(u => u.section))], [users]);

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Reports' },
    { label: 'Transactional Fees' }
  ];

  // Error handler for report generation
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

  // --- Aggregation for Bar Chart (by Fee Type, as percentages of transaction count, with raw count) ---
  const barChartData = useMemo(() => {
    const map: Record<string, { label: string; paid: number; partial: number; unpaid: number; count: number }> = {};
    sortedTxns.forEach(t => {
      const r = requirementMap[t.requirement_id];
      const label = r?.title || `Fee #${t.requirement_id}`;
      if (!map[label]) map[label] = { label, paid: 0, partial: 0, unpaid: 0, count: 0 };
      if (t.payment_status === 'paid') map[label].paid += 1;
      else if (t.payment_status === 'partial') map[label].partial += 1;
      else if (t.payment_status === 'unpaid') map[label].unpaid += 1;
      map[label].count += 1;
    });
    // Convert to percentages
    return Object.values(map).map(row => {
      const total = row.paid + row.partial + row.unpaid;
      return {
        label: row.label,
        paid: total ? (row.paid / total) * 100 : 0,
        partial: total ? (row.partial / total) * 100 : 0,
        unpaid: total ? (row.unpaid / total) * 100 : 0,
        count: row.count,
      };
    });
  }, [sortedTxns, requirementMap]);

  // --- Aggregation for Area Chart (by Day, only paid and partial) ---
  const areaChartData = useMemo(() => {
    const map: Record<string, { label: string; paid: number; partial: number }> = {};
    sortedTxns.forEach(t => {
      // Use only the date part for label (yyyy-MM-dd)
      const dateObj = new Date(t.date_added);
      const label = dateObj.toISOString().slice(0, 10); // yyyy-MM-dd
      if (!map[label]) map[label] = { label, paid: 0, partial: 0 };
      if (t.payment_status === 'paid') map[label].paid += t.amount_paid;
      else if (t.payment_status === 'partial') map[label].partial += t.amount_paid;
    });
    // Sort by date ascending
    return Object.values(map).sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  }, [sortedTxns]);

  // Add scroll-to-top button logic
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

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar />
      <div className="flex-1 ml-64 relative flex flex-col">
        <div className="p-5 pb-0">
          <Breadcrumb items={trail} />
          <div className="flex items-center justify-between dark:border-gray-700 pt-0 mb-0">
            <div className="flex-1">
              <Searchbar search={search} onSearchChange={setSearch} />
            </div>
            <div className="flex items-center space-x-2 ml-4 relative">
              <ToastContainer />
              <FilterDropdownTxn
          isOpen={showFilter}
          toggle={() => setShowFilter(v => !v)}
          filters={filters}
          setFilters={setFilters}
          methodsList={methodsList}
          courses={courses}
          years={years}
          sections={sections}
              />
              
             <div className="flex items-center gap-2 dark:text-white">
              <div id="date-range-picker" className="flex items-center">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>
            </div>

              <button
                onClick={handleGenerateReport}
               className="py-3 bg-primary-600 hover:bg-primary-400 focus:ring-primary-300 px-3 flex items-center text-sm font-medium text-white rounded-lg shadow-md  transition-transform duration-200 ease-in-out transform hover:scale-105"
              >
                 <svg className="w-5 h-5 mr-1 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Zm-1 9a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2Zm2-5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 4a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0v-3Z" clipRule="evenodd"/>
      </svg>
                Generate Report
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 overflow-auto p-5 pt-0">
          {reportGenerated ? (
            <>
              <div ref={tableRef} className="overflow-x-auto shadow-md relative z-10 mb-8">
                <table className="min-w-full bg-white dark:bg-gray-800 rounded-t-lg overflow-hidden shadow dark:text-white text-s">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                    {[
                        'Name','Course','Year','Section','Fee Title',
                        'Amount Due','Amount Paid','Status',
                        'Due Date','Date Added'
                  ].map(col => (
                    <th key={col} className="px-4 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                    {sortedTxns.length === 0 ? null : paginatedTxns.map(t => {
                  const u = userMap[t.user_id];
                  const r = requirementMap[t.requirement_id];
                  return (
                        <tr key={t.transaction_id} className="border-b dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 ">
                          <td className="px-3.5 py-3.5 flex items-center">
                        <img
                       src={u?.avatar || placeholderImage}
                       alt={`${u?.user_fname} avatar`}
                       className="w-5 h-5 rounded-full mr-2 object-cover"
                        />
                        {u ? `${u.user_fname} ${u.user_lname}` : `#${t.user_id}`}
                      </td>
                          <td className="px-4 py-2">{u?.course ?? '–'}</td>
                      <td className="px-4 py-2">{u?.year ?? '–'}</td>
                      <td className="px-4 py-2">{u?.section || '–'}</td>
                      <td className="px-4 py-2">{r?.title || '–'}</td>
                      <td className="px-4 py-2">₱{r?.amount_due.toFixed(2)}</td>
                      <td className="px-4 py-2">₱{t.amount_paid.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className={`capitalize px-2 py-1 rounded ${
                          t.payment_status === 'paid' ? 'bg-green-100 text-green-800'
                          : t.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'}`}>{t.payment_status}</span>
                      </td>
                      <td className="px-4 py-2">{new Date(t.due_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{new Date(t.date_added).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

                {/* Pagination Row */}
                <nav
                  className="bg-gray-800  rounded-b-lg flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4"
                  aria-label="Table navigation"
                >
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
              {/* Charts Section */}
              <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="max-w-md w-full flex-shrink-0 flex justify-center">
                    <TransactionReportChart paid={paidCount} unpaid={unpaidCount} partial={partialCount} />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <TransactionReportBarChart data={barChartData} />
                  </div>
                </div>
                <div>
                  <TransactionReportAreaChart data={areaChartData} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500 text-lg py-20">
              Please select date range and click <b>Generate Report</b> to view the transactional fees breakdown.
            </div>
          )}
        </div>
        {showScrollButton && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-3 right-3 ml-2 transform  p-3 bg-white/40 dark:bg-gray-900 rounded-full shadow-lg transition-all duration-300 hover:bg-white/70 dark:hover:bg-gray-700/70 z-50 border border-gray-200 dark:border-gray-700"
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

export default TransactionReport;