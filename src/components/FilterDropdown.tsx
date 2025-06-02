import React from 'react';

export interface Filters {
  search: string;
  roles: Record<'President' | 'Officer' | 'Member' | 'Adviser', boolean>;
  course: string;
  year: string;
  section: string;
}

interface FilterDropdownProps {
  isOpen: boolean;
  toggle: () => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  courses: string[];
  years: string[];
  sections: string[];
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  isOpen,
  toggle,
  filters,
  setFilters,
  courses,
  years,
  sections,
}) => {
  const toggleRole = (role: 'President'|'Officer'|'Member') =>
    setFilters(f => ({
      ...f,
      roles: { ...f.roles, [role]: !f.roles[role] },
    }));

    return (
      <div className="relative inline-block text-left dark:text-white">
        <button 
          onClick={toggle} 
          className="flex items-center justify-center py-3 px-4 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 transition-all duration-200">
          Filter options
          <svg className={`w-4 h-4 ml-1 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </button>
          
          {/* Dropdown content */}
          <div
              className={`absolute right-0 z-50 mt-2 w-80 bg-white rounded-lg shadow dark:bg-gray-700 px-4 py-4 pt-1 border border-gray-200 dark:border-gray-600 transform-gpu transition-[opacity,transform] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top overflow-hidden ${
                isOpen 
                  ? 'opacity-100 translate-y-0 pointer-events-auto visible' 
                  : 'opacity-0 -translate-y-4 pointer-events-none invisible'
              }`}
            >
          {/* Clear / Close */}
          <div className="flex items-center justify-between pt-2">
            <h6 className="text-sm font-medium text-black dark:text-white">Filters</h6>
            <button
              onClick={() => setFilters({
                search: '',
                roles: { President: false, Officer: false, Member: false, Adviser: false },
                course: '',
                year: '',
                section: '',
              })}
              className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              Clear all
            </button>
          </div>

          {/* Search */}
          <div className="pt-3 pb-2">
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

          {/* Roles */}
          <div className="mb-3">
            <p className="text-xs font-medium mb-1">Role</p>
            {(['President','Officer','Member'] as const).map(r => (
              <label key={r} className="flex items-center text-sm mb-1">
                <input
                  type="checkbox"
                  checked={filters.roles[r]}
                  onChange={() => toggleRole(r)}
                  className="mr-2 focus:ring-3 focus:ring-primary-400 dark:focus:ring-primary-400 dark:ring-offset-gray-800 rounded text-primary-400 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                />
                {r}
              </label>
            ))}
          </div>

          {/* Course / Year / Section */}
          <div className="grid grid-cols-1 gap-2">
            <select
              value={filters.course}
              onChange={e => setFilters(f => ({ ...f, course: e.target.value }))}
              className="p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
            >
              <option value="">All Courses</option>
              {[...courses]
                .sort((a, b) => a.localeCompare(b))
                .map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>

            <select
                value={filters.year}
                onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
                className="p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
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
              onChange={e => setFilters(f => ({ ...f, section: e.target.value }))}
              className="p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400  dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
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

export default FilterDropdown;