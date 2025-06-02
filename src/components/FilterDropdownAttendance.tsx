import React from 'react';

export type AttendanceStatus = 'present' | 'late' | 'excused';

export interface AttendanceFilters {
  search: string;
  statuses: Record<AttendanceStatus, boolean>;
  event: string;
  course: string;
  year: string;
  section: string;
}

interface FilterDropdownProps {
  isOpen: boolean;
  toggle: () => void;
  filters: AttendanceFilters;
  setFilters: React.Dispatch<React.SetStateAction<AttendanceFilters>>;
  events: string[];
  courses: string[];
  years: string[];
  sections: string[];
}

const FilterDropdownAttendance: React.FC<FilterDropdownProps> = ({
  isOpen, toggle, filters, setFilters,
  events, courses, years, sections,
}) => {
  const toggleStatus = (s: AttendanceStatus) =>
    setFilters(f => ({
      ...f,
      statuses: { ...f.statuses, [s]: !f.statuses[s] },
    }));

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'text-green-600 dark:text-green-400';
      case 'late': return 'text-yellow-600 dark:text-yellow-400';
      case 'excused': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="relative inline-block text-left dark:text-white">
      <button
        onClick={toggle}
        className="flex items-center justify-center py-3 px-4 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 transition-all duration-200">
        Filter options
        <svg
          className={`w-4 h-4 ml-1 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 
                   011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      <div
        className={`absolute right-0 z-50 mt-2 w-80 px-1 py-4 pb-6 bg-white rounded-lg shadow
                    dark:bg-gray-700 dark:border-gray-600 border transition-opacity
                    duration-200 origin-top ${
                      isOpen
                        ? 'opacity-100 pointer-events-auto translate-y-0'
                        : 'opacity-0 pointer-events-none -translate-y-2'
                    }`}
      >
        {/* Header / Clear */}
        <div className="flex items-center justify-between px-4 py-0 mt-">
          <span className="text-sm font-medium text-black dark:text-white">Filters</span>
          <button
            onClick={() =>
              setFilters({
                search: '',
                statuses: { present: false, late: false, excused: false },
                event: '',
                course: '',
                year: '',
                section: '',
              })
            }
            className="text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            Clear all
          </button>
        </div>

        {/* Search */}
        <div className="pt-3 pb-2 px-3">
          <label htmlFor="input-group-search" className="sr-only">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              id="input-group-search"
              placeholder="Search students, events..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Status */}
        <div className="px-4 py-0 mt-0 mb-2 dark:border-gray-600">
          <p className="text-xs font-medium mb-1 dark:text-gray-300">Attendance Status</p>
          {(['present', 'late', 'excused'] as AttendanceStatus[]).map(s => (
            <label key={s} className="flex items-center mb-1 text-sm">
              <input
                type="checkbox"
                checked={filters.statuses[s]}
                onChange={() => toggleStatus(s)}
                className="mr-2 focus:ring-3 focus:ring-primary-400 dark:focus:ring-primary-400 dark:ring-offset-gray-800 rounded text-primary-400 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className={getStatusColor(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </label>
          ))}
        </div>

        {/* Event */}
        <div className="px-4 py-2 border-t dark:border-gray-600">
          <p className="text-xs font-medium mb-1 dark:text-gray-300">Event</p>
          <select
            value={filters.event}
            onChange={e =>
              setFilters(f => ({ ...f, event: e.target.value }))
            }
            className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>

        {/* Course / Year / Section */}
        <div className="px-4 py-2 border-t dark:border-gray-600 space-y-2">
          <select
            value={filters.course}
            onChange={e =>
              setFilters(f => ({ ...f, course: e.target.value }))
            }
            className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
          >
            <option value="">All Courses</option>
            {courses.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={e =>
              setFilters(f => ({ ...f, year: e.target.value }))
            }
            className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
          >
            <option value="">All Years</option>
            {[...years]
                .sort((a, b) => Number(a) - Number(b))
                .map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))} 
          </select>

          <select
            value={filters.section}
            onChange={e =>
              setFilters(f => ({ ...f, section: e.target.value }))
            }
            className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
          >
            <option value="">All Sections</option>
            {[...sections]
                .sort((a, b) => a.localeCompare(b))
                .map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterDropdownAttendance; 