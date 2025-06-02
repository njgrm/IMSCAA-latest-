import React, { useState, useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button, Modal, Drawer } from "flowbite-react";
import headerlogo from "./assets/headerlogo.png";
import headerlogoDark from "./assets/headerlogoDark.png";
import aboutPic from "./assets/aboutPic.png";
import aboutPic2 from "./assets/aboutPic2.png";
import aboutPic3 from "./assets/aboutPic3.png";
import { motion, useAnimation, useMotionValue  } from "motion/react"
import aboutPic4 from "./assets/aboutPic4.svg";
import aboutPic4Dark from "./assets/aboutPic4Dark.svg";
import manage from "./assets/manage.svg";
import integrate from "./assets/integrate.svg";
import streamline from "./assets/streamline.svg";
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import placeholderImage from "./assets/profilePlaceholder.png"; 
import Searchbar from "./components/Searchbar";
import FilterDropdown, { Filters } from "./components/FilterDropdown";
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';
import { ThemeContext } from './theme/ThemeContext';
import GenerateInviteDropdown from "./components/GenerateInviteDropdown";
import QRCodeDisplay from './components/QRCodeDisplay';



interface Student {
  user_id: number;
  school_id: string;
  user_fname: string;
  user_mname: string;
  user_lname: string;
  email: string;
  role: "President" | "Officer" | "Member" | "Adviser";
  course: string;
  year: string;
  section: string;
  avatar?: string;
  club_id: number;
}

interface DeletionRequest {
  request_id: number;
  type: string;
  target_id: number;
  reason: string;
  requested_by: number;
  requested_at: string;
  status: string;
}

interface QRCodeData {
  qr_id: number;
  qr_code_data: string;
  generated_at: string;
  is_active: boolean;
  user: {
    user_id: number;
    user_fname: string;
    user_lname: string;
  };
}

const Crud: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [editStudentId, setEditStudentId] = useState<number | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<number | null>(null);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    roles: { President: false, Officer: false, Member: false, Adviser: false },
    course: '',
    year: '',
    section: '',
  });
  const [myDeletionRequests, setMyDeletionRequests] = useState<DeletionRequest[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReqId, setCancelReqId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const { theme, setTheme } = useContext(ThemeContext);
  const isDarkMode = theme === "dark";
  const toggleDarkMode = () => setTheme(isDarkMode ? 'light' : 'dark');

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Members' }
  ];

  const emptyForm = {
    fname: "",
    mname: "",
    lname: "",
    school_id: "",
    email: "",
    role: "Member" as Student["role"],
    course: "BS Information Technology" as Student["course"],
    year: "",
    section: "",
    avatar: "",
    club_id: 0,
  };
  const [form, setForm] = useState(emptyForm);


  // Helper to fetch / refresh
  const fetchUsers = async () => {
    try {
      const res = await fetch(
        "http://localhost/my-app-server/get_user.php",
        {
          credentials: "include",
        }
      );
      const data: any[] = await res.json();
      console.log("Raw students payload:", data);

      // ← NEW: normalize roles + years so the filter strings line up
      const normalized = data.map(u => ({
        ...u,
        // if your API returns "officer" → turn to "Officer"
        role: capitalize(u.role),
        // if your API returns numeric year 2 → turn to "2"
        year: String(u.year),
      }));

      setStudents(normalized as Student[]);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  function capitalize(str: string): "President" | "Officer" | "Member" | "Adviser" | null {
    if (!str) return null;
    const s = str[0].toUpperCase() + str.slice(1).toLowerCase();
    if (s === "President" || s === "Officer" || s === "Member" || s === "Adviser") return s;
    return null;
  }
  

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Fetch current user role
    fetch("http://localhost/my-app-server/get_current_user.php", {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.role) setCurrentUserRole((data.role as string).toLowerCase());
      })
      .catch(() => setCurrentUserRole(""));
  }, []);

  useEffect(() => {
    const handler = () => {
      fetchUsers();
      fetchMyDeletionRequests();
    };
    window.addEventListener('member-registered', handler);
    return () => window.removeEventListener('member-registered', handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      fetchMyDeletionRequests();
    };
    window.addEventListener('deletion-request-status', handler);
    return () => window.removeEventListener('deletion-request-status', handler);
  }, []);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const t = e.target as HTMLInputElement;
    if (t.type === "file" && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () =>
        setForm((f) => ({ ...f, avatar: reader.result as string }));
      reader.readAsDataURL(t.files[0]);
    } else {
      const { name, value } = e.target;
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  // CREATE
  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fname.trim()) return toast.error("First name is required!");
    if (!form.lname.trim()) return toast.error("Last name is required!");
    if (!form.school_id.trim()) return toast.error("School ID is required!");
    if (!form.email.trim()) return toast.error("Email is required!");
    if (!form.role.trim()) return toast.error("Role is required!");
    if (!form.course.trim()) return toast.error("Course is required!");
    if (!form.year.trim()) return toast.error("Year is required!");
    if (!form.section.trim()) return toast.error("Section is required!");

    try {
        const res = await fetch("http://localhost/my-app-server/add_user.php", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fname: form.fname,
                mname: form.mname,
                lname: form.lname,
                school_id: form.school_id,
                email: form.email,
                role: form.role,
                course: form.course,
                year: form.year,
                section: form.section,
                avatar: form.avatar,
            }),
        });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: text };
        }

        if (res.ok) {
            toast.success("Student added successfully!"); // Success message
            setIsAddOpen(false);
            setForm(emptyForm);
            await fetchUsers();
        } else {
            toast.error(`Add failed: ${data.error || "Unknown error"}`); // Error message
            console.error("Add failed:", data);
        }
    } catch (err: any) {
        toast.error(`Network error: ${err.message}`); // Network error message
        console.error("Network error:", err);
    }
};

  // UPDATE
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentId) return;
  
    console.log("Sending this to server:", {
      user_id: editStudentId,
      fname: form.fname,
      mname: form.mname,
      lname: form.lname,
      school_id: form.school_id,
      email: form.email,
      role: form.role,
      course: form.course,
      year: form.year,
      section: form.section,
      avatar: form.avatar,
    });
  
    //  Validation
    if (!form.fname.trim()) return toast.error("First name is required!");
    if (!form.lname.trim()) return toast.error("Last name is required!");
    if (!form.school_id.trim()) return toast.error("School ID is required!");
    if (!form.email.trim()) return toast.error("Email is required!");
    if (!form.role.trim()) return toast.error("Role is required!");
  
    try {
      const res = await fetch("http://localhost/my-app-server/update_user.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: editStudentId,
          fname: form.fname,
          mname: form.mname,
          lname: form.lname,
          school_id: form.school_id,
          email: form.email,
          role: form.role,
          course: form.course,
          year: form.year,
          section: form.section,
          avatar: form.avatar,
          // club_id: form.club_id, // Remove this line
        }),
      });
  
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
  
      if (res.ok) {
        toast.success("Student updated successfully!");
        setIsEditOpen(false);
        setEditStudentId(null);
        setForm(emptyForm);
        await fetchUsers();
      } else {
        toast.error(`Update failed: ${data.error || "Unknown error"}`);
        console.error("Update failed:", data);
      }
    } catch (err: any) {
      toast.error(`Network error: ${err.message}`);
      console.error("Network error:", err);
    }
  };

  // DELETE
  const deleteStudent = async () => {
    if (!userToDelete) return;
    try {
      if ((currentUserRole || '').toLowerCase() === 'adviser') {
        // Adviser: delete directly
        const res = await fetch(
          `http://localhost/my-app-server/delete_user.php?user_id=${userToDelete}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
        if (res.ok) {
          toast.success("Student deleted successfully!");
          await fetchUsers();
        } else {
          toast.error(`Delete failed: ${data.error || "Unknown error"}`);
          console.error("Delete failed:", data);
        }
      } else {
        // President/Officer/Member: request deletion
        const reasonToSend = deleteReason.trim() || "Request to delete user.";
        const res = await fetch("http://localhost/my-app-server/add_deletion_request.php", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "user",
            target_id: userToDelete,
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
          toast.success("Delete request sent for approval");
          await fetchMyDeletionRequests();
        } else {
          toast.error(`Request failed: ${data.error || "Unknown error"}`);
        }
      }
    } catch (err: any) {
      toast.error(`Network error: ${err.message}`);
      console.error("Network error:", err);
    } finally {
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setDeleteReason("");
    }
  };

  // Cancel deletion request
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
      } else {
        toast.error(data.error || "Failed to cancel request");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const openEdit = (s: Student) => {
    setEditStudentId(s.user_id);
    setForm({
      fname: s.user_fname,
      mname: s.user_mname,
      lname: s.user_lname,
      school_id: s.school_id,
      email: s.email,
      role: s.role,
      course: s.course,
      year: s.year,
      section: s.section,
      avatar: s.avatar || "",
      club_id: s.club_id,
    });
    setIsEditOpen(true);
  };

  const courses   = Array.from(new Set(students.map(s => s.course)));
  const years     = Array.from(new Set(students.map(s => s.year)));
  const sections  = Array.from(new Set(students.map(s => s.section)));

  // 3) apply filters
  console.log("Current filters:", filters);
  const filteredStudents = students.filter(s => {
    // search on school_id or full name
    const term = filters.search.toLowerCase();
    if (term) {
      const fullName = `${s.user_fname} ${s.user_lname}`.toLowerCase();
      if (!s.school_id.toLowerCase().includes(term) &&
          !fullName.includes(term)) {
        return false;
      }
    }
    // role
    const selectedRoles = (Object.keys(filters.roles) as Array<keyof Filters['roles']>)
    .filter(roleKey => filters.roles[roleKey]);

  if (selectedRoles.length > 0 && !selectedRoles.includes(s.role as any)) {
    return false;
  }

  if (filters.course && s.course !== filters.course) return false;

  if (filters.year   && s.year   !== filters.year)   return false;

  if (filters.section&& s.section!== filters.section)return false;

  return true;
  });

  // Fetch user's own pending deletion requests
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

  const handleCancelClick = (requestId: number) => {
    setCancelReqId(requestId);
    setShowCancelModal(true);
  };

  const handleGenerateQR = async (userId: number) => {
    const student = students.find(s => s.user_id === userId);
    if (!student) {
      toast.error('User not found');
      return;
    }

    setQrLoading(true);
    try {
      const response = await fetch(`http://localhost/my-app-server/generate_qr_code.php?user_id=${userId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeData(data);
        setIsQRModalOpen(true);
        toast.success('QR code loaded successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load QR code');
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
      toast.error('Error loading QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const regenerateQRCode = async () => {
    if (!qrCodeData) return;
    
    setQrLoading(true);
    try {
      const response = await fetch('http://localhost/my-app-server/generate_qr_code.php', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: qrCodeData.user.user_id,
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

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar
      />

<div className="flex-1 sm:ml-64 relative flex flex-col">
  <div className="p-3 sm:px-5 sm:pt-5 sm:pb-1">
    <Breadcrumb items={trail} />
    <div className="flex flex-col sm:flex-row sm:items-center justify-between dark:border-gray-700 pt-0 mb-0 gap-4 sm:gap-0">
      {/* Left: Searchbar */}
      <div className="flex-1 max-w-md">
        <Searchbar
          search={filters.search}
          onSearchChange={term => setFilters(f => ({ ...f, search: term }))}
        />
      </div>

      {/* Right: Add button + FilterDropdown */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 ml-0 sm:ml-4 relative">
        <ToastContainer />
        {currentUserRole !== 'Member' && (
          <Button
            onClick={() => {
              setForm(emptyForm);
              if (currentUserRole === 'Officer') setForm(f => ({ ...f, role: 'Member' }));
              setIsAddOpen(true);
            }}
            className="bg-primary-600 py-1 px-2 hover:bg-primary-700 text-white dark:bg-primary-600 dark:hover:bg-primary-400 rounded-lg shadow-md transition-colors duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-opacity-50 text-xs sm:text-sm px-3 sm:px-4"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4H7Zm8-1a1 1 0 0 1 1-1h1v-1a1 1 0 1 1 2 0v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 0 1-1-1Z" clip-rule="evenodd"/>
            </svg>
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
        <div className="relative">
          <FilterDropdown
            isOpen={showFilter}
            toggle={() => setShowFilter(o => !o)}
            filters={filters}
            setFilters={setFilters}
            courses={courses}
            years={years}
            sections={sections}
          />
        </div>
        {currentUserRole === "adviser" && (
          <GenerateInviteDropdown userRole="Adviser" />
        )}
        {currentUserRole === "president" && (
          <GenerateInviteDropdown userRole="President" />
        )}
        {currentUserRole === "officer" && (
          <GenerateInviteDropdown userRole="Officer" />
        )}
      </div>
    </div>
  </div>


  <div className="flex-1 overflow-auto p-3 sm:px-5 sm:pt-0 sm:pb-5">
    <div ref={tableRef} className="overflow-x-auto shadow-md relative z-10">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow dark:text-white">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {[
                "School ID",
                "Name",
                "Email",
                "Role",
                "Course",
                "Year",
                "Section",
                "Actions",
              ].map((col) => (
                <th key={col} className="p-2 px-4 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
            <tbody>
              {filteredStudents.map((s) => {
                // Role-based permission logic
                const current = (currentUserRole || '').toLowerCase();
                const target = (s.role || '').toLowerCase();
                const canEditOrDelete = (() => {
                  if (current === 'adviser') return true;
                  if (current === 'president') {
                    if (target === 'adviser') return false;
                    return true;
                  }
                  if (current === 'officer') {
                    if (target === 'adviser' || target === 'president' || target === 'officer') return false;
                    return true;
                  }
                  return false;
                })();
                // Find if the current user has a pending deletion request for this student
                const myReq = myDeletionRequests.find(
                  req => req.type === "user" && req.target_id === s.user_id && req.status === "pending"
                );
                return (
                  <tr
                    key={s.user_id}
                    className="border-b dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {s.school_id}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center">
                        <img
                         src={s.avatar || placeholderImage}
                          alt={`${s.user_fname} ${s.user_lname}`}
                          className="w-8 h-8 rounded-full object-cover mr-2"
                        />
                        <span className="text-gray-800 dark:text-gray-100">
                          {`${s.user_fname} ${s.user_mname ? s.user_mname + '. ' : ''}${s.user_lname}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {s.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`capitalize inline-block px-2 py-1 text-sm font-normal rounded ${
                          (s.role || "").toLowerCase() === "president"
                            ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                            : (s.role || "").toLowerCase() === "officer"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                            : (s.role || "").toLowerCase() === "adviser"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        <span className="capitalize">
                          {s.role}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                      {s.course}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                      {s.year}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                      {s.section}
                    </td>
                    <td className="px-4 py-3 space-x-2 flex items-center">
                      {canEditOrDelete && (
                        <>
                          <button
                            onClick={() => openEdit(s)}
                            className="flex items-center justify-center px-6 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-400 transition-colors duration-200 ease-in-out transform hover:scale-105"
                          >
                            <svg aria-hidden="true" className="mr-1 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                             <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                               </svg>
                            Edit
                          </button>
                          {(currentUserRole || '').toLowerCase() === 'adviser' ? (
                            <button
                              onClick={() => {
                                setUserToDelete(s.user_id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="px-6 py-2 text-sm font-medium border border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-colors duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center"
                            >
                              <svg aria-hidden="true" className="w-5 h-5 mr-1.5 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                   <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
                                   </svg>
                              Delete
                            </button>
                          ) : myReq ? (
                            <button
                              onClick={() => handleCancelClick(myReq.request_id)}
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
                                setUserToDelete(s.user_id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="px-6 py-2 text-sm font-medium border border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-colors duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center"
                            >
                              <svg aria-hidden="true" className="w-5 h-5 mr-1.5 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
                              </svg>
                              Request
                            </button>
                          )}
                          
                          {/* Generate QR Code Button - Available for all admin roles */}
                          {['adviser', 'president', 'officer'].includes((currentUserRole || '').toLowerCase()) && (
                            <button
                              onClick={() => handleGenerateQR(s.user_id)}
                              className="px-4 py-2 text-sm font-medium border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center"
                            >
                              <svg className="w-5 h-5 mr-1.5 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4a1 1 0 011-1h3zm-1 2v1h-1V5h1zM11 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3zm2 2v-1h1v1h-1zM4 9h1v1H4V9zm7-5h1v1h-1V4zm0 5h1v1h-1V9zm5 0h1v1h-1V9zM9 9h1v1H9V9zm0 4h1v1H9v-1z" clipRule="evenodd"/>
                              </svg>
                              QR Code
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

      {/* ——— ADD MODAL ——— */}
<Modal
        show={isAddOpen}
        onClose={() => {
          setIsAddOpen(false)
          setForm(emptyForm)  
        }}
      >
  <Modal.Header className="dark:bg-gray-800">
        <div className="flex items-center">
            <svg className="w-6 h-6 mr-2 ml-1 text-primary-600" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2 9a4 4 0 0 0-4 4v1a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1a4 4 0 0 0-4-4H7Zm8-1a1 1 0 0 1 1-1h1v-1a1 1 0 1 1 2 0v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 0 1-1-1Z" clip-rule="evenodd"/>
            </svg>
                    Add New Member
                </div>
  </Modal.Header>
  <Modal.Body className="dark:bg-gray-800 dark:text-white rounded">
    <form onSubmit={addStudent} className="grid gr id-cols-1 sm:grid-cols-2 gap-4">
      {/* School ID */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">School ID</label>
        <input
          type = "text"
          name="school_id"
          value={form.school_id}
          onChange={handleFormChange}
          required
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      {/* Name Fields */}
      <div className="sm:col-span-2 grid grid-cols-3 gap-4">
        <div>
          <label className="block mb-1 text-sm">First Name</label>
          <input
            type = "text"
            name="fname"
            value={form.fname}
            onChange={handleFormChange}
            required
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Middle Initial</label>
          <input
           type = "text"
            name="mname"
            value={form.mname}
            onChange={handleFormChange}
            maxLength={1}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Last Name</label>
          <input
           type = "text"
            name="lname"
            value={form.lname}
            onChange={handleFormChange}
            required
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      </div>

      {/* Email */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleFormChange}
          required
          className="w-full px-3 py-2 bg-gray-50 border-gray-300 dark:bg-gray-700 rounded-lg border dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      {/* Role */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">Role</label>
        <select
          name="role"
          value={form.role}
          onChange={handleFormChange}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border-gray-300 rounded-lg border dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          disabled={currentUserRole === 'Officer'}
        >
          {currentUserRole === 'Officer' ? (
            <option value="Member">Member</option>
          ) : (
            <>
              <option value="President">President</option>
              <option value="Officer">Officer</option>
              <option value="Member">Member</option>
            </>
          )}
        </select>
      </div>

      {/* Course */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">Course</label>
        <select
          name="course"
          value={form.course}
          onChange={handleFormChange}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
        >
          <option value="BS Information Technology">BS Information Technology</option>
          <option value="BS Information Systems">BS Information Systems</option>
          <option value="BS Electrical Engineering">BS Electrical Engineering</option>
          <option value="BS Computer Engineering">BS Computer Engineering</option>
          <option value="BTVTED">BTVTED</option>
          <option value="Bachelor in Industrial Technology">Bachelor in Industrial Technology</option>
        </select>
      </div>

      {/* Year and Section */}
      <div className="sm:col-span-2 grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">Year</label>
          <input
             type="text"
            name="year"
            value={form.year}
            onChange={handleFormChange}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Section</label>
          <input
            type="text"
            name="section"
            value={form.section}
            onChange={handleFormChange}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      </div>

      {/* Avatar */}
        <div className="sm:col-span-2 flex items-center">
        <img
          src={form.avatar ? form.avatar : placeholderImage} // Add a placeholder URL
          alt="Avatar"
          className="w-16 h-16 rounded-full mr-4" // Adjusted class for alignment
        />
        <div className="flex-1">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white" htmlFor="user_avatar">
            Upload profile picture
          </label>
          <input
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            id="user_avatar"
            type="file"
            name="avatar"
            accept="image/*"
            onChange={handleFormChange}
            aria-describedby="user_avatar_help"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="sm:col-span-2 text-left flex justify-start space-x-2">
        <Button 
          type="submit" 
          className="w-full sm:w-auto px-10 bg-primary-600 hover:bg-primary-400 text-white focus:ring-primary-400 focus:border-primary-400 mt-2"
        >
          Create User
        </Button>
      </div>
    </form>
  </Modal.Body>
</Modal>

{/* ——— EDIT MODAL ——— */}
<Modal show={isEditOpen} onClose={() => setIsEditOpen(false)}>
  <Modal.Header className="dark:bg-gray-800">Edit Student</Modal.Header>
  <Modal.Body className="dark:bg-gray-800 dark:text-white rounded">
    <form onSubmit={saveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* School ID */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">School ID</label>
        <input
        type = "text"
          name="school_id"
          value={form.school_id}
          onChange={handleFormChange}
          required
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      {/* Name Fields */}
      <div className="sm:col-span-2 grid grid-cols-3 gap-4">
        <div>
          <label className="block mb-1 text-sm">First Name</label>
          <input
              type = "text"
            name="fname"
            value={form.fname}
            onChange={handleFormChange}
            required
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Middle Initial</label>
          <input
              type = "text"
            name="mname"
            value={form.mname}
            onChange={handleFormChange}
            maxLength={1}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Last Name</label>
          <input
              type = "text"
            name="lname"
            value={form.lname}
            onChange={handleFormChange}
            required
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      </div>

      {/* Email */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleFormChange}
          required
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
        />
      </div>

      {/* Role */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">Role</label>
        <select
          name="role"
          value={form.role}
          onChange={handleFormChange}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          disabled={currentUserRole === 'Officer' && isEditOpen}
        >
          <option value="President">President</option>
          <option value="Officer">Officer</option>
          <option value="Member">Member</option>
        </select>
      </div>

      {/* Course */}
      <div className="sm:col-span-2">
        <label className="block mb-1 text-sm">Course</label>
        <select
          name="course"
          value={form.course}
          onChange={handleFormChange}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
        >
          <option value="BS Information Technology">BS Information Technology</option>
          <option value="BS Information Systems">BS Information Systems</option>
          <option value="BS Electrical Engineering">BS Electrical Engineering</option>
          <option value="BS Computer Engineering">BS Computer Engineering</option>
          <option value="BTVTED">BTVTED</option>
          <option value="Bachelor in Industrial Technology">Bachelor in Industrial Technology</option>
        </select>
      </div>

      {/* Year and Section */}
      <div className="sm:col-span-2 grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">Year</label>
          <input
              type = "text"
            name="year"
            value={form.year}
            onChange={handleFormChange}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm">Section</label>
          <input
              type = "text"
            name="section"
            value={form.section}
            onChange={handleFormChange}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600 border-gray-300 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      </div>

      {/* Avatar */}
      <div className="sm:col-span-2 flex items-center">
        <img
          src={form.avatar ? form.avatar : placeholderImage} 
          alt="Avatar"
          className="w-16 h-16 rounded-full mr-4"
        />
        <div className="flex-1">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white" htmlFor="user_avatar">
            Upload profile picture
          </label>
          <input
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            id="user_avatar"
            type="file"
            name="avatar"
            accept="image/*"
            onChange={handleFormChange}
            aria-describedby="user_avatar_help"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="sm:col-span-2 text-left flex justify-start space-x-2">
        <Button 
          type="submit" 
          className="w-full sm:w-auto px-12 bg-primary-600 hover:bg-primary-400 text-white focus:ring-primary-400 focus:border-primary-400 mt-2"
        >
          Apply Changes
        </Button>
      </div>
    </form>
  </Modal.Body>
</Modal>

      {/* ——— DELETE MODAL ——— */}
      {(currentUserRole || '').toLowerCase() === 'adviser' ? (
        <Modal show={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeleteReason(""); }}>
          <Modal.Header className="dark:bg-gray-800">Confirm Deletion</Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white rounded">
            <div className="mb-4 text-center">Are you sure you want to delete this member? This action cannot be undone.</div>
            <div className="flex justify-end space-x-2">
              <Button color="failure" onClick={deleteStudent} className="px-8 bg-red-600 hover:bg-red-700 text-white">Delete</Button>
              <Button color="gray" onClick={() => { setIsDeleteModalOpen(false); setDeleteReason(""); }} className="border border-gray-300 dark:border-gray-600">Cancel</Button>
            </div>
          </Modal.Body>
        </Modal>
      ) : (
        <Modal show={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeleteReason(""); }}>
          <Modal.Header className="dark:bg-gray-800">Request Member Deletion</Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white rounded">
            {userToDelete && (() => {
              const s = students.find(u => u.user_id === userToDelete);
              if (!s) return null;
              return (
                <form className="space-y-6">
                  {/* User Info */}
            
                  <div className="flex items-center space-x-4 mb-2">
                    
                    <img src={s.avatar || placeholderImage} alt="avatar" className="w-12 h-12 rounded-full object-cover" />
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900 dark:text-white">{s.user_fname} {s.user_lname}</div>
                      <div className="text-sm text-gray-400">{s.school_id}</div>
                      <div className="text-sm text-gray-400">{s.email}</div>
                      <div className="text-sm text-gray-400">{s.role} - {s.course} {s.year} {s.section}</div>
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
                    Deletion will remove all the transactions tied to this user. This action cannot be undone once approved by the adviser.
                  </p>
                </div>

                  {/* Reason */}
                  <div>
                    <label className="block mb-1 text-sm">Reason for deletion (optional)</label>
                    <textarea
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                      value={deleteReason}
                      onChange={e => setDeleteReason(e.target.value)}
                      placeholder="e.g. Duplicate entry, graduated, etc."
                      rows={3}
                    />
                  </div>

                  
                  {/* Buttons */}
                  <div className="flex justify-start space-x-2 mt-4">
                    <Button type="button" color="failure" onClick={deleteStudent} className="px-8 bg-red-600 hover:bg-red-700 text-white">
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
      )}

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
                className="transition-colors duration-300 py-2 px-5 text-sm font-medium text-center text-white bg-red-500 rounded-lg hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-900"
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

export default Crud;