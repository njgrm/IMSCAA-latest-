import React, { useState, useContext, useEffect, useMemo, useRef } from "react";
import { ThemeContext } from './theme/ThemeContext';
import { Button, Modal, Drawer } from "flowbite-react";
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Searchbar from "./components/Searchbar";
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';
import placeholderImage from "./assets/profilePlaceholder.png"; 
import FilterDropdownTxn, { TxnFilters } from './components/FilterDropdownTxn';
import ReqplaceholderImage from "./assets/questionPlaceholder.png"; 

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

interface BulkValues {
    fee_description: string;
    amount_paid: number;
    payment_status: Transaction['payment_status'];
    payment_method: string;
  }

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTxnId, setDeleteTxnId] = useState<number|null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [feeRequirements, setFeeRequirements] = useState<Requirement[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedFees, setSelectedFees] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const { theme } = useContext(ThemeContext);
  const [currentUser, setCurrentUser] = useState<{ user_id: number } | null>(null);
  const [selectedTxns, setSelectedTxns] = useState<number[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTxnId, setEditTxnId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTransaction, setPreviewTransaction] = useState<Transaction|null>(null);
  const [showFilter, setShowFilter]       = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<TxnFilters>({
      search: '',
      statuses: { unpaid: false, partial: false, paid: false },
      methods: {},
      course: '',
      year: '',
      section: '',
    });
    const [bulkValues, setBulkValues] = useState({
        fee_description: "",
        amount_paid: 0,
        payment_status: "unpaid" as Transaction['payment_status'],
        payment_method: ""
      });
      const [isMassEditOpen, setIsMassEditOpen] = useState(false);
      const [isMassConfirmOpen, setIsMassConfirmOpen] = useState(false);
    const [isMassDeleteConfirmOpen, setIsMassDeleteConfirmOpen] = useState(false)
const [addFeeSearch,     setAddFeeSearch]     = useState("");
const [addUserFilters,   setAddUserFilters]   = useState<{course:string;year:string;section:string}>({
  course: "", year: "", section: ""
        });


          const [addUserSearch,  setAddUserSearch]  = useState("");
            const [addUserCourse,  setAddUserCourse]  = useState("");
            const [addUserYear,    setAddUserYear]    = useState("");
            const [addUserSection, setAddUserSection] = useState("");

            // derived:
            const filteredAddUsers = users.filter(u => {
            const name = `${u.user_fname} ${u.user_lname}`.toLowerCase();
            if (addUserSearch && !name.includes(addUserSearch.toLowerCase())) return false;
            if (addUserCourse  && u.course   !== addUserCourse) return false;
            if (addUserYear    && String(u.year) !== addUserYear) return false;
            if (addUserSection && u.section  !== addUserSection) return false;
            return true;
            });
    

    const [massEditForms, setMassEditForms] = useState<Record<number, {
        fee_description: string;
        amount_paid: number;
        payment_status: Transaction['payment_status'];
        payment_method: string;
      }>>({});

      useEffect(() => {
        if (isMassEditOpen) {
          const forms: typeof massEditForms = {};
          selectedTxns.forEach((id) => {
            const t = transactions.find(x => x.transaction_id === id);
            if (t) {
              forms[id] = {
                fee_description: t.fee_description || "",
                amount_paid:     t.amount_paid,
                payment_status:  t.payment_status,
                payment_method:  t.payment_method || "",
              };
            }
          });
          setMassEditForms(forms);
        }
      }, [isMassEditOpen, selectedTxns, transactions]);

  const methodsList = useMemo(() => {
    const setm = new Set<string>();
    transactions.forEach(t => {
      if (t.payment_method) setm.add(t.payment_method);
    });
    return Array.from(setm);
  }, [transactions]);

  const courses  = useMemo(() => [...new Set(users.map(u => u.course))], [users]);
  const years    = useMemo(() => [...new Set(users.map(u => String(u.year)))], [users]);
  const sections = useMemo(() => [...new Set(users.map(u => u.section))], [users]);

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const u = users.find(u => u.user_id === t.user_id);
      const r = feeRequirements.find(f => f.requirement_id === t.requirement_id);

      const hay = `${u?.user_fname} ${u?.user_lname} ${r?.title}`.toLowerCase();
      if (filters.search && !hay.includes(filters.search.toLowerCase()))
        return false;

      if (Object.values(filters.statuses).some(Boolean) &&
          !filters.statuses[t.payment_status])
        return false;

      if (Object.values(filters.methods).some(Boolean)) {
        if (!t.payment_method || !filters.methods[t.payment_method])
          return false;
      }

      if (filters.course && u?.course !== filters.course) return false;
      if (filters.year   && String(u?.year) !== filters.year) return false;
      if (filters.section && u?.section !== filters.section) return false;

      return true;
    });
  }, [transactions, filters, users, feeRequirements]);


  const [txnForm, setTxnForm] = useState<{
    fee_description: string;
    amount_paid: number;
    payment_status: Transaction['payment_status'];
    payment_method: string;
  }>({
    fee_description: "",
    amount_paid: 0,
    payment_status: "unpaid",
    payment_method: ""
  });

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Transactions' }
  ];

  const [newTxnForm, setNewTxnForm] = useState({
    fee_description: "",
    amount_paid: 0,
    payment_status: "unpaid" as Transaction['payment_status'],
    payment_method: ""
  });

  const handleNewTxnFormChange = (
    e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewTxnForm(f => ({
      ...f,
      [name]:
        name === "amount_paid"   ? parseFloat(value)
      : name === "payment_status"? (value as Transaction['payment_status'])
      : value
    }));
  };

 const openEdit = (t: Transaction) => {
    setEditTxnId(t.transaction_id);
    setTxnForm({
      fee_description: t.fee_description || "",
      amount_paid: t.amount_paid,
      payment_status: t.payment_status,
      payment_method: t.payment_method || ""
    });
    setIsEditOpen(true);
  };

  const handleTxnFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTxnForm(f =>
      ({
        ...f,
        [name]:
          name === "amount_paid"
            ? parseFloat(value)
            : name === "payment_status"
            ? (value as Transaction['payment_status'])
            : value
      } as typeof txnForm)
    );
  };
  
  const saveTxnEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTxnId) return;
    try {
      const res = await fetch("http://localhost/my-app-server/update_transaction.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: editTxnId,
          fee_description: txnForm.fee_description,
          amount_paid: txnForm.amount_paid,
          payment_status: txnForm.payment_status,
          payment_method: txnForm.payment_method
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success("Transaction updated!");
      setIsEditOpen(false);
      setEditTxnId(null);
      await fetchTransactions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    if (!isAddOpen) {
      setSelectedUsers([]);
      setSelectedFees([]);
    }
  }, [isAddOpen]);

  useEffect(() => {
    fetchTransactions();
    fetchCurrentUser();
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
        amount_due: typeof t.amount_due === 'string'
          ? parseFloat(t.amount_due)
          : t.amount_due,
        amount_paid: t.amount_paid == null
          ? 0
          : typeof t.amount_paid === 'string'
            ? parseFloat(t.amount_paid)
            : t.amount_paid
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
      // normalize amount_due
      data = (Array.isArray(data) ? data : []).map((f: any) => ({
        requirement_id: f.requirement_id,
        title:          f.title,
        amount_due: typeof f.amount_due === "string" ? parseFloat(f.amount_due) : f.amount_due,
        end_datetime:   f.end_datetime,
        req_picture: f.req_picture
      }));
      setFeeRequirements(data);
    } catch (e) {
      console.error(e);
    }
  };


  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("http://localhost/my-app-server/get_current_user.php", {
        credentials: "include",
      });
      const data = await res.json();
      setCurrentUser(data);
    } catch (e) {
      console.error("Failed to fetch current user");
    }
  };

  const userMap = React.useMemo(() => {
    if (!Array.isArray(users)) return {};
    return Object.fromEntries(users.map(u => [u.user_id, u]));
  }, [users]);
  
  const requirementMap = React.useMemo(() => {
    if (!Array.isArray(feeRequirements)) return {};
    return Object.fromEntries(feeRequirements.map(f => [f.requirement_id, f]));
  }, [feeRequirements]);

  const toggleTxn = (id: number) =>
    setSelectedTxns(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const toggleAllTxns = (e: React.ChangeEvent<HTMLInputElement>) =>
    e.target.checked
      ? setSelectedTxns(filteredTxns.map(t => t.transaction_id))
      : setSelectedTxns([]);

  const openAddModal = async () => {
    try {
      const [usersRes, feesRes] = await Promise.all([
        fetch("http://localhost/my-app-server/get_user.php", {
          credentials: "include",
        }),
        fetch("http://localhost/my-app-server/get_fee_requirement.php", {
          credentials: "include",
        })
      ]);
  
      if (!usersRes.ok) throw new Error("Failed to load users");
      if (!feesRes.ok)  throw new Error("Failed to load fees");
  
      const usersData = await usersRes.json();
      const feesDataRaw = await feesRes.json();

        const feesData: Requirement[] = (Array.isArray(feesDataRaw) ? feesDataRaw : []).map(f => ({
            requirement_id: f.requirement_id,
            title:          f.title,
            amount_due:     typeof f.amount_due === 'string' ? parseFloat(f.amount_due) : f.amount_due,
            end_datetime:   f.end_datetime,
            req_picture: f.req_picture
        }));

        setFeeRequirements(feesData);
  
      setUsers(Array.isArray(usersData) ? usersData : []);
      setFeeRequirements(Array.isArray(feesData) ? feesData : []);
  
      setIsAddOpen(true);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load data');
    }
  };

  const handleUserCheckbox = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleFeeCheckbox = (feeId: number) => {
    setSelectedFees(prev => 
      prev.includes(feeId)
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    );
  };

  const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectAllFees = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFees(feeRequirements.map(f => f.requirement_id));
    } else {
      setSelectedFees([]);
    }
  };

  const createTransactions = async () => {
    if (!selectedUsers.length || !selectedFees.length) {
      toast.error('Please select at least one user and one fee requirement');
      return;
    }

    try {
      const res = await fetch("http://localhost/my-app-server/add_transaction.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: selectedUsers,
          requirement_ids: selectedFees,
          fee_description: newTxnForm.fee_description,
          amount_paid:     newTxnForm.amount_paid,
          payment_status:  newTxnForm.payment_status,
          payment_method:  newTxnForm.payment_method,
        })
      });

      if (res.ok) {
        toast.success('Transactions created successfully!');
        setIsAddOpen(false);
        setSelectedUsers([]);
        setSelectedFees([]);
        setNewTxnForm({ fee_description: "", amount_paid: 0, payment_status: "unpaid", payment_method: "" });
        await fetchTransactions();
      } else {
        toast.error('Failed to create transactions');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  // Add state for reason
  const [deleteReason, setDeleteReason] = useState("");

  // Update deleteTransaction to use reason
  function deleteTransaction(txnId: number, reasonOverride?: string): Promise<void> {
    return fetch("http://localhost/my-app-server/get_current_user.php", { credentials: "include" })
      .then(res => res.json())
      .then(user => {
        const role = user.role ? user.role.toLowerCase() : null;
        if (role === 'adviser') {
          // Adviser: delete directly
          return fetch(
            `http://localhost/my-app-server/delete_transaction.php?transaction_id=${txnId}`,
            {
              method: "DELETE",
              credentials: "include",
            }
          ).then(async res => {
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            return;
          });
        } else {
          // President/Officer: request deletion
          const reasonToSend = reasonOverride || deleteReason.trim() || "Request to delete transaction.";
          return fetch("http://localhost/my-app-server/add_deletion_request.php", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "transaction",
              target_id: txnId,
              reason: reasonToSend
            })
          }).then(async res => {
            const text = await res.text();
            let data;
            try {
              data = JSON.parse(text);
            } catch {
              data = { error: text };
            }
            if (!res.ok) throw new Error(data.error || "Request failed");
            return;
          });
        }
      });
  }

  function openPreview(t: Transaction) {
    setPreviewTransaction(t);
    setIsPreviewOpen(true);
  }

  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [updateTxnId, setUpdateTxnId] = useState<number | null>(null);
  const [updateForm, setUpdateForm] = useState<{
    fee_description: string;
    amount_paid: number;
    payment_status: Transaction['payment_status'];
    payment_method: string;
  }>({
    fee_description: "",
    amount_paid: 0,
    payment_status: "unpaid",
    payment_method: ""
  });
  
  const openUpdate = (t: Transaction) => {
    setUpdateTxnId(t.transaction_id);
    setUpdateForm({
      fee_description: t.fee_description || "",
      amount_paid: t.amount_paid,
      payment_status: t.payment_status,
      payment_method: t.payment_method || ""
    });
    setIsUpdateOpen(true);
  };

  const handleUpdateFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setUpdateForm(f =>
      ({
        ...f,
        [name]:
          name === "amount_paid"
            ? parseFloat(value)
            : name === "payment_status"
            ? (value as Transaction['payment_status'])
            : value
      } as typeof updateForm)
    );
  };
  
  const saveUpdateTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTxnId) return;
    try {
      const res = await fetch("http://localhost/my-app-server/update_transactions.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: updateTxnId,
          fee_description: updateForm.fee_description,
          amount_paid: updateForm.amount_paid,
          payment_status: updateForm.payment_status,
          payment_method: updateForm.payment_method
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success("Transaction updated with new record!");
      setIsUpdateOpen(false);
      setUpdateTxnId(null);
      await fetchTransactions();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [isMassUpdateOpen, setIsMassUpdateOpen] = useState(false);
  const [isMassUpdateConfirmOpen, setIsMassUpdateConfirmOpen] = useState(false);
  
  const [massUpdateValues, setMassUpdateValues] = useState<BulkValues>({
    fee_description: "",
    amount_paid: 0,
    payment_status: "unpaid",
    payment_method: ""
  });
  
  useEffect(() => {
    if (isMassUpdateOpen) {
      setMassUpdateValues({
        fee_description: "",
        amount_paid: 0,
        payment_status: "unpaid",
        payment_method: ""
      });
    }
  }, [isMassUpdateOpen]);

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

  // Add state for mass delete reason
  const [massDeleteReason, setMassDeleteReason] = useState("");

  const [myDeletionRequests, setMyDeletionRequests] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReqId, setCancelReqId] = useState<number | null>(null);

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
        await fetchTransactions();
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

  // Place this before the return statement
  let improvedDeleteModal: React.ReactNode = null;
  if (isDeleteModalOpen && deleteTxnId) {
    const t = transactions.find(x => x.transaction_id === deleteTxnId);
    if (t) {
      const u = userMap[t.user_id];
      const r = requirementMap[t.requirement_id];
      improvedDeleteModal = (
        <Modal show={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setDeleteReason(""); }} size="lg">
          <Modal.Header className="dark:bg-gray-800">Request Transaction Deletion</Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white rounded">
            <form className="space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="rounded-lg shadow bg-white dark:bg-gray-900 p-5 flex flex-col md:flex-row gap-6 items-center border border-gray-200 dark:border-gray-700">
                <img src={u?.avatar || placeholderImage} alt="Student" className="w-32 h-32 rounded-full object-cover border border-gray-300 dark:border-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{u ? `${u.user_fname} ${u.user_lname}` : `#${t.user_id}`}</span>
                    <span className={`capitalize px-2 py-1 rounded text-xs font-semibold ml-2 ${
                      t.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      t.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>{t.payment_status}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span>{new Date(t.due_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 7v7" /></svg>
                      <span>₱{r?.amount_due.toFixed(2) ?? '–'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 12.414a4 4 0 10-1.414 1.414l4.243 4.243a1 1 0 001.414-1.414z" /></svg>
                      <span>{r?.title || '–'}</span>
                    </div>
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
                  Deletion will remove this transaction. This action cannot be undone once approved by the adviser.
                </p>
              </div>
              <div>
                <label className="block text-sm mb-1">Reason for deletion (optional)</label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="e.g. Duplicate, error, etc."
                  rows={3}
                />
              </div>
              <div className="flex justify-start space-x-2 mt-4">
                <Button type="button" color="failure" onClick={async () => {
                  if (!deleteTxnId) return;
                  try {
                    await deleteTransaction(deleteTxnId, deleteReason.trim() || "Request to delete transaction.");
                    toast.success("Delete request sent for approval");
                    await fetchTransactions();
                    await fetchMyDeletionRequests(); // <-- Add this line to refresh deletion requests
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setIsDeleteModalOpen(false);
                    setDeleteTxnId(null);
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
          </Modal.Body>
        </Modal>
      );
    }
  }

  useEffect(() => {
    const handler = () => {
      fetchMyDeletionRequests();
      fetchTransactions && fetchTransactions();
    };
    window.addEventListener('deletion-request-status', handler);
    return () => window.removeEventListener('deletion-request-status', handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 py-14">
      <Sidebar />
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
                onClick={openAddModal}
                className="bg-primary-600 py-1 hover:bg-primary-400 text-white dark:bg-primary-600 dark:hover:bg-primary-400 focus:ring-primary-300 rounded-lg shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105 text-xs sm:text-sm px-3 sm:px-4"
              >
                <span className="hidden sm:inline">+ Add Transaction</span>
                <span className="sm:hidden">+ Add</span>
              </Button>

                {/* Mass Edit */}
                    <Button
                        onClick={() => setIsMassEditOpen(true)}
                        disabled={selectedTxns.length < 2}
                        className={`py-1 focus:ring-primary-300 px-3 flex items-center text-sm font-medium text-white rounded-lg shadow-md  transition-transform duration-200 ease-in-out transform hover:scale-105 ${
                        selectedTxns.length >= 2
                            ? "bg-primary-600 hover:bg-primary-400"
                            : "bg-primary-500 cursor-not-allowed"
                        }`}
                    >
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/>
                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"/>
                        </svg>
                        Mass Edit
                    </Button>

                      {/* Mass Update */}
                      <Button
                        onClick={() => setIsMassUpdateOpen(true)}
                        disabled={selectedTxns.length < 2}
                        className={`py-1 focus:ring-secondary-300 px-1 flex items-center text-sm font-medium text-white rounded-lg shadow-md  transition-transform duration-200 ease-in-out transform hover:scale-105 ${
                        selectedTxns.length >= 2
                            ? "bg-secondary-500 hover:bg-secondary-400"
                            : "bg-secondary-500 cursor-not-allowed"
                        }`}
                    >
                       <svg className="w-5 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
                        </svg>
                        Mass Update
                    </Button>

                    {/* Mass Delete */}
                    <button
                        onClick={() => setIsMassDeleteConfirmOpen(true)}
                        disabled={selectedTxns.length < 2}
                        className={`py-3 px-3 flex items-center text-sm font-medium rounded-lg  shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105 ${
                        selectedTxns.length >= 2
                            ? "border border-red-500 text-red-500 hover:bg-red-50  dark:hover:bg-red-900"
                            : "border border-gray-400 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                        </svg>
                        Mass Request
                    </button>

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
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:px-5 sm:pt-0 sm:pb-5">
          <div ref={tableRef} className="overflow-x-auto shadow-md relative z-10">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow dark:text-white text-s">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-2 py-2 pl-0">
                    <input
                      type="checkbox"
                      onChange={toggleAllTxns}
                      checked={selectedTxns.length === filteredTxns.length && filteredTxns.length > 0}
                      className="mr-0 w-4 h-4  bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                    />
                  </th>
                  {[
                    'Name','Year','Section','Fee Title',
                    'Amount Due','Amount Paid','Status',
                    'Due Date','Actions'
                  ].map(col => (
                    <th key={col} className="px-4 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">{col}</th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {filteredTxns.map(t => {
                  const u = userMap[t.user_id];
                  const r = requirementMap[t.requirement_id];
                  const myReq = myDeletionRequests.find(
                    req => req.type === "transaction" && req.target_id === t.transaction_id && req.status === "pending"
                  );
                  return (
                    <tr key={t.transaction_id}
                    onClick={() => toggleTxn(t.transaction_id)}
                     className="border-b cursor-pointer dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 ">
                      {/* Checkbox */}
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={selectedTxns.includes(t.transaction_id)}
                          onChange={() => toggleTxn(t.transaction_id)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                        />
                      </td>
                      {/* Name + Avatar */}
                      <td className="px-4 py-2 flex items-center">
                        <img
                       src={u?.avatar || placeholderImage}
                       alt={`${u?.user_fname} avatar`}
                       className="w-5 h-5 rounded-full mr-2 object-cover"
                        />
                        {u ? `${u.user_fname} ${u.user_lname}` : `#${t.user_id}`}
                      </td>
                      <td className="px-4 py-2">{u?.year ?? '–'}</td>
                      <td className="px-4 py-2">{u?.section || '–'}</td>
                      <td className="px-4 py-2">{r?.title || '–'}</td>
                      <td className="px-4 py-2">₱{r?.amount_due.toFixed(2)}</td>
                      <td className="px-4 py-2">₱{t.amount_paid.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span className={`capitalize px-2 py-1 rounded ${
                          t.payment_status === 'paid' ? 'bg-green-100 text-green-800'
                          : t.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'}`}>
                          {t.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-2">{new Date(t.due_date).toLocaleDateString()}</td>
                      {/* Actions */}
                      <td className="px-4 py-3 space-x-2 flex items-center">
                        <button
                         onClick={(e) => {e.stopPropagation(); openEdit(t);}}
                          className="flex items-center justify-center px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-400 whitespace-nowrap transition-transform duration-200 ease-in-out transform hover:scale-105"
                        >
                                <svg aria-hidden="true" className="mr-1 -ml-1 w-5 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                          Edit
                        </button>
                        <button
                         onClick={(e) => {e.stopPropagation(); openUpdate(t);}}
                          className="flex items-center justify-center px-2 py-2 text-sm bg-secondary-500 text-white rounded-lg hover:bg-secondary-400 whitespace-nowrap transition-transform duration-200 ease-in-out transform hover:scale-105"
                        >
                            <svg className="w-4 h-4 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
                                </svg>

                          Update
                        </button>
                        <button
                                onClick={(e) => {e.stopPropagation(); openPreview(t);}}
                            className="flex items-center justify-center px-2 py-2 text-sm font-medium text-center text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-primary-400 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 transition-transform duration-200 ease-in-out transform hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2 -ml-0.5">
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" />
                            </svg>
                            Preview
                        </button>
                        {myReq ? (
                          <button
                            onClick={() => handleCancelClick(myReq.id)}
                            className="flex items-center justify-center px-5 py-2 text-sm font-medium text-white rounded-lg bg-red-500 hover:bg-red-400 transition-colors duration-200 ease-in-out transform hover:scale-105"
                          >
                            <svg aria-hidden="true" className="w-5 h-4 mr-1.5 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                            </svg>
                            Cancel
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {e.stopPropagation();
                                setDeleteTxnId(t.transaction_id);
                                setIsDeleteModalOpen(true);
                              }}
                          className="flex items-center justify-center px-4 py-2 text-sm border border-red-500 text-red-500 rounded-lg hover:bg-red-50  dark:hover:bg-red-900 whitespace-nowrap transition-transform duration-200 ease-in-out transform hover:scale-105"
                        >
                               <svg aria-hidden="true" className="w-5 h-4 mr-1.5 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" clipRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                            </svg>
                          Request
                        </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

{/* Add Transaction Modal */}
<Modal show={isAddOpen} onClose={() => setIsAddOpen(false)} size="7x1">
  <Modal.Header className="dark:bg-gray-800 rounded px-10">
    Create New Transactions
  </Modal.Header>

  <Modal.Body className="dark:bg-gray-800 rounded p-0">
    <div className="mx-auto max-w-[95vw] py-4">
      {/* 3-column grid */}
      <div className="grid grid-cols-[3fr_2fr_1fr] gap-x-6 gap-y-2 dark:text-white">

        {/* ── USERS ── */}
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-lg overflow-hidden max-h-[71vh] py-2 space-y-2">
          {/* ← One header row for both the search + all filters */}
          <div className="px-4 py-0 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700">
            <Searchbar
              search={addUserSearch}
              onSearchChange={setAddUserSearch}
            />
            <select
               className=" px-3 py-2 mb-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
              value={addUserCourse}
              onChange={e => setAddUserCourse(e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
               className=" px-3 py-2 mb-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
              value={addUserYear}
              onChange={e => setAddUserYear(e.target.value)}
            >
              <option value="">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
               className=" px-3 py-2 mb-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
              value={addUserSection}
              onChange={e => setAddUserSection(e.target.value)}
            >
              <option value="">All Sections</option>
              {sections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Title below header */}
          <h3 className="px-5 py-2 font-semibold">Select Users</h3>

          {/* Scrollable user list */}
          <div className="flex-1 overflow-auto">
            <table className="min-w-full bg-white dark:bg-gray-900 dark:text-white">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-2">
                    <input
                      type="checkbox"
                      onChange={handleSelectAllUsers}
                      checked={selectedUsers.length === users.length && users.length > 0}
                       className="w-4 h-4 mr-3 bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                    />
                  </th>
                  <th className="px-2 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">Name</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">Course</th>
                  <th className="px-1 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">Year</th>
                  <th className="px-1 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">Section</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAddUsers.map(u => (
                  <tr
                    key={u.user_id}
                    onClick={() => handleUserCheckbox(u.user_id)}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    <td className="px-2 py-1 pl-5">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.user_id)}
                        onChange={() => handleUserCheckbox(u.user_id)}
                        onClick={e => e.stopPropagation()}
                         className="w-4 h-4 bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                      />
                    </td>
                    <td className="px-2 py-3 flex items-center space-x-2">
                      <img
                        src={u.avatar || placeholderImage}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      <span>{u.user_fname} {u.user_lname}</span>
                    </td>
                    <td className="px-2 py-2">{u.course}</td>
                    <td className="px-2 py-2">{u.year}</td>
                    <td className="px-2 py-2">{u.section}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FEES ── */}
        <div className="flex flex-col bg-white dark:bg-gray-900 rounded-lg overflow-hidden min-h-[70vh] space-y-2">
          {/* Fee search header */}
          <div className="px-4 py-2 border-gray-200 dark:border-gray-700 mb-11">
            <Searchbar
              search={addFeeSearch}
              onSearchChange={setAddFeeSearch}
            />
          </div>
          <h3 className="px-4 pt-5  py-1.5 pb-1.5 font-semibold border-t  border-gray-200 dark:border-gray-700">Select Fees</h3>
          <div className="flex-1 overflow-auto">
            <table className="min-w-full bg-white dark:bg-gray-900 dark:text-white">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-0 pr-2">
                    <input
                      type="checkbox"
                      onChange={handleSelectAllFees}
                      checked={selectedFees.length === feeRequirements.length && feeRequirements.length > 0}
                       className="w-4 h-4 mr-5 bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                    />
                  </th>
                  <th className="px-1 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">Title</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">Amount</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {feeRequirements.map(f => (
                  <tr
                    key={f.requirement_id}
                    onClick={() => handleFeeCheckbox(f.requirement_id)}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedFees.includes(f.requirement_id)}
                        onChange={() => handleFeeCheckbox(f.requirement_id)}
                        onClick={e => e.stopPropagation()}
                         className="w-4 h-4 ml-1 bg-gray-100 border-gray-300 rounded text-primary-600 focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-700 focus:ring-2 dark:bg-gray-600 dark:border-gray-500"
                      />
                    </td>
                    <td className="px-2 py-2">{f.title}</td>
                    <td className="px-2 py-2">₱{f.amount_due.toFixed(2)}</td>
                    <td className="px-2 py-2">{new Date(f.end_datetime).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── DETAILS ── */}
        <div className="space-y-4 dark:text-white">
          <h3 className="font-semibold">Transaction Details</h3>
          <div>
            <label className="block text-sm mb-1">Fee Description</label>
            <textarea
              name="fee_description"
              value={newTxnForm.fee_description}
              onChange={handleNewTxnFormChange}
              rows={3}
             className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Amount Paid</label>
            <input
              type="number"
              name="amount_paid"
              step="0.01"
              value={newTxnForm.amount_paid}
              onChange={handleNewTxnFormChange}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Payment Status</label>
            <select
              name="payment_status"
              value={newTxnForm.payment_status}
              onChange={handleNewTxnFormChange}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Payment Method</label>
            <input
              type="text"
              name="payment_method"
              value={newTxnForm.payment_method}
              onChange={handleNewTxnFormChange}
              placeholder="e.g. Cash, GCash"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
            />
          </div>

     
        </div>
        <div className="text-right mt-2 justify-start">
            <Button onClick={createTransactions} className="bg-primary-600 hover:bg-primary-400 focus:ring-primary-300 text-white dark:bg-primary-600 dark:hover:bg-primary-400 rounded-lg shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105">
              Create Transactions
            </Button>
          </div>
      </div>
    </div>
  </Modal.Body>
</Modal>

        {/* ── Edit Transaction Modal ────────────────── */}
        <Modal show={isEditOpen} onClose={() => setIsEditOpen(false)}>
        <Modal.Header className="dark:bg-gray-800 rounded">Edit Transaction</Modal.Header>
        <Modal.Body className="dark:bg-gray-800 dark:text-white py-2 pb-6 rounded-lg">
        {editTxnId != null && (() => {
            const t = transactions.find(x => x.transaction_id === editTxnId)!;
            if (!t) {
                setIsEditOpen(false);
                setEditTxnId(null);
                return null;
              }
            const u = userMap[t.user_id]!;
            const r = requirementMap[t.requirement_id]!;
            
            return (
              <form onSubmit={saveTxnEdit} className="space-y-6">
                
                {/* ─── Read-only Info ─────────────────────────── */}
                <div className="flex items-center space-x-4">
                  <img
                    src={u.avatar || placeholderImage}
                    alt="avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  
                  <div className="space-y-1">
                    <div className="font-medium">{u.user_fname} {u.user_lname}</div>
                    <div className="text-sm text-gray-400">{u.course} {u.year} - {u.section}</div>
                    <div className="text-sm">
                      <span className="font-medium">Fee:</span> {r.title}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Amount Due:</span> ₱{r.amount_due.toFixed(2)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Current Status:</span> <span className="capitalize">{t.payment_status}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Current Amount Paid:</span> ₱{t.amount_paid.toFixed(2)}
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
                    Only use this for correcting errors or adding descriptions. Use the Update function to verify and update payments.
                  </p>
                </div>

                {/* ─── Editable Fields ────────────────────────── */}
                <div>
                  <label className="block mb-1 text-sm">Fee Description</label>
                  <textarea
                    name="fee_description"
                    value={txnForm.fee_description}
                    onChange={handleTxnFormChange}
                    rows={3}
                     className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm">Amount Paid</label>
                    <input
                      type="number"
                      name="amount_paid"
                      step="0.01"
                      value={txnForm.amount_paid}
                      onChange={handleTxnFormChange}
                       className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">Payment Status</label>
                    <select
                      name="payment_status"
                      value={txnForm.payment_status}
                      onChange={handleTxnFormChange}
                       className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-sm">Payment Method</label>
                  <input
                    type="text"
                    name="payment_method"
                    value={txnForm.payment_method}
                    onChange={handleTxnFormChange}
                     className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                    placeholder="e.g. Cash, GCash, Credit Card…"
                  />
                </div>

                <div className="text-right">
                  <Button type="submit"   className="bg-primary-600 py-1 hover:bg-primary-400 text-white dark:bg-primary-600 dark:hover:bg-primary-400 focus:ring-primary-300 rounded-lg shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105">
                    Apply Changes
                  </Button>
                </div>
              </form>
            );
          })()}
        </Modal.Body>
        </Modal>

        {/* ── Update Transaction Modal ────────────────── */}
        <Modal show={isUpdateOpen} onClose={() => setIsUpdateOpen(false)}>
        <Modal.Header className="dark:bg-gray-800 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-secondary-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
            </svg>
            Update Transaction
          </div>
        </Modal.Header>
        <Modal.Body className="dark:bg-gray-800 dark:text-white py-2 pb-6 rounded-lg">
        {updateTxnId != null && (() => {
            const t = transactions.find(x => x.transaction_id === updateTxnId)!;
            if (!t) {
                setIsUpdateOpen(false);
                setUpdateTxnId(null);
                return null;
              }
            const u = userMap[t.user_id]!;
            const r = requirementMap[t.requirement_id]!;
            
            return (
              <form onSubmit={saveUpdateTxn} className="space-y-6">
                {/* ─── Read-only Info ─────────────────────────── */}
                <div className="flex items-center space-x-4">
                  <img
                    src={u.avatar || placeholderImage}
                    alt="avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="space-y-1">
                    <div className="font-medium">{u.user_fname} {u.user_lname}</div>
                    <div className="text-sm text-gray-400">{u.course} {u.year} - {u.section}</div>
                    <div className="text-sm">
                      <span className="font-medium">Fee:</span> {r.title}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Amount Due:</span> ₱{r.amount_due.toFixed(2)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Current Status:</span> <span className="capitalize">{t.payment_status}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Current Amount Paid:</span> ₱{t.amount_paid.toFixed(2)}
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
                    This will create a new verified and updated transaction record. To correct errors or add a description, use the Edit function.
                  </p>
                </div>

                {/* ─── Editable Fields ────────────────────────── */}
                <div>
                  <label className="block mb-1 text-sm">New Fee Description</label>
                  <textarea
                    name="fee_description"
                    value={updateForm.fee_description}
                    onChange={handleUpdateFormChange}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm">New Amount Paid</label>
                    <input
                      type="number"
                      name="amount_paid"
                      step="0.01"
                      value={updateForm.amount_paid}
                      onChange={handleUpdateFormChange}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm">New Payment Status</label>
                    <select
                      name="payment_status"
                      value={updateForm.payment_status}
                      onChange={handleUpdateFormChange}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-sm">New Payment Method</label>
                  <input
                    type="text"
                    name="payment_method"
                    value={updateForm.payment_method}
                    onChange={handleUpdateFormChange}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                    placeholder="e.g. Cash, GCash, Credit Card…"
                  />
                </div>

                <div className="text-right">
                  <Button 
                    type="submit"   
                    className="bg-secondary-500 py-1 hover:bg-secondary-400 text-white dark:bg-secondary-500 dark:hover:bg-secondary-400 focus:ring-secondary-300 rounded-lg shadow-md transition-transform duration-200 ease-in-out transform hover:scale-105"
                  >
                    <svg className="w-4 h-4 mr-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
                    </svg>
                    Update Record
                  </Button>
                </div>
              </form>
            );
          })()}
        </Modal.Body>
          </Modal>

        {/* Improved Request Deletion Modal for Transaction */}
        {improvedDeleteModal}

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

         {/* ── MASS EDIT Transaction Modal ────────────────── */}
                <Modal show={isMassEditOpen} onClose={() => setIsMassEditOpen(false)} size="4xl">
                    <Modal.Header className="dark:bg-gray-800 rounded">
             <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"/>
                        <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"/>
                        </svg>
                        Mass Edit {selectedTxns.length} Transactions
                </div>
                    </Modal.Header>
                    <Modal.Body className="dark:bg-gray-800 rounded p-4 space-y-6 dark:text-white">
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700 mb-4">
                  <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    <span className="font-medium">Note:</span>
                  </div>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Only use this for correcting errors or adding descriptions. Use the Update function to verify and update payments.
                  </p>
                </div>
                    {/* ─── Bulk Edit Section ───────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                      
                    {/* Left: Bulk Input Fields */}
                    <div className="space-y-4">
                        <div>
                        <label className="block mb-4 text-sm">Fee Description</label>
                        <textarea
                            rows={3}
                            value={bulkValues.fee_description}
                            onChange={e => setBulkValues(v => ({ ...v, fee_description: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                        />
                        </div>

                        <div>
                        <label className="block mb-4 text-sm">Amount Paid</label>
                        <input
                            type="number"
                            step="0.01"
                            value={bulkValues.amount_paid}
                            onChange={e => setBulkValues(v => ({ ...v, amount_paid: parseFloat(e.target.value) }))}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                        />
                        </div>

                        <div>
                        <label className="block mb-4 text-sm">Payment Status</label>
                        <select
                            value={bulkValues.payment_status}
                            onChange={e => setBulkValues(v => ({ ...v, payment_status: e.target.value as any }))}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                        >
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                        </select>
                        </div>

                        <div>
                        <label className="block mb-4 text-sm">Payment Method</label>
                        <input
                            type="text"
                            value={bulkValues.payment_method}
                            onChange={e => setBulkValues(v => ({ ...v, payment_method: e.target.value }))}
                            placeholder="e.g. Cash, GCash"
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
                        />
                        </div>
                    </div>

                    {/* Right: Selected Transactions Info */}
                    <div className="max-h-[60vh] overflow-y-auto space-y-4">
                    <label className="block mb-0 text-sm">Scrollable List</label>
                        {selectedTxns.map(id => {
                        const t = transactions.find(x => x.transaction_id === id)!;
                        const u = userMap[t.user_id]!;
                        const r = requirementMap[t.requirement_id]!;

                        return (
                            <div key={id} className="p-2 bg-white dark:bg-gray-700 rounded-lg flex items-center space-x-4">
                            <img
                                src={u.avatar || placeholderImage}
                                alt="avatar"
                                className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="space-y-1">
                                <div className="font-medium text-gray-900 dark:text-white">{u.user_fname} {u.user_lname}</div>
                                <div className="text-sm text-gray-400">{u.course} {u.year} - {u.section}</div>
                                <div className="text-sm">
                                <span className="font-medium">Fee:</span> {r.title}
                                </div>
                                <div className="text-sm">
                                <span className="font-medium">Amount Due:</span> ₱{r.amount_due.toFixed(2)}
                                </div>
                                <div className="text-sm">
                                <span className="font-medium">Current Status:</span> <span className="capitalize">{t.payment_status}</span>
                                </div>
                                <div className="text-sm">
                                <span className="font-medium">Current Amount Paid:</span> ₱{t.amount_paid.toFixed(2)}
                                </div>
                            </div>
                            </div>
                        );
                        })}
                    </div>
                    </div>

                    {/* ─── Update All Button ───────────────────────── */}
                    <div className="text-right">
                    <Button
                        onClick={() => setIsMassConfirmOpen(true)}
                        className="bg-primary-600 hover:bg-primary-400 focus:ring-4 focus:ring-primary-300 text-white font-medium rounded-lg text-sm px-5 py-1 mr-2 mb-2 dark:bg-primary-600 dark:hover:bg-primary-400 dark:focus:ring-primary-800"
                    >
                Apply Changes
                    </Button>
                    </div>
                    </Modal.Body>
                    </Modal>

                {/* ── MASS EDIT CONFIRMATION ───────────────────────── */}
                <Modal show={isMassConfirmOpen} onClose={() => setIsMassConfirmOpen(false)} size="lg">
                <Modal.Body className="p-4 text-center bg-white dark:bg-gray-800 rounded-lg shadow sm:p-5">
                <button
                        onClick={() => setIsMassConfirmOpen(false)}
                        className="absolute top-2.5 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
                    >
                        <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                        </svg>
                        <span className="sr-only">Close modal</span>
                    </button>

                    <svg
                        className="mx-auto mb-4 text-gray-400 w-14 h-14 dark:text-gray-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>

                    <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
                    Apply these changes to all {selectedTxns.length} transactions? This action cannot be undone.
                    </h3>
                    <div className="flex justify-center space-x-4">
                    <Button
                        onClick={async () => {
                            try {
                            const res = await fetch("http://localhost/my-app-server/update_transaction.php", {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                transaction_ids: selectedTxns,
                                ...bulkValues
                                })
                            });
                            const json = await res.json();
                            if (!res.ok) throw new Error(json.error || 'Bulk update failed');
                            toast.success('Transactions updated');
                            setIsMassConfirmOpen(false);
                            setIsMassEditOpen(false);
                            await fetchTransactions();
                            setSelectedTxns([]);       
                            setBulkValues({         
                                fee_description: '',
                                amount_paid: 0,
                                payment_status: 'unpaid',
                                payment_method: ''
                            });
                            } catch (err: any) {
                            toast.error(err.message);
                            }
                        }}
                        className="px-5 py-2.5 text-sm font-medium bg-primary-600 hover:bg-primary-400 text-white"
                        >
                        Yes, apply
                        </Button>
                    <Button
                        color="gray"
                        onClick={() => setIsMassConfirmOpen(false)}
                        className="px-5 py-2.5 text-sm font-medium"
                    >
                        No, cancel
                    </Button>
                    </div>
                </Modal.Body>
                </Modal>

                {/* ── MASS DELETE CONFIRMATION ─────────────────────── */}
<Modal show={isMassDeleteConfirmOpen} onClose={() => { setIsMassDeleteConfirmOpen(false); setMassDeleteReason(""); }} size="lg">
  <Modal.Header className="dark:bg-gray-800">Request Mass Transaction Deletion</Modal.Header>
  <Modal.Body className="dark:bg-gray-800 dark:text-white rounded">
    <form className="space-y-6 overflow-y-auto max-h-[70vh]">
      {/* List of selected transactions */}
      <div className="space-y-4">
        {selectedTxns.map(id => {
          const t = transactions.find(x => x.transaction_id === id);
          if (!t) return null;
          const u = userMap[t.user_id];
          const r = requirementMap[t.requirement_id];
          return (
            <div key={id} className="flex items-center space-x-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <img src={u?.avatar || placeholderImage} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
              <div className="space-y-1">
                <div className="font-medium text-gray-900 dark:text-white">{u ? `${u.user_fname} ${u.user_lname}` : `#${t.user_id}`}</div>
                <div className="text-sm text-gray-400">{r?.title || '–'} | ₱{r?.amount_due.toFixed(2) || '–'}</div>
                <div className="text-sm text-gray-400">{t.payment_status} | Paid: ₱{t.amount_paid.toFixed(2)}</div>
                <div className="text-sm text-gray-400">Due: {new Date(t.due_date).toLocaleDateString()}</div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Reason */}
      <div>
        <label className="block mb-1 text-sm">Reason for deletion (optional)</label>
        <textarea
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-primary-400 focus:border-primary-400"
          value={massDeleteReason}
          onChange={e => setMassDeleteReason(e.target.value)}
          placeholder="e.g. Duplicate, error, etc."
          rows={3}
        />
      </div>
      {/* Buttons */}
      <div className="flex justify-start space-x-2 mt-4">
        <Button type="button" color="failure" onClick={async () => {
          setIsMassDeleteConfirmOpen(false);
          try {
            await Promise.all(selectedTxns.map(id => deleteTransaction(id, massDeleteReason.trim() || "Request to delete transaction.")));
            toast.success("Delete requests sent for approval");
            setSelectedTxns([]);
            await fetchTransactions();
          } catch (err: any) {
            toast.error(err.message);
          } finally {
            setMassDeleteReason("");
          }
        }} className="px-8 bg-red-600 hover:bg-red-700 text-white">
          Mass Request Deletion
        </Button>
        <Button type="button" color="gray" onClick={() => { setIsMassDeleteConfirmOpen(false); setMassDeleteReason(""); }} className="border border-gray-300 dark:border-gray-600">
          Cancel
        </Button>
      </div>
    </form>
  </Modal.Body>
</Modal>

        {/* ── MASS UPDATE MODAL ───────────────────────── */}
        <Modal show={isMassUpdateOpen} onClose={() => setIsMassUpdateOpen(false)} size="4xl">
            <Modal.Header className="dark:bg-gray-800 rounded">
                <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-secondary-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
                    </svg>
                    Mass Update {selectedTxns.length} Transactions
                </div>
            </Modal.Header>
            <Modal.Body className="dark:bg-gray-800 rounded p-4 space-y-3 dark:text-white">

            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-700 mb-4">
                <div className="flex items-center text-yellow-800 dark:text-yellow-200">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                    <span className="font-medium">Note:</span>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This will create a new verified and updated transaction record. To correct errors or add descriptions, use the Edit function.
                </p>
            </div>

            {/* ─── Bulk Update Section ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Bulk Input Fields */}
            <div className="space-y-4">
                <div>
                <label className="block mb-4 text-sm">New Fee Description</label>
                <textarea
                    rows={3}
                    value={massUpdateValues.fee_description}
                    onChange={e => setMassUpdateValues(v => ({ ...v, fee_description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                />
                </div>

                <div>
                <label className="block mb-4 text-sm">New Amount Paid</label>
                <input
                    type="number"
                    step="0.01"
                    value={massUpdateValues.amount_paid}
                    onChange={e => setMassUpdateValues(v => ({ ...v, amount_paid: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                />
                </div>

                <div>
                <label className="block mb-4 text-sm">New Payment Status</label>
                <select
                    value={massUpdateValues.payment_status}
                    onChange={e => setMassUpdateValues(v => ({ ...v, payment_status: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                </select>
                </div>

                <div>
                <label className="block mb-4 text-sm">New Payment Method</label>
                <input
                    type="text"
                    value={massUpdateValues.payment_method}
                    onChange={e => setMassUpdateValues(v => ({ ...v, payment_method: e.target.value }))}
                    placeholder="e.g. Cash, GCash"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-secondary-400 focus:border-secondary-400"
                />
                </div>
            </div>

            {/* Right: Selected Transactions Info */}
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
            <label className="block mb-0 text-sm">Selected Transactions</label>
                {selectedTxns.map(id => {
                const t = transactions.find(x => x.transaction_id === id)!;
                const u = userMap[t.user_id]!;
                const r = requirementMap[t.requirement_id]!;

                return (
                    <div key={id} className="p-2 bg-white dark:bg-gray-700 rounded-lg flex items-center space-x-4">
                    <img
                        src={u.avatar || placeholderImage}
                        alt="avatar"
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="space-y-1">
                        <div className="font-medium text-gray-900 dark:text-white">{u.user_fname} {u.user_lname}</div>
                        <div className="text-sm text-gray-400">{u.course} {u.year} - {u.section}</div>
                        <div className="text-sm">
                        <span className="font-medium">Fee:</span> {r.title}
                        </div>
                        <div className="text-sm">
                      <span className="font-medium">Amount Due:</span> ₱{r.amount_due.toFixed(2)}
                     </div>
                        <div className="text-sm">
                        <span className="font-medium">Current Status:</span> <span className="capitalize">{t.payment_status}</span>
                        </div>
                        <div className="text-sm">
                        <span className="font-medium">Current Amount Paid:</span> ₱{t.amount_paid.toFixed(2)}
                        </div>
                    </div>
                    </div>
                );
                })}
            </div>
            </div>

            {/* ─── Update All Button ───────────────────────── */}
            <div className="text-right">
            <Button
                onClick={() => setIsMassUpdateConfirmOpen(true)}
                className="bg-secondary-500 hover:bg-secondary-400 focus:ring-4 focus:ring-secondary-300 text-white font-medium rounded-lg text-sm px-5 py-2.5 mr-2  dark:bg-secondary-500 dark:hover:bg-secondary-400 dark:focus:ring-secondary-800"
            >
                <svg className="w-4 h-4 mr-1.5 inline" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
                </svg>
                 Update Records
            </Button>
            </div>
            </Modal.Body>
        </Modal>

        {/* ── MASS UPDATE CONFIRMATION ───────────────────────── */}
        <Modal show={isMassUpdateConfirmOpen} onClose={() => setIsMassUpdateConfirmOpen(false)} size="lg">
        <Modal.Body className="p-4 text-center bg-white dark:bg-gray-800 rounded-lg shadow sm:p-5">
        <button
                onClick={() => setIsMassUpdateConfirmOpen(false)}
                className="absolute top-2.5 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            >
                <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                />
                </svg>
                <span className="sr-only">Close modal</span>
            </button>

            <svg
                className="mx-auto mb-4 text-secondary-500 w-14 h-14 dark:text-secondary-400"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"
                />
            </svg>

            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
            Update records for all {selectedTxns.length} selected transactions? This action cannot be undone.
            </h3>
            <div className="flex justify-center space-x-4">
            <Button
                onClick={async () => {
                    try {
                    const res = await fetch("http://localhost/my-app-server/update_transactions.php", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                        transaction_ids: selectedTxns,
                        ...massUpdateValues
                        })
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || 'Mass update failed');
                    toast.success('Update records created successfully');
                    setIsMassUpdateConfirmOpen(false);
                    setIsMassUpdateOpen(false);
                    await fetchTransactions();
                    setSelectedTxns([]);       
                    setMassUpdateValues({         
                        fee_description: '',
                        amount_paid: 0,
                        payment_status: 'unpaid',
                        payment_method: ''
                    });
                    } catch (err: any) {
                    toast.error(err.message);
                    }
                }}
                className="px-5 py-2.5 text-sm font-medium bg-secondary-500 hover:bg-secondary-400 text-white"
                >
                Yes, create updates
                </Button>
            <Button
                color="gray"
                onClick={() => setIsMassUpdateConfirmOpen(false)}
                className="px-5 py-2.5 text-sm font-medium"
            >
                No, cancel
            </Button>
            </div>
        </Modal.Body>
        </Modal>

{/* ── PREVIEW TRANSACTION DRAWER ───────────────────────────────────────── */}
<div
  className={`fixed inset-0 z-50 ${
    isPreviewOpen ? 'pointer-events-auto' : 'pointer-events-none'
  }`}
>
  {/* overlay */}
  <div
    className={`absolute inset-0 bg-black/30 dark:bg-black/50 transition-opacity duration-300 ${
      isPreviewOpen ? 'opacity-100' : 'opacity-0'
    }`}
    onClick={() => setIsPreviewOpen(false)}
  />

  {/* drawer content */}
  <div
    className={`relative z-50 h-full p-4 overflow-y-auto transition-transform duration-300 ease-in-out ${
      isPreviewOpen ? 'translate-x-0' : '-translate-x-full'
    } w-full max-w-2xl bg-white dark:bg-gray-800`}
    onClick={e => e.stopPropagation()}
  >
    {previewTransaction && (() => {
      const t = previewTransaction;
      const u = userMap[t.user_id]!;
      const r = requirementMap[t.requirement_id]!;

      return (
        <>
          {/* header + close */}
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Transaction Details
            </h4>
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 
                     0 011.414 1.414L11.414 10l4.293 4.293a1 1 
                     0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 
                     0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 
                     0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="sr-only">Close drawer</span>
            </button>
          </div>

                  {/* User and Requirement Info */}
                  <div className="flex items-center space-x-4 mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <img
                      src={u.avatar || placeholderImage}
                      alt={`${u.user_fname} ${u.user_lname}`}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {u.user_fname} {u.user_lname}
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {u.course} {u.year} - {u.section}
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                        {r.title}
                      </p>
                    </div>
                  </div>

                  {/* Transaction ID */}
                  <div className="mb-6">
                    <div className="flex items-center justify-start">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction ID</span>
                      <span className="ml-2 bg-gray-100 dark:bg-gray-700 dark:text-white px-2.5 py-0.5 rounded-full text-xs font-medium">
                        #{t.transaction_id}
                      </span>
                    </div>
          </div>

          {/* req image */}
                  {r.req_picture && (
                    <div className="mb-6">
              
            <img
              src={r.req_picture || ReqplaceholderImage}
                        alt={r.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          </div>
                  )}

                  {/* Financial details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
              <dt className="font-semibold text-gray-900 dark:text-white">Amount Due</dt>
              <dd className="text-gray-500 dark:text-gray-400">₱{r.amount_due.toFixed(2)}</dd>
            </div>

            <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
              <dt className="font-semibold text-gray-900 dark:text-white">Amount Paid</dt>
              <dd className="text-gray-500 dark:text-gray-400">₱{t.amount_paid.toFixed(2)}</dd>
            </div>

            <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
                      <dt className="font-semibold text-gray-900 dark:text-white">Payment Status</dt>
                      <dd className={`capitalize ${
                        t.payment_status === 'paid' ? 'text-green-500' 
                        : t.payment_status === 'partial' ? 'text-yellow-500'
                        : 'text-red-500'
                      }`}>
                        {t.payment_status}
                      </dd>
            </div>

            <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
                      <dt className="font-semibold text-gray-900 dark:text-white">Payment Method</dt>
              <dd className="text-gray-500 dark:text-gray-400">{t.payment_method || '—'}</dd>
            </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
                      <dt className="font-semibold text-gray-900 dark:text-white">Due Date</dt>
                      <dd className="text-gray-500 dark:text-gray-400">
                        {new Date(t.due_date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </dd>
                    </div>

                    <div className="col-span-1 p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
                      <dt className="font-semibold text-gray-900 dark:text-white">Date Added</dt>
                      <dd className="text-gray-500 dark:text-gray-400">
                        {new Date(t.date_added).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </dd>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fee Description</h5>
                    <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700 min-h-[80px]">
                      <p className="text-gray-500 dark:text-gray-400 whitespace-pre-line">
                        {t.fee_description || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Verification info */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Verification</h5>
                    <div className="p-3 bg-gray-100 rounded-lg dark:bg-gray-700">
                      <p className="text-gray-500 dark:text-gray-400">
                        {t.verified_by ? 
                          userMap[t.verified_by] ? 
                            `Verified by: ${userMap[t.verified_by].user_fname} ${userMap[t.verified_by].user_lname}` 
                            : `Verified by ID: ${t.verified_by}` 
                          : 'Not verified'}
                      </p>
                    </div>
                  </div>

          {/* footer buttons */}
          <div className="flex space-x-4 mt-8">
            <Button
              onClick={() => {
                setIsPreviewOpen(false);
                openEdit(t);
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
                      onClick={() => {
                        setIsPreviewOpen(false);
                        openUpdate(t);
                      }}
                      className="w-full bg-secondary-500 hover:bg-secondary-400 py-1"
                    >
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2 mt-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
                        </svg>
                        <span className="text-base font-medium">Update</span>
                      </div>
            </Button>
            <Button
              color="failure"
              onClick={() => {
                setIsPreviewOpen(false);
                setDeleteTxnId(t.transaction_id);
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
      );
    })()}
  </div>
</div>
        
      </div>
    </div>
  );
};

export default Transactions;