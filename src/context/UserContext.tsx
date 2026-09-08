import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  user_id: number;
  username: string;
  user_fname: string;
  user_lname: string;
  school_id: string;
  avatar: string;
  course: string;
  year: number;
  section: string;
  email: string;
  role: string;
  club_id: number;
}

interface UserContextType {
  user: User | null;
  userRole: string | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/my-app-server/get_current_user.php', {
        credentials: 'include'
      });

      if (res.status === 401) {
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        setUser(null);
        setUserRole(null);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }

      const userData = await res.json();

      if (userData && userData.user_id) {
        setUser(userData);
        const role = userData.role ? userData.role.toLowerCase() : null;
        setUserRole(role);

        // Cache in localStorage
        localStorage.setItem('userRole', role || '');
        localStorage.setItem('userData', JSON.stringify(userData));
      } else {
        // Clear cached data if user is not authenticated
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        setUser(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      // Clear cached data on error
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      setUser(null);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUser();
  };

  const logout = () => {
    setUser(null);
    setUserRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
  };

  useEffect(() => {
    // Check localStorage first for cached data
    const cachedRole = localStorage.getItem('userRole');
    const cachedUserData = localStorage.getItem('userData');

    if (cachedRole && cachedUserData) {
      try {
        const userData = JSON.parse(cachedUserData);
        setUser(userData);
        setUserRole(cachedRole);
        setIsLoading(false);

        // Still refresh in background to ensure data is current
        fetchUser();
      } catch (error) {
        // If cached data is corrupted, fetch fresh data
        fetchUser();
      }
    } else {
      // No cached data, fetch fresh
      fetchUser();
    }
  }, []);

  const value: UserContextType = {
    user,
    userRole,
    isLoading,
    refreshUser,
    logout
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
