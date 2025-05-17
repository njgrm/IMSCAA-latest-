import React from 'react';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface TxnFilters {
  search: string;
  statuses: Record<PaymentStatus, boolean>;
  methods: Record<string, boolean>;
  course: string;
  year: string;
  section: string;
}

interface FilterDropdownProps {
  isOpen: boolean;
  toggle: () => void;
  filters: TxnFilters;
  setFilters: React.Dispatch<React.SetStateAction<TxnFilters>>;
  methodsList: string[];
  courses: string[];
  years: string[];
  sections: string[];
}

const FilterDropdownTxn: React.FC<FilterDropdownProps> = ({
  isOpen, toggle, filters, setFilters,
  methodsList, courses, years, sections,
}) => {
  const toggleStatus = (s: PaymentStatus) =>
    setFilters(f => ({
      ...f,
      statuses: { ...f.statuses, [s]: !f.statuses[s] },
    }));

  const toggleMethod = (m: string) =>
    setFilters(f => ({
      ...f,
      methods: { ...f.methods, [m]: !f.methods[m] },
    }));

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
                statuses: { unpaid: false, partial: false, paid: false },
                methods: methodsList.reduce((acc, m) => ({ ...acc, [m]: false }), {}),
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
                placeholder="Search keywords..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:text-white dark:border-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>


        {/* Status */}
        <div className="px-4 py-0 mt-0 mb-2 dark:border-gray-600">
          <p className="text-xs font-medium mb-1 dark:text-gray-300">Status</p>
          {(['unpaid', 'partial', 'paid'] as PaymentStatus[]).map(s => (
            <label key={s} className="flex items-center mb-1 text-sm">
              <input
                type="checkbox"
                checked={filters.statuses[s]}
                onChange={() => toggleStatus(s)}
                 className="mr-2 focus:ring-3 focus:ring-primary-400 dark:focus:ring-primary-400 dark:ring-offset-gray-800 rounded text-primary-400 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </label>
          ))}
        </div>

        {/* Method */}
        <div className="px-4 py-2 border-t dark:border-gray-600">
          <p className="text-xs font-medium mb-1 dark:text-gray-300">Method</p>
          {methodsList.map(m => (
            <label key={m} className="flex items-center mb-1 text-sm">
              <input
                type="checkbox"
                checked={filters.methods[m] || false}
                onChange={() => toggleMethod(m)}
                 className="mr-2 focus:ring-3 focus:ring-primary-400 dark:focus:ring-primary-400 dark:ring-offset-gray-800 rounded text-primary-400 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              />
              {m}
            </label>
          ))}
        </div>

        {/* Course / Year / Section */}
        <div className="px-4 py-0 dark:border-gray-600 space-y-2">
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

export default FilterDropdownTxn;