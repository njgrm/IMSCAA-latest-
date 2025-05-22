import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import headerlogo from '../assets/headerlogo.png';
import headerlogoDark from '../assets/headerlogoDark.png';
import ProfileMenu from './ProfileMenu'
import { ThemeContext } from '../theme/ThemeContext';

interface SidebarProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}


interface NavItem {
  to: string;
  label: string;
  sub?: NavItem[];
  icon?: React.ReactNode;
}

const navItems: NavItem[] = [
  { 
    to: '/dashboard',    
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path d="M13.5 2c-.178 0-.356.013-.492.022l-.074.005a1 1 0 0 0-.934.998V11a1 1 0 0 0 1 1h7.975a1 1 0 0 0 .998-.934l.005-.074A7.04 7.04 0 0 0 22 10.5 8.5 8.5 0 0 0 13.5 2Z"/>
        <path d="M11 6.025a1 1 0 0 0-1.065-.998 8.5 8.5 0 1 0 9.038 9.039A1 1 0 0 0 17.975 13H11V6.025Z"/>
      </svg>
    )
  },
  { 
    to: '/members',      
    label: 'Members',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 6a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm-1.5 8a4 4 0 0 0-4 4 2 2 0 0 0 2 2h7a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-3Zm6.82-3.096a5.51 5.51 0 0 0-2.797-6.293 3.5 3.5 0 1 1 2.796 6.292ZM19.5 18h.5a2 2 0 0 0 2-2 4 4 0 0 0-4-4h-1.1a5.503 5.503 0 0 1-.471.762A5.998 5.998 0 0 1 19.5 18ZM4 7.5a3.5 3.5 0 0 1 5.477-2.889 5.5 5.5 0 0 0-2.796 6.293A3.501 3.501 0 0 1 4 7.5ZM7.1 12H6a4 4 0 0 0-4 4 2 2 0 0 0 2 2h.5a5.998 5.998 0 0 1 3.071-5.238A5.505 5.505 0 0 1 7.1 12Z" clipRule="evenodd"/>
      </svg>
    )
  },
  { 
    to: '/requirements', 
    label: 'Requirements',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M9 2a1 1 0 0 0-1 1H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2a1 1 0 0 0-1-1H9Zm1 2h4v2h1a1 1 0 1 1 0 2H9a1 1 0 0 1 0-2h1V4Zm5.707 8.707a1 1 0 0 0-1.414-1.414L11 14.586l-1.293-1.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" clipRule="evenodd"/>
      </svg>
    )
  },
  { 
    to: '/transactions', 
    label: 'Transactions',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M7 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2v-4a3 3 0 0 0-3-3H7V6Z" clipRule="evenodd"/>
        <path fillRule="evenodd" d="M2 11a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7Zm7.5 1a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" clipRule="evenodd"/>
        <path d="M10.5 14.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
      </svg>
    )
  },
  { 
    to: '/attendance',   
    label: 'Attendance',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
  <path fill-rule="evenodd" d="M8 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1h2a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2Zm6 1h-4v2H9a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2h-1V4Zm-3 8a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm-2-1a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H9Zm2 5a1 1 0 0 1 1-1h3a1 1 0 1 1 0 2h-3a1 1 0 0 1-1-1Zm-2-1a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H9Z" clip-rule="evenodd"/>
</svg>

    )
  },

  { 
    to: '/approvals',   
    label: 'Approvals',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
  <path fill-rule="evenodd" d="M15.03 9.684h3.965c.322 0 .64.08.925.232.286.153.532.374.717.645a2.109 2.109 0 0 1 .242 1.883l-2.36 7.201c-.288.814-.48 1.355-1.884 1.355-2.072 0-4.276-.677-6.157-1.256-.472-.145-.924-.284-1.348-.404h-.115V9.478a25.485 25.485 0 0 0 4.238-5.514 1.8 1.8 0 0 1 .901-.83 1.74 1.74 0 0 1 1.21-.048c.396.13.736.397.96.757.225.36.32.788.269 1.211l-1.562 4.63ZM4.177 10H7v8a2 2 0 1 1-4 0v-6.823C3 10.527 3.527 10 4.176 10Z" clip-rule="evenodd"/>
</svg>
    )
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Zm-1 9a1 1 0 1 0-2 0v2a1 1 0 1 0 2 0v-2Zm2-5a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 4a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0v-3Z" clipRule="evenodd"/>
      </svg>
    ),
    sub: [
      { to: '/reports/clearance',       label: 'Clearance Completion' },
      { to: '/reports/event-attendance',label: 'Event Attendance' },
      { to: '/reports/transaction-report', label: 'Transactional Fees' },
    ]
  },
  { 
    to: '/history',      
    label: 'History',
    icon: (
      <svg className="w-5 h-5 mr-2 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M5.617 2.076a1 1 0 0 1 1.09.217L8 3.586l1.293-1.293a1 1 0 0 1 1.414 0L12 3.586l1.293-1.293a1 1 0 0 1 1.414 0L16 3.586l1.293-1.293A1 1 0 0 1 19 3v18a1 1 0 0 1-1.707.707L16 20.414l-1.293 1.293a1 1 0 0 1-1.414 0L12 20.414l-1.293 1.293a1 1 0 0 1-1.414 0L8 20.414l-1.293 1.293A1 1 0 0 1 5 21V3a1 1 0 0 1 .617-.924ZM9 7a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H9Zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H9Zm0 4a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H9Z" clipRule="evenodd"/>
      </svg>
    )
  },
];

const Sidebar: React.FC = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  const isDarkMode = theme === 'dark';
  const toggleDarkMode = () => setTheme(isDarkMode ? 'light' : 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRequirementsOpen, setIsRequirementsOpen] = useState(false);
  const [openReports, setOpenReports] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const itemRefs = useRef<Record<string, HTMLLIElement>>({});
  const [highlight, setHighlight] = useState({ top: 0, height: 0 });
  const { pathname } = useLocation();
  const highlightRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [reportsManuallyOpen, setReportsManuallyOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost/my-app-server/get_current_user.php', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUserRole(data.role ? data.role.toLowerCase() : null))
      .catch(() => setUserRole(null));
  }, []);

  const filteredNavItems = React.useMemo(() => {
    if (userRole === 'member') {
      return navItems.filter(item => ['dashboard', 'history'].includes(item.label.toLowerCase()));
    }
    return navItems;
  }, [userRole]);

  // Find active item based on pathname
  useEffect(() => {
    let activeKey: string | undefined;
    let reportsHasActive = false;
    for (let itm of filteredNavItems) {
      if (itm.sub) {
        const sub = itm.sub.find(s => pathname.startsWith(s.to));
        if (sub) { 
          activeKey = sub.to; 
          reportsHasActive = true;
          break; 
        }
      }
      if (pathname.startsWith(itm.to)) {
        activeKey = itm.to;
        break;
      }
    }
    // Reset manual open if navigating to a sub-route
    if (reportsHasActive) setReportsManuallyOpen(false);
    setOpenReports(reportsHasActive || reportsManuallyOpen);
    if (activeKey && itemRefs.current[activeKey]) {
      setActiveItem(activeKey);
      const el = itemRefs.current[activeKey]!;
      setHighlight({ top: el.offsetTop, height: el.offsetHeight });
    }
  }, [pathname, reportsManuallyOpen, filteredNavItems]);

  // Only show highlight if the item is visible
  const showHighlight = (() => {
    // If activeItem is a sub-route of Reports, only show highlight if openReports is true
    const reportsSubRoutes = filteredNavItems.find(i => i.to === '/reports')?.sub?.map(s => s.to) || [];
    if (reportsSubRoutes.includes(activeItem || '')) {
      return openReports;
    }
    return true;
  })();

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start rtl:justify-end">
              {/* Mobile hamburger button */}
              <button
                  type="button"
                   className="inline-flex items-center p-2 text-sm text-gray-500 sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                   onClick={() => setSidebarOpen(o => !o)}
                  aria-label="Toggle sidebar"
                >
                <svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                </svg>
              </button>

              {/* Logo */}
              <Link to="/dashboard" className="flex items-center ml-2 md:ml-4">
                <img
                  src={isDarkMode ? headerlogoDark : headerlogo}
                  alt="Logo"
                  className="h-8 me-3"
                />
                    <span className="text-2xl font-bold text-[#12262f] dark:text-primary-400">
                            <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
                              IMS
                            </span>
                            <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
                              CCA
                            </span>
                          </span>
              </Link>
            </div>

            {/* Profile dropdown */}
            <div className="relative ml-3 inline-block text-left"> 
            <ProfileMenu />
                </div>

            </div>
        </div>
      </nav>

      <aside className={`fixed top-0 left-0 h-screen w-64 pt-20 bg-white dark:bg-gray-800 border-r dark:border-gray-700 transition-transform ${sidebarOpen? 'translate-x-10':'-translate-x-full'} sm:translate-x-0`}>
      <ul className="relative space-y-1 font-medium overflow-y-auto h-full px-2">
        {/* sliding highlight */}
        {showHighlight && (
        <div
          ref={highlightRef}
          className="absolute left-2 right-4 bg-primary-600 rounded transition-transform duration-300 ease-in-out will-change-transform"
          style={{ 
            top: highlight.top,
            height: highlight.height,
            transform: `translateY(0)` 
          }}
        />
        )}

        {filteredNavItems.map(item => {
          const isActive = activeItem === item.to || (item.sub && item.sub.some(s => activeItem === s.to));
          
          return (
            <React.Fragment key={item.to}>
              <li
                ref={el => {
                  if (el) itemRefs.current[item.to] = el;
                }}
                className="relative z-10"
              >
                {item.sub ? (
                  <button
                    onClick={() => {
                      // Only allow manual toggle if not on a sub-route
                      const reportsSubRoutes = filteredNavItems.find(i => i.to === '/reports')?.sub?.map(s => s.to) || [];
                      const isOnSubRoute = reportsSubRoutes.some(r => pathname.startsWith(r));
                      if (!isOnSubRoute) setReportsManuallyOpen(o => !o);
                    }}
                    className={`w-full flex justify-between items-center px-4 py-2 transition-all duration-200 ease-in-out hover:scale-[1.02] transform group ${
                      isActive 
                        ? 'text-white' 
                        : 'text-gray-900 dark:text-white hover:text-primary-400 dark:hover:text-primary-400'
                    }`}
                  >
                    <div className="flex items-center">
                      {item.icon && (
                        <div className={`transition-colors duration-200 ${
                          isActive 
                            ? 'text-white hover:text-white' 
                            : 'text-gray-800 dark:text-white group-hover:text-primary-400 dark:group-hover:text-primary-400'
                        }`}>
                          {item.icon}
                        </div>
                      )}
                      {item.label}
                    </div>
                    <svg
                      className={`w-4 h-4 transform transition-all duration-300 ${
                        isActive 
                          ? 'text-white hover:text-white' 
                          : 'text-gray-800 dark:text-white group-hover:text-primary-400 dark:group-hover:text-primary-400'
                      } ${openReports ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d={openReports ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                    </svg>
                  </button>
                ) : (
                  <Link
                    to={item.to}
                    className={`block px-4 py-2 transition-all duration-200 ease-in-out hover:scale-[1.02] transform group ${
                      isActive 
                        ? 'text-white' 
                        : 'text-gray-900 dark:text-white hover:text-primary-400 dark:hover:text-primary-400'
                    }`}
                  >
                    <div className="flex items-center">
                      {item.icon && (
                        <div className={`transition-colors duration-200 ${
                          isActive 
                            ? 'text-white hover:text-white' 
                            : 'text-gray-800 dark:text-white group-hover:text-primary-400 dark:group-hover:text-primary-400'
                        }`}>
                          {item.icon}
                        </div>
                      )}
                      {item.label}
                    </div>
                  </Link>
                )}
              </li>

              {item.sub && (
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openReports ? 'max-h-60 mb-1' : 'max-h-0'
                  }`}
                >
                  <ul className="ml-4 space-y-1">
                    {item.sub.map(sub => {
                      const isSubActive = activeItem === sub.to;
                      
                      return (
                        <li
                          key={sub.to}
                          ref={el => {
                            if (el) itemRefs.current[sub.to] = el;
                          }}
                          className="relative z-10"
                        >
                          <Link
                            to={sub.to}
                          
                            className={`block px-4 py-1 transition-all duration-200 ease-in-out hover:scale-[1.02] transform ${
                              isSubActive 
                                ? 'text-white hover:text-white' 
                                : 'text-gray-800 dark:text-gray-300 hover:text-primary-400 dark:hover:text-primary-400'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ul>
    </aside>
    </>
  );
};

export default Sidebar;