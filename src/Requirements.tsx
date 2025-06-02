import React, { useState, useContext, useEffect, useRef } from "react";
import { ThemeContext } from './theme/ThemeContext';
import { Button, Modal } from "flowbite-react";
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Searchbar from "./components/Searchbar";
import FilterDropdownReq, { Filters } from "./components/FilterDropdownReq";
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';
import placeholderImage from "./assets/questionPlaceholder.png"; 

type RequirementType = 'event' | 'activity' | 'fee';
type RequirementStatus = 'scheduled' | 'ongoing' | 'canceled' | 'completed';

interface Requirement {
  requirement_id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  requirement_type: 'event' | 'activity' | 'fee';
  status: 'scheduled' | 'ongoing' | 'canceled' | 'completed';
  club_id: number;
  amount_due: number;
  req_picture: string; 
  date_added: string;
}

const Requirements: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRequirement, setPreviewRequirement] = useState<Requirement | null>(null);
  const { isDark, theme, setTheme } = useContext(ThemeContext);
  const toggleDarkMode = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [myDeletionRequests, setMyDeletionRequests] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReqId, setCancelReqId] = useState<number | null>(null);

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Requirements' }
  ];

  const emptyForm = {
    title: "",
    description: "",
    start_datetime: "",
    end_datetime: "",
    location: "",
    requirement_type: "event" as Requirement["requirement_type"],
    status: "scheduled" as Requirement["status"],
    club_id: 0,
     req_picture: "",
    amount_due: 0.00
  };

  const [form, setForm] = useState(emptyForm);

  const fetchRequirements = async () => {
    try {
      const res = await fetch("http://localhost/my-app-server/get_requirement.php", {
        credentials: "include",
      });
  
      // Handle HTTP errors first
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Server error');
      }
  
      const data = await res.json();
      
      // Validate response is array
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }
  
      // Add data validation/normalization
      const validatedData = data.map(item => ({
        ...item,
        req_picture: item.req_picture || '',
        amount_due: Number(item.amount_due) || 0,
        start_datetime: item.start_datetime || '',
        requirement_type: item.requirement_type || '',
        end_datetime: item.end_datetime || ''
      }));
  
      setRequirements(validatedData);
    } catch (e) {
      console.error("Fetch error:", e);
      toast.error(e instanceof Error ? e.message : 'Failed to load requirements');
      setRequirements([]);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  // Add scroll event listener to show/hide the scroll button
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

  // Function to scroll back to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const t = e.target as HTMLInputElement;
    
    if (t.type === "file" && t.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setForm(prev => ({ ...prev, req_picture: reader.result as string }));
        }
      };
      reader.readAsDataURL(t.files[0]);
    } else {
      const { name, value } = e.target;
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const addRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) return toast.error("Title is required!");
    if (!form.description.trim()) return toast.error("Description is required!");
    if (!form.start_datetime) return toast.error("Start date is required!");
    if (!form.end_datetime) return toast.error("End date is required!");

    try {
        const res = await fetch("http://localhost/my-app-server/add_requirement.php", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            req_picture: form.req_picture || null
          })
        });

      const data = await res.json();
      if (res.ok) {
        toast.success("Requirement added successfully!");
        setIsAddOpen(false);
        setForm(emptyForm);
        await fetchRequirements();
      } else {
        toast.error(`Add failed: ${data.error}`);
      }
    } catch (err: any) {
        toast.error(err.message || 'Failed to add requirement');
      }
    };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    try {
      const res = await fetch("http://localhost/my-app-server/update_requirement.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, requirement_id: editId })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Requirement updated successfully!");
        setIsEditOpen(false);
        setEditId(null);
        setForm(emptyForm);
        await fetchRequirements();
      } else {
        toast.error(`Update failed: ${data.error}`);
      }
    } catch (err: any) {
      toast.error(`Network error: ${err.message}`);
    }
  };

  const deleteRequirement = async () => {
    if (!requirementToDelete) return;
    try {
      const resRole = await fetch("http://localhost/my-app-server/get_current_user.php", { credentials: "include" });
      const user = await resRole.json();
      const role = user.role ? user.role.toLowerCase() : null;
      if (role === 'adviser') {
        // Adviser: delete directly
        const res = await fetch(
          `http://localhost/my-app-server/delete_requirement.php?requirement_id=${requirementToDelete}`,
          { method: "DELETE", credentials: "include" }
        );
        if (res.ok) {
          toast.success("Requirement deleted successfully!");
          await fetchRequirements();
        } else {
          const data = await res.json();
          toast.error(`Delete failed: ${data.error}`);
        }
      } else {
        // President/Officer: request deletion
        const reasonToSend = deleteReason.trim() || "Request to delete requirement.";
        const res = await fetch("http://localhost/my-app-server/add_deletion_request.php", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "requirement",
            target_id: requirementToDelete,
            reason: reasonToSend
          })
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
        if (res.ok) {
          toast.success("Delete request sent for approval.");
        } else {
          toast.error(`Request failed: ${data.error || "Unknown error"}`);
        }
      }
    } catch (err: any) {
      toast.error(`Network error: ${err.message}`);
    } finally {
      setIsDeleteModalOpen(false);
      setRequirementToDelete(null);
      setDeleteReason("");
    }
  };

  const openEdit = (r: Requirement) => {
    setEditId(r.requirement_id);
    setForm(prev => ({
      title: r.title,
      description: r.description,
      start_datetime: r.start_datetime.split(' ')[0],
      end_datetime:   r.end_datetime.split(' ')[0],
      location: r.location,
      requirement_type: r.requirement_type,
      status: r.status,
      club_id: r.club_id,
      amount_due: r.amount_due,
       req_picture: r.req_picture || placeholderImage
    }));
    setIsEditOpen(true);
  };

  const [filters, setFilters] = useState<Filters>({
    search: "",
    types: { event: false, activity: false, fee: false },
    statuses: { scheduled: false, ongoing: false, canceled: false, completed: false }
  });



  const filteredRequirements = requirements.filter(r => {
    const term = filters.search.toLowerCase();
    if (term && !r.title.toLowerCase().includes(term)) return false;
  
    // Check types with proper type assertion
    const selectedTypes = (Object.keys(filters.types) as RequirementType[]).filter(t => filters.types[t]);
    if (selectedTypes.length > 0 && !selectedTypes.includes(r.requirement_type)) return false;
  
    // Check statuses with proper type assertion
    const selectedStatuses = (Object.keys(filters.statuses) as RequirementStatus[]).filter(s => filters.statuses[s]);
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(r.status)) return false;
  
    return true;
  });
  
  // Update your getSelectedFilters function with proper typing
  function getSelectedFilters<T extends string>(filterObj: Record<T, boolean>): T[] {
    return (Object.keys(filterObj) as T[]).filter(key => filterObj[key]);
  }
  
  

  const fetchMyDeletionRequests = async () => {
    try {
      const res = await fetch("http://localhost/my-app-server/get_deletion_requests.php", { credentials: "include" });
      const data = await res.json();
      setMyDeletionRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      setMyDeletionRequests([]);
    }
  };

  useEffect(() => {
    fetchMyDeletionRequests();
  }, []);

  const cancelDeletionRequest = async (requestId: number) => {
    try {
      const res = await fetch("http://localhost/my-app-server/cancel_deletion_request.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Request cancelled");
        await fetchMyDeletionRequests();
        await fetchRequirements();
      } else {
        toast.error(data.error || "Failed to cancel request");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const handleCancelClick = (requestId: number) => {
    setCancelReqId(requestId);
    setShowCancelModal(true);
  };

  useEffect(() => {
    const handler = () => {
      fetchMyDeletionRequests();
      fetchRequirements && fetchRequirements();
    };
    window.addEventListener('deletion-request-status', handler);
    return () => window.removeEventListener('deletion-request-status', handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar
      />

      <div className="flex-1 sm:ml-64 relative flex flex-col">
        <div className="p-3 sm:px-5 sm:pt-5 sm:pb-1">
          <Breadcrumb items={trail} />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between dark:border-gray-700 pt-0 mb-0 gap-4 sm:gap-0">
            <div className="flex-1 max-w-md">
              <Searchbar
                search={filters.search}
                onSearchChange={term => setFilters(f => ({ ...f, search: term }))}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-0 sm:ml-4 relative">
              <ToastContainer />
              <Button
                onClick={() => {
                    setForm(emptyForm);
                    setIsAddOpen(true);
                  }}
                className="bg-primary-600 py-1 hover:bg-primary-400 text-white dark:bg-primary-600 dark:hover:bg-primary-400 focus:ring-primary-300 rounded-lg shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105 text-xs sm:text-sm px-3 sm:px-4"
              >
                <span className="hidden sm:inline">+ Add Requirement</span>
                <span className="sm:hidden">+ Add</span>
              </Button>
              <FilterDropdownReq
                isOpen={showFilter}
                toggle={() => setShowFilter(!showFilter)}
                filters={filters}
                setFilters={setFilters}
                types={['event', 'activity', 'fee']}
                statuses={['scheduled', 'ongoing', 'canceled', 'completed']}
                />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:px-5 sm:pt-0 sm:pb-5">
          <div ref={tableRef} className="overflow-x-auto shadow-md relative z-10">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow dark:text-white">
            <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                    {['Title', 'Type', 'Status', 'Start Date', 'End Date', 'Location', 'Amount', 'Actions'].map((col) => (
                    <th key={col} className="p-2 px-4 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        {col}
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {filteredRequirements.map(r => (
                    <tr key={r.requirement_id} className="border-b dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                    <td className="px-4 py-3 flex items-center">
                        <img
                        src={r.req_picture || placeholderImage}
                        alt="Requirement"
                        className="w-8 h-8 rounded object-cover mr-2"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = placeholderImage;
                        }}
                        />
                        <span className="text-gray-800 dark:text-gray-100">
                        {r.title}
                        </span>
                    </td>
                    <td className="px-4 py-3">
                        <span className={`capitalize px-2 py-1 rounded ${
                        r.requirement_type === 'event' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                        r.requirement_type === 'activity' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                        }`}>
                        {r.requirement_type}
                        </span>
                    </td>
                    <td className="px-4 py-3">
                        <span className={`capitalize px-2 py-1 rounded ${
                        r.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                        r.status === 'ongoing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                        r.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                        'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        }`}>
                        {r.status}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {new Date(r.start_datetime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {new Date(r.end_datetime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-100">{r.location}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                        {r.requirement_type === 'fee' ? 
                        `₱${Number(r.amount_due).toFixed(2)}` :  
                        '-'
                        }
                    </td>
                    <td className="px-4 py-3  ">
                        <div className="flex items-center space-x-2 ">
                            <button
                            onClick={() => openEdit(r)}
                            className="px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-400 whitespace-nowrap transition-transform duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center"
                            >
                                <svg aria-hidden="true" className="mr-1 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                            Edit
                            </button>
                            <button
                            onClick={() => {
                            setPreviewRequirement(r);
                            setIsPreviewOpen(true);
                            }}
                            className="py-1 pt-2 pb-2 px-3 flex items-center text-sm font-medium text-center text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-primary-400 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 transition-transform duration-200 ease-in-out transform hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2 -ml-0.5">
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" />
                            </svg>
                            Preview
                        </button>
                            {myDeletionRequests.find(
                              req => req.type === "requirement" && req.target_id === r.requirement_id && req.status === "pending"
                            ) ? (
                              <button
                                onClick={() => handleCancelClick(myDeletionRequests.find(
                                  req => req.type === "requirement" && req.target_id === r.requirement_id && req.status === "pending"
                                )?.request_id)}
                                className="flex items-center justify-center px-7 py-2 text-sm font-medium text-white rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 ease-in-out transform hover:scale-105"
                              >
                                <svg aria-hidden="true" className="w-5 h-5 mr-1.5 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
                                </svg>
                                Cancel
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setRequirementToDelete(r.requirement_id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="px-6 py-2 text-sm font-medium border border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 whitespace-nowrap transition-transform duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center"
                              >
                                <svg aria-hidden="true" className="w-5 h-5 mr-1.5 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
                                </svg>
                                Request
                              </button>
                            )}
                        </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        </div>

        {/* Scroll to top button */}
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

      {/* Add Modal */}
    <Modal
        show={isAddOpen}
        onClose={() => {
          setIsAddOpen(false)
          setForm(emptyForm)  
        }}
      >
        <Modal.Header className="dark:bg-gray-800 rounded">Add New Requirement</Modal.Header>
        <Modal.Body className="dark:bg-gray-800 dark:text-white py-2 pb-8 rounded">
          <form onSubmit={addRequirement} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block mb-1 text-sm">Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                required
                 className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                required
                 className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block mb-1 text-sm">Start Date</label>
                    <input
                    type="date"
                    name="start_datetime"
                    value={form.start_datetime}
                    onChange={handleFormChange}
                    required
                     className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                    />
                </div>
                <div>
                    <label className="block mb-1 text-sm">End Date</label>
                    <input
                    type="date"
                    name="end_datetime"
                    value={form.end_datetime}
                    onChange={handleFormChange}
                    required
                     className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                    />
                </div>
                </div>

            <div>
              <label className="block mb-1 text-sm">Location</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleFormChange}
                 className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm">Type</label>
                <select
                  name="requirement_type"
                  value={form.requirement_type}
                  onChange={handleFormChange}
                   className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                >
                  <option value="event">Event</option>
                  <option value="activity">Activity</option>
                  <option value="fee">Fee</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                   className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="canceled">Canceled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            {form.requirement_type === 'fee' && (
              <div>
                <label className="block mb-1 text-sm">Amount Due</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount_due"
                  value={form.amount_due}
                  onChange={handleFormChange}
                   className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                />
              </div>
            )}

                <div className="mb-0 mt-4">
                <span className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Requirement Image
                </span>
                <div className="flex justify-center items-center w-full">
                    <label 
                    htmlFor="dropzone-file"
                    className="flex flex-col justify-center items-center w-full h-48 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 relative"
                    >
                    {form.req_picture ? (
                        <div className="w-full h-full flex items-center justify-center">
                        <img 
                            src={form.req_picture} 
                            alt="Preview" 
                            className="max-h-full max-w-full object-contain p-2 rounded-lg"
                        />
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center pt-5 pb-6">
                        <svg 
                            aria-hidden="true" 
                            className="mb-3 w-10 h-10 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                            />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span>
                            
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            SVG, PNG, or JPG (MAX. 800x400px)
                        </p>
                        </div>
                    )}
                    <input 
                        id="dropzone-file" 
                        type="file" 
                        className="hidden"
                        accept="image/*"
                        name="req_picture"
                        onChange={handleFormChange}
                    />
                    </label>
                </div>
                </div>

            <div className="mt-0">
              <Button type="submit" className="w-50 bg-primary-600 hover:bg-primary-400 ">
                Create Requirement
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

    {/* Edit Modal */}
<Modal show={isEditOpen} onClose={() => setIsEditOpen(false)}>
<Modal.Header className="dark:bg-gray-800 rounded">Edit Requirement</Modal.Header>
<Modal.Body className="dark:bg-gray-800 dark:text-white py-2 pb-2 rounded">
    <form onSubmit={saveEdit} className="grid grid-cols-1 gap-4">
      <div>
        <label className="block mb-1 text-sm">Title</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleFormChange}
          required
           className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      <div>
        <label className="block mb-1 text-sm">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleFormChange}
          required
           className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">Start Date</label>
          <input
            type="date"
            name="start_datetime"
            value={form.start_datetime}
            onChange={handleFormChange}
            required
             className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">End Date</label>
          <input
            type="date"
            name="end_datetime"
            value={form.end_datetime}
            onChange={handleFormChange}
            required
             className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1 text-sm">Location</label>
        <input
          type="text"
          name="location"
          value={form.location}
          onChange={handleFormChange}
           className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">Type</label>
          <select
            name="requirement_type"
            value={form.requirement_type}
            onChange={handleFormChange}
             className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          >
            <option value="event">Event</option>
            <option value="activity">Activity</option>
            <option value="fee">Fee</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 text-sm">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleFormChange}
             className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          >
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="canceled">Canceled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {form.requirement_type === 'fee' && (
        <div>
          <label className="block mb-1 text-sm">Amount Due</label>
          <input
            type="number"
            step="0.01"
            name="amount_due"
            value={form.amount_due}
            onChange={handleFormChange}
             className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      )}

                <div className="mb-0">
                <span className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    Requirement Image
                </span>
                <div className="flex justify-center items-center w-full">
                    <label 
                    htmlFor="edit-dropzone-file"
                    className="flex flex-col justify-center items-center w-full h-48 bg-gray-50 rounded-lg border-2 border-gray-300 border-dashed cursor-pointer dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 relative"
                    >
                    {form.req_picture ? (
                        <div className="w-full h-full flex items-center justify-center">
                        <img 
                            src={form.req_picture} 
                            alt="Current" 
                            className="max-h-full max-w-full object-contain p-2 rounded-lg"
                        />
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center items-center pt-5 pb-6">
                        <svg 
                            aria-hidden="true" 
                            className="mb-3 w-10 h-10 text-gray-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                            />
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span>
                     
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            SVG, PNG, or JPG (MAX. 800x400px)
                        </p>
                        </div>
                    )}
                    <input 
                       id="edit-dropzone-file"
                       type="file"
                       className="hidden"
                       accept="image/*"
                       name="req_picture"
                       onChange={handleFormChange}
                    />
                    </label>
                </div>
                </div>

      <div className="mt-0">
        <Button type="submit" className="w-50 bg-primary-600 hover:bg-primary-400 mb-3 mt-1">
          Apply Changes
        </Button>
      </div>
    </form>
  </Modal.Body>
</Modal>

    {/* Delete Requirement Modal */}
<Modal show={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeleteReason(""); }}>
  <Modal.Header className="dark:bg-gray-800">Request Requirement Deletion</Modal.Header>
  <Modal.Body className="dark:bg-gray-800 dark:text-white rounded">
    {requirementToDelete && (() => {
      const r = requirements.find(x => x.requirement_id === requirementToDelete);
      if (!r) return null;
      return (
        <form className="space-y-6 overflow-y-auto max-h-[80vh]">
          <div className="rounded-lg shadow bg-white dark:bg-gray-900 p-5 flex flex-col md:flex-row gap-6 items-center border border-gray-200 dark:border-gray-700">
            <img src={r.req_picture || placeholderImage} alt="Requirement" className="w-32 h-32 rounded object-cover border border-gray-300 dark:border-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{r.title}</span>
                <span className={`capitalize px-2 py-1 rounded text-xs font-semibold ml-2 ${
                  r.requirement_type === 'event' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                  r.requirement_type === 'activity' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                  'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
                }`}>{r.requirement_type}</span>
                <span className={`capitalize px-2 py-1 rounded text-xs font-semibold ml-2 ${
                  r.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                  r.status === 'ongoing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                  r.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                  'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                }`}>{r.status}</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z" /></svg>
                  <span>{r.location || 'No location'}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span>{new Date(r.start_datetime).toLocaleDateString()} - {new Date(r.end_datetime).toLocaleDateString()}</span>
                </div>
                {r.requirement_type === 'fee' && (
                  <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 7v7" /></svg>
                    <span>₱{Number(r.amount_due).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700 mb-4">
                  <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    <span className="font-medium">Note:</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Deletion will remove all the transactions tied to this specific requirement. This action cannot be undone once approved by the adviser.
                  </p>
                </div>

          {/* Reason */}
          <div>
            <label className="block mb-1 text-sm">Reason for deletion (optional)</label>
            <textarea
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              placeholder="e.g. No longer needed, duplicate, etc."
              rows={3}
            />
          </div>
          {/* Buttons */}
          <div className="flex justify-start space-x-2 mt-4">
            <Button type="button" color="failure" onClick={async () => {
              if (!requirementToDelete) return;
              try {
                await deleteRequirement();
                await fetchMyDeletionRequests();
                await fetchRequirements();
              } catch (err: any) {
                toast.error(err.message);
              } finally {
                setIsDeleteModalOpen(false);
                setRequirementToDelete(null);
                setDeleteReason("");
              }
            }} className="px-8 bg-red-600 hover:bg-red-700 text-white">
              Request Deletion
            </Button>
            <Button type="button" color="gray" onClick={() => { setIsDeleteModalOpen(false); setDeleteReason(""); }} className="border border-gray-300 dark:border-gray-600">
              Cancel
            </Button>
          </div>
        </form>
      );
    })()}
  </Modal.Body>
</Modal>

{/* Preview Drawer  */}
<div className={`fixed inset-0 z-50 ${isPreviewOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
  {/* Overlay*/}
  <div 
    className={`absolute inset-0 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ${
      isPreviewOpen ? 'opacity-100' : 'opacity-0'
    }`}
    onClick={() => setIsPreviewOpen(false)}
  ></div>
  
  {/* Drawer Content */}
  <div 
    className={`relative z-50 h-full p-4 overflow-y-auto transition-transform duration-300 ease-in-out ${
      isPreviewOpen ? 'translate-x-0' : '-translate-x-full'
    } w-full max-w-2xl bg-white dark:bg-gray-800`}
    onClick={(e) => e.stopPropagation()}
  >
    {previewRequirement && (
      <>
        {/* Header and Close button */}
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
            Requirement Details
          </h4>
          <button
            onClick={() => setIsPreviewOpen(false)}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span className="sr-only">Close drawer</span>
          </button>
        </div>

        {/* Requirement Title and Type */}
        <div className="flex items-center space-x-4 mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
              {previewRequirement.title}
            </h5>
            <div className="flex items-center mt-2">
              <span className={`capitalize inline-block px-2 py-1 text-sm font-normal rounded mr-2 ${
                previewRequirement.requirement_type === 'event' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                previewRequirement.requirement_type === 'activity' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100'
              }`}>
                {previewRequirement.requirement_type}
              </span>
              <span className={`capitalize inline-block px-2 py-1 text-sm font-normal rounded ${
                previewRequirement.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                previewRequirement.status === 'ongoing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                previewRequirement.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
              }`}>
                {previewRequirement.status}
              </span>
            </div>
          </div>
        </div>

        {/* Image */}
        {previewRequirement.req_picture && (
          <div className="mb-6">
         <img 
              src={previewRequirement.req_picture || placeholderImage} 
              alt="Requirement" 
              className="w-full h-64 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = placeholderImage;
              }}
            />
          </div>
        )}

        {/* Financial details - only for fee type */}
        {previewRequirement.requirement_type === 'fee' && (
          <div className="mb-6">
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Financial Details</h5>
            <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
              <dt className="font-semibold text-gray-900 dark:text-white">Amount Due</dt>
              <dd className="text-gray-500 dark:text-gray-400">₱{Number(previewRequirement.amount_due).toFixed(2)}</dd>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h5>
          <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700 min-h-[80px]">
            <p className="text-gray-500 dark:text-gray-400 whitespace-pre-line">
              {previewRequirement.description || '—'}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
            <dt className="font-semibold text-gray-900 dark:text-white">Start Date</dt>
            <dd className="text-gray-500 dark:text-gray-400">
              {new Date(previewRequirement.start_datetime).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </dd>
          </div>

          <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
            <dt className="font-semibold text-gray-900 dark:text-white">End Date</dt>
            <dd className="text-gray-500 dark:text-gray-400">
              {new Date(previewRequirement.end_datetime).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </dd>
          </div>
        </div>

        {/* Location */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</h5>
          <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              {previewRequirement.location || 'No location specified'}
            </p>
          </div>
        </div>

        {/* Date Added */}
        <div className="mb-6">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Added</h5>
          <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              {new Date(previewRequirement.date_added).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Edit/Delete Buttons at Bottom */}
        <div className="flex space-x-4 mt-8">
          <Button 
            onClick={() => {
              setIsPreviewOpen(false);
              openEdit(previewRequirement);
            }}
            className="w-full bg-primary-600 hover:bg-primary-400 py-1"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 mt-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/>
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"/>
              </svg>
              <span className="text-base font-medium">Edit</span>
            </div>
          </Button>
          <Button 
            color="failure" 
            onClick={() => {
              setIsPreviewOpen(false);
              setRequirementToDelete(previewRequirement.requirement_id);
              setIsDeleteModalOpen(true);
            }}
            className="w-full py-1"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 mt-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
              </svg>
              <span className="text-base font-medium">Delete</span>
            </div>
          </Button>
        </div>
      </>
    )}
  </div>
</div>

{/* Cancel Request Confirmation Modal */}
{showCancelModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-80">
    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
      <button
        type="button"
        className="text-gray-400 absolute top-3 right-3 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
        onClick={() => setShowCancelModal(false)}
      >
        <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
        <span className="sr-only">Close modal</span>
      </button>
      <svg className="text-gray-400 dark:text-gray-500 w-11 h-11 mb-3.5 mx-auto" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
      <p className="mb-6 text-gray-600 dark:text-gray-300 text-lg font-medium text-center">Are you sure you want to cancel your deletion request?</p>
      <div className="flex justify-center items-center space-x-4 mt-4">
        <button
          type="button"
          className="transition-colors duration-300 py-2 px-5 text-sm font-medium text-gray-500 bg-white rounded-lg border border-gray-200 hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-primary-300 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
          onClick={() => setShowCancelModal(false)}
        >
          No, keep request
        </button>
        <button
          type="button"
          className="transition-colors duration-300 py-2 px-5 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
          onClick={async () => {
            if (cancelReqId != null) {
              await cancelDeletionRequest(cancelReqId);
            }
            setShowCancelModal(false);
            setCancelReqId(null);
          }}
        >
          Yes, cancel request
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default Requirements;