import React, { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ThemeContext } from '../theme/ThemeContext'
import { Button, Modal } from 'flowbite-react'
import placeholderImage from "../assets/profilePlaceholder.png"

interface UserData {
  user_id: number;
  school_id: string;
  user_fname: string;
  user_mname: string;
  user_lname: string;
  avatar: string | null;
  role: string;
}

const ProfileMenu: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const { isDark, setTheme } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const toggleDarkMode = () => setTheme(isDark ? 'light' : 'dark')

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost/my-app-server/get_current_user.php', {
          method: 'GET',
          credentials: 'include',
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated, redirect to login
            navigate('/login', { replace: true })
            return
          }
          throw new Error('Failed to fetch user data')
        }

        const data = await response.json()
        setUserData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching user data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [navigate])

  // Get full name
  const getFullName = () => {
    if (!userData) return 'Loading...'
    
    const { user_fname, user_mname, user_lname } = userData
    const middleInitial = user_mname ? `${user_mname.charAt(0)}.` : ''
    
    return `${user_fname} ${middleInitial} ${user_lname}`.trim()
  }

  // Get avatar or default
  const getAvatar = () => {
    if (!userData || !userData.avatar) {
      return placeholderImage
    }
    return userData.avatar // Avatar is already a base64 string
  }

  // Sign-out handler
  const handleSignOut = async () => {
    try {
      await fetch('http://localhost/my-app-server/logout.php', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      console.error('Logout failed', err)
    } finally {
      // Clear any local storage items
      localStorage.removeItem('user_id')
      localStorage.removeItem('role')
      localStorage.removeItem('club_id')
      
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="relative inline-block text-left ml-3">
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-full focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
      >
        <span className="sr-only">Open user menu</span>
        <img
          src={getAvatar()}
          alt="Your avatar"
          className="w-full h-full rounded-full object-cover border-2 border-primary-400"
        />
      </button>

      {open && (
        <div
          className="absolute py-2 right-0 mt-2 w-56 origin-top-right bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50"
          role="menu"
        >
          {/* User info */}
          <div className="px-4 py-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {loading ? 'Loading...' : getFullName()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-300 mb-1">
              ID: {loading ? '...' : userData?.school_id}
            </p>
          </div>

          <hr className="border-gray-200 dark:border-gray-600" />

          {/* Dark mode toggle */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-sm text-gray-900 dark:text-gray-300">Dark mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isDark}
                onChange={toggleDarkMode}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-400 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:bg-primary-600 transition-colors duration-300" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white border border-gray-300 rounded-full shadow transform peer-checked:translate-x-5 transition-transform duration-300" />
            </label>
          </div>

          {/* Sign out */}
          <div className="pt-0 pb-0">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="pl-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white transition duration-150 ease-in-out rounded-md w-full"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        show={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        size="md"
      >
        <Modal.Body className="p-4 text-center bg-white dark:bg-gray-800 rounded-lg shadow sm:p-5 h-full flex flex-col justify-between">
          <div className="relative">
            <button
              onClick={() => setShowLogoutModal(false)}
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
                d="M17 16l4-4m0 0l-4-4m4 4H7"
              />
            </svg>

            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to sign out?
            </h3>
          </div>

          <div className="flex justify-center items-center space-x-4 transition-colors duration-200 ease-in-out">
            <Button
              color="failure"
              onClick={handleSignOut}
              className="px-5 py-2.5 text-sm font-medium"
            >
              Yes, sign out
            </Button>
            <Button
              color="gray"
              onClick={() => setShowLogoutModal(false)}
              className="px-5 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600"
            >
              No, stay logged in
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default ProfileMenu
