import React from 'react';

interface SearchbarProps {
  search: string;
  onSearchChange: (newTerm: string) => void;
}

const Searchbar: React.FC<SearchbarProps> = ({ search, onSearchChange }) => {
  return (
    <div className="mr-6 flex flex-col md:flex-row items-stretch md:items-center md:space-x-3 space-y-3 md:space-y-0 justify-between w-full py-4">
      <div className="w-full md:w-96 sm:w-1/2 flex items-center justify-between">
        <div className="flex items-center w-full">
          <label htmlFor="simple-search" className="sr-only">Search</label>
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg aria-hidden="true" className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
                </svg>
            </div>
            <input
              type="text"
              id="simple-search"
              placeholder="Search..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                         focus:ring-primary-400 focus:border-primary-400 block w-full pl-10 p-2 
                         dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Searchbar;