import React, { useState, useContext, useEffect, useMemo } from "react";
import { ThemeContext } from './theme/ThemeContext';
import { Button, Modal } from "flowbite-react";
import Sidebar from './components/Sidebar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Searchbar from "./components/Searchbar";
import Breadcrumb, { BreadcrumbItem } from './components/Breadcrumb';

interface Event {
  requirement_id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'canceled';
  requirement_type: string;
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
  // From join
  event_title?: string;
}

interface TimeSlotForm {
  slot_name: string;
  start_time: string;
  end_time: string;
  date: string;
}

const AttendanceConfig: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const [events, setEvents] = useState<Event[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Modal states
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [isEditSlotModalOpen, setIsEditSlotModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Form states
  const [slotForm, setSlotForm] = useState<TimeSlotForm>({
    slot_name: '',
    start_time: '',
    end_time: '',
    date: ''
  });
  
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<TimeSlot | null>(null);

  const trail: BreadcrumbItem[] = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Attendance', to: '/attendance/config' },
    { label: 'Configuration' }
  ];

  // Fetch events (only events, not other requirement types)
  const fetchEvents = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch time slots
  const fetchTimeSlots = async () => {
    try {
      const response = await fetch('http://localhost/my-app-server/get_time_slots.php', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch time slots');
      }
      
      const data = await response.json();
      setTimeSlots(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load time slots');
      console.error('Error fetching time slots:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchTimeSlots();
  }, []);

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (!search) return events;
    return events.filter(event =>
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.description.toLowerCase().includes(search.toLowerCase()) ||
      event.location.toLowerCase().includes(search.toLowerCase())
    );
  }, [events, search]);

  // Get time slots for selected event
  const eventTimeSlots = useMemo(() => {
    if (!selectedEvent) return [];
    return timeSlots.filter(slot => slot.requirement_id === selectedEvent.requirement_id);
  }, [timeSlots, selectedEvent]);

  // Handle form changes
  const handleSlotFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSlotForm(prev => ({ ...prev, [name]: value }));
  };

  // Add time slot
  const handleAddTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      const response = await fetch('http://localhost/my-app-server/add_time_slot.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement_id: selectedEvent.requirement_id,
          ...slotForm
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add time slot');
      }

      toast.success('Time slot added successfully!');
      setIsAddSlotModalOpen(false);
      setSlotForm({ slot_name: '', start_time: '', end_time: '', date: '' });
      await fetchTimeSlots();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add time slot');
    }
  };

  // Edit time slot
  const handleEditTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    try {
      const response = await fetch('http://localhost/my-app-server/update_time_slot.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: editingSlot.slot_id,
          ...slotForm
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update time slot');
      }

      toast.success('Time slot updated successfully!');
      setIsEditSlotModalOpen(false);
      setEditingSlot(null);
      setSlotForm({ slot_name: '', start_time: '', end_time: '', date: '' });
      await fetchTimeSlots();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update time slot');
    }
  };

  // Delete time slot
  const handleDeleteTimeSlot = async () => {
    if (!deletingSlot) return;

    try {
      const response = await fetch('http://localhost/my-app-server/delete_time_slot.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: deletingSlot.slot_id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete time slot');
      }

      toast.success('Time slot deleted successfully!');
      setIsDeleteModalOpen(false);
      setDeletingSlot(null);
      await fetchTimeSlots();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete time slot');
    }
  };

  // Toggle time slot active status
  const toggleSlotStatus = async (slot: TimeSlot) => {
    try {
      const response = await fetch('http://localhost/my-app-server/toggle_time_slot.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: slot.slot_id,
          is_active: !slot.is_active
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle time slot status');
      }

      toast.success(`Time slot ${!slot.is_active ? 'enabled' : 'disabled'} successfully!`);
      await fetchTimeSlots();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle time slot status');
    }
  };

  // Open edit modal
  const openEditModal = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setSlotForm({
      slot_name: slot.slot_name,
      start_time: slot.start_time,
      end_time: slot.end_time,
      date: slot.date
    });
    setIsEditSlotModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (slot: TimeSlot) => {
    setDeletingSlot(slot);
    setIsDeleteModalOpen(true);
  };

  // Open add modal
  const openAddModal = (event: Event) => {
    setSelectedEvent(event);
    // Pre-fill date with event start date
    const eventDate = new Date(event.start_datetime).toISOString().split('T')[0];
    setSlotForm({
      slot_name: '',
      start_time: '',
      end_time: '',
      date: eventDate
    });
    setIsAddSlotModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ongoing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'canceled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
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
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Events List */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Events ({filteredEvents.length})
                </h2>
                
                <div className="space-y-4 max-h- overflow-y-auto">
                  {filteredEvents.map(event => {
                    const slots = timeSlots.filter(slot => slot.requirement_id === event.requirement_id);
                    const activeSlots = slots.filter(slot => slot.is_active);
                    
                    return (
                      <div
                        key={event.requirement_id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedEvent?.requirement_id === event.requirement_id
                                ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                          {event.description}
                        </p>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M11.906 1.994a8.002 8.002 0 0 1 8.09 8.421 7.996 7.996 0 0 1-1.297 3.957.996.996 0 0 1-.133.204l-.108.129c-.178.243-.37.477-.573.699l-5.112 6.224a1 1 0 0 1-1.545 0L5.982 15.26l-.002-.002a18.146 18.146 0 0 1-.309-.38l-.133-.163a.999.999 0 0 1-.13-.202 7.995 7.995 0 0 1 6.498-12.518ZM15 9.997a3 3 0 1 1-5.999 0 3 3 0 0 1 5.999 0Z" clipRule="evenodd"/>
                            </svg>
                            {event.location}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd"/>
                            </svg>
                            {new Date(event.start_datetime).toLocaleDateString()} - {new Date(event.end_datetime).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd"/>
                            </svg>
                            {activeSlots.length} active time slot{activeSlots.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddModal(event);
                            }}
                            className="bg-primary-600 hover:bg-primary-500 text-white"
                          >
                            Add Time Slot
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Management */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Time Slots {selectedEvent && `for ${selectedEvent.title}`}
                  </h2>
                  {selectedEvent && (
                    <Button
                      onClick={() => openAddModal(selectedEvent)}
                      className="bg-primary-600 hover:bg-primary-500 text-white"
                    >
                      Add Time Slot
                    </Button>
                  )}
                </div>

                {selectedEvent ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {eventTimeSlots.length > 0 ? (
                      eventTimeSlots.map(slot => (
                        <div
                          key={slot.slot_id}
                          className={`p-4 border rounded-lg ${
                            slot.is_active
                              ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                              : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">{slot.slot_name}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                slot.is_active
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {slot.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd"/>
                              </svg>
                              {new Date(slot.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-gray-500 dark:text-primary-400 mr-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd"/>
                              </svg>
                              {slot.start_time} - {slot.end_time}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditModal(slot)}
                              className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleSlotStatus(slot)}
                              className={`px-3 py-1 text-xs font-medium rounded ${
                                slot.is_active
                                  ? 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                                  : 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                              }`}
                            >
                              {slot.is_active ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => openDeleteModal(slot)}
                              className="px-3 py-1 text-xs font-medium text-red-600 bg-red-100 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No time slots</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                          Create time slots to allow time-specific attendance tracking.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Select an event</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                      Choose an event from the list to view and manage its time slots.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Time Slot Modal */}
        <Modal show={isAddSlotModalOpen} onClose={() => setIsAddSlotModalOpen(false)}>
          <Modal.Header className="dark:bg-gray-800">
            Add Time Slot for {selectedEvent?.title}
          </Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white">
            <form onSubmit={handleAddTimeSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slot Name
                </label>
                <input
                  type="text"
                  name="slot_name"
                  value={slotForm.slot_name}
                  onChange={handleSlotFormChange}
                  required
                  placeholder="e.g., Morning Session, Registration"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={slotForm.start_time}
                    onChange={handleSlotFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={slotForm.end_time}
                    onChange={handleSlotFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={slotForm.date}
                  onChange={handleSlotFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  color="gray"
                  onClick={() => setIsAddSlotModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white"
                >
                  Add Time Slot
                </Button>
              </div>
            </form>
          </Modal.Body>
        </Modal>

        {/* Edit Time Slot Modal */}
        <Modal show={isEditSlotModalOpen} onClose={() => setIsEditSlotModalOpen(false)}>
          <Modal.Header className="dark:bg-gray-800">
            Edit Time Slot
          </Modal.Header>
          <Modal.Body className="dark:bg-gray-800 dark:text-white">
            <form onSubmit={handleEditTimeSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slot Name
                </label>
                <input
                  type="text"
                  name="slot_name"
                  value={slotForm.slot_name}
                  onChange={handleSlotFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={slotForm.start_time}
                    onChange={handleSlotFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={slotForm.end_time}
                    onChange={handleSlotFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={slotForm.date}
                  onChange={handleSlotFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  color="gray"
                  onClick={() => setIsEditSlotModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white"
                >
                  Update Time Slot
                </Button>
              </div>
            </form>
          </Modal.Body>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
          <Modal.Body className="p-4 text-center bg-white dark:bg-gray-800 rounded-lg shadow sm:p-5">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-2.5 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
              </svg>
            </button>

            <svg className="mx-auto mb-4 text-gray-400 w-14 h-14 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>

            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to delete the time slot "{deletingSlot?.slot_name}"?<br/>
              This action cannot be undone and will affect any existing attendance records.
            </h3>

            <div className="flex justify-center items-center space-x-4">
              <Button
                color="failure"
                onClick={handleDeleteTimeSlot}
                className="px-5 py-2.5 text-sm font-medium"
              >
                Yes, delete
              </Button>
              <Button
                color="gray"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium"
              >
                Cancel
              </Button>
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default AttendanceConfig; 