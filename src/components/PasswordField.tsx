import React, { useState, useContext } from "react";
import { ThemeContext } from '../theme/ThemeContext';

interface PasswordFieldProps {
  id: string;
  error?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  id, error = false, onChange, value
}) => {
  const { isDark } = useContext(ThemeContext);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name="password"
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="new-password"
        className={`
          block w-full pr-10 rounded-lg p-2.5
          bg-gray-50 border
          ${error
            ? "border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-red-500 dark:text-red-500"
            : "border-gray-300 text-gray-900 focus:ring-primary-600 focus:border-primary-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          }
        `}
        placeholder="••••••••"
        required
      />

      {/* show/hide toggle */}
      {(focused || value.length > 0) && (
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute inset-y-0 right-2 flex items-center"
        >
          {visible ? (
            <svg
              className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-600"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {/* eye-off */}
              <path d="M4.03 3.97a.75.75 0 00-1.06 1.06l1.14 1.14C3.48 7.02 2.14 8.82 1 10c1.14 1.18 2.48 2.98 3.11 3.83l1.14 1.14a.75.75 0 001.06-1.06L4.12 11H9a3 3 0 002.83-2H12a3 3 0 00-2-2h-.17l-5.8-5.8zM10 5a5 5 0 014.9 3.8l1.26-1.26A7 7 0 0010 3a7 7 0 00-5.16 2.14L6.64 6.5A5 5 0 0110 5zm0 10a5 5 0 01-4.9-3.8L3.84 12.44A7 7 0 0010 17a7 7 0 005.16-2.14l-1.26-1.26A5 5 0 0110 15z" />
            </svg>
          ) : (
            <svg
              className={`w-5 h-5 ${isDark ? "text-white" : "text-gray-600"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              {/* eye */}
              <path d="M10 3a7 7 0 00-6.32 4 .75.75 0 001.36.56A5.5 5.5 0 1110 15.5c-1.95 0-3.7-.9-4.94-2.32a.75.75 0 10-1.08 1.04A7 7 0 0010 17a7 7 0 000-14zm0 12a5.5 5.5 0 004.9-2.99A5.5 5.5 0 104.9 6.99 5.5 5.5 0 0010 15z" />
              <path d="M10 7a3 3 0 110 6 3 3 0 010-6z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default PasswordField;