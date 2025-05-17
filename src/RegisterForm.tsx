import React, { useState, useContext } from "react";
import { ThemeContext } from './theme/ThemeContext';
import logo from "./assets/logo.png"; 
import logoDark from "./assets/logo_dark.png";
import registerPic from "./assets/registerPic.svg";
import registerPicDark from "./assets/registerPicDark.svg"; 
import headerLogo from "./assets/headerlogo.png";
import headerlogoDark from "./assets/headerlogoDark.png";
import { Link } from 'react-router-dom';

const RegisterForm: React.FC = () => {
  const { isDark, theme, setTheme } = useContext(ThemeContext);
  const toggleDarkMode = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const [isChecked, setIsChecked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);


  const toggleCheckbox = () => {
    setIsChecked(!isChecked); 
  };



  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;

  const newPassword = (form.elements.namedItem('password') as HTMLInputElement).value;
  const confirm = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

  setPasswordMismatch(false);
  setMessage('');
  setMessageType('');

  if (newPassword !== confirm) {
    setPasswordMismatch(true);
    return;
  }

  const payload = {
    school_id: (form.elements.namedItem('school_id') as HTMLInputElement).value,
    fname: (form.elements.namedItem('fname') as HTMLInputElement).value,
    mname: (form.elements.namedItem('mname') as HTMLInputElement).value,
    lname: (form.elements.namedItem('lname') as HTMLInputElement).value,
    email: (form.elements.namedItem('email') as HTMLInputElement).value,
    course: (form.elements.namedItem('course') as HTMLSelectElement).value,
    year: (form.elements.namedItem('year') as HTMLInputElement).value,
    section: (form.elements.namedItem('section') as HTMLInputElement).value,
    club: (form.elements.namedItem('club') as HTMLInputElement).value,
    password: newPassword,
  };


  console.log(payload); 

  const res = await fetch('http://localhost/my-app-server/register.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const body = await res.json();
    setMessage('Account created successfully!');
    setMessageType('success');
  setTimeout(() => window.location.href = '/login', 2000);
  } else {
    const err = await res.json();
    setMessage(err.error || 'Registration failed');
    setMessageType('error');
  }
};

  return (
    <section className="custom-background bg-gray-50 dark:bg-gray-900 min-h-screen relative overflow-hidden">
      {/* Dark Mode Toggle Button */}
        <Link
    to="/landing"
    className="absolute top-6 left-[3%] flex items-center z-50 cursor-pointer"
  >
    <img
      src={isDark ? headerlogoDark : headerLogo}
      alt="Header Logo"
      className="h-12 w-auto transition-all duration-300"
    />
    <span className="ml-2 text-2xl font-bold">
      <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
        IMS
      </span>
      <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
        CCA
      </span>
    </span>
  </Link>
      <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg z-50"
      >
        {isDark ? "🌙" : "☀️"}
      </button>

      {/* SVG Wave Layers with Transitions */}
      {/* Hero Layer */}
      <div
        className="absolute bottom-0 left-0 w-full h-[90vh] bg-no-repeat bg-cover z-10 transition-all duration-200 ease-in-out"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -10 1040 320"><path fill="${
            isDark ? "%2312262f" : "%23238354"
          }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
        }}
      ></div>
      {/* Mid Layer */}
      <div
        className="absolute bottom-0 left-0 w-full h-[60vh] bg-no-repeat bg-cover z-20 opacity-90 transition-all duration-200 ease-in-out"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -20 1040 320"><path fill="${
            isDark ? "%231a3a4a" : "%232E9B63"
          }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
        }}
      ></div>
      {/* Top Layer */}
      <div
        className="absolute bottom-0 left-0 w-full h-[70vh] bg-no-repeat bg-cover z-30 opacity-95 transition-all duration-200 ease-in-out"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -120 1040 320"><path fill="${
            isDark ? "%23224c5f" : "%233FBF7F"
          }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
        }}
      ></div>

      {/* Main Layout: Flipped for Register */}
      <div className="relative z-40 flex flex-col min-h-screen w-full lg:flex-row">
        {/* Left Side: Illustration + Tagline */}
        <div className="hidden lg:flex w-[100%] lg:w-[60%] items-center justify-center relative px-0">
          <div className="flex flex-row items-center">
            <h2 className="text-7xl font-bold text-[#12262f] dark:text-white mr-[-4%] ml-[7%] mt-0 mb-[20%]">
            <span className="text-[#238354]">Integrate.</span>
            <br />
            <span className="text-[#2E9B63]">Manage.</span>
            <br />
            <span className="text-[#3FBF7F]">Streamline.</span>
            </h2>
            <img
              src={isDark ? registerPicDark : registerPic}
              alt="registerPic"
              className="w-[200%] h-auto mb-[10%] ml-[-16%] top-[20%]"
            />
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="flex items-center justify-center w-full lg:w-1/2 p-0 pb-0">
          <div className="relative z-50 w-[clamp(400px,90%,700px)] bg-white transition-colors duration-200 ease-in-out dark:bg-gray-800 dark:border-gray-600 rounded-xl shadow-xl dark:shadow-none border border-gray-200 p-12">
            {/* Acronym */}
            <div className="flex justify-center mb-2">
              <span className="text-4xl mt-[-5%] mb-[5%] font-bold">
              </span>
            </div>

            {/* Form Heading */}
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-center mt-[-5%] mb-10">
              <span className="hidden dark:block bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
                Sign Up as a Club President
              </span>
              <span className="dark:hidden bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">Sign Up as a Club President</span>
            </h1>

            {/* Registration Form: Two-Column Layout */}
            <form className="space-y-4" onSubmit={handleSubmit}>
            {/* School ID */}
            <div>
              <label 
                htmlFor="school_id" // Added htmlFor
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                School ID
              </label>
              <input
                type="text"
                name="school_id"
                id="school_id"
                placeholder="Enter your school ID"
                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  First Name
                </label>
                <input
                  type="text"
                  name="fname"
                  id="fname"
                  placeholder="Enter first name"
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Middle Initial
                </label>
                <input
                  type="text"
                  name="mname"
                  id="mname"
                  placeholder="M.I."
                  maxLength={1}
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lname"
                  id="lname"
                  placeholder="Enter last name"
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="Enter your email"
                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>

            {/* Course */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Course
              </label>
              <select
                name="course"
                id="course"
                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              >
                <option value="">Select Course</option>
                <option value="BS Information Technology">BS Information Technology</option>
                <option value="BS Information Systems">BS Information Systems</option>
                <option value="BS Electrical Engineering">BS Electrical Engineering</option>
                <option value="BS Computer Engineering">BS Computer Engineering</option>
                <option value="BTVTED">BTVTED</option>
                <option value="Bachelor in Industrial Technology">Bachelor in Industrial Technology</option>
              </select>
            </div>
            </div>

            {/* Year and Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Year
                </label>
                <input
                  type="text"
                  name="year"
                  id="year"
                  placeholder="Enter year level"
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Section
                </label>
                <input
                  type="text"
                  name="section"
                  id="section"
                  placeholder="Enter section"
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Existing Club Name, Password, and Agreement fields */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Club Name
              </label>
              <input
                type="text"
                name="club"
                id="club"
                placeholder="Enter club name"
                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="••••••••"
                  className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div>
                <label
                  htmlFor="confirmPassword"
                  className={`block mb-2 text-sm font-medium ${
                    passwordMismatch
                      ? 'text-red-700 dark:text-red-500'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  placeholder="••••••••"
                  className={`bg-gray-50 border ${
                    passwordMismatch
                      ? 'border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-red-500 dark:text-red-500 dark:placeholder-red-500'
                      : 'border-gray-300 text-gray-900 focus:ring-primary-600 focus:border-primary-600 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                  } rounded-lg block w-full p-2.5`}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordMismatch(false);
                  }}
                />
                {passwordMismatch && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-500">
                    <span className="font-medium">Warning!</span> Passwords do not match
                  </p>
                )}
              </div>
            </div>


              
                {/* Agreement Section with Custom Checkbox */}
                <div className="flex items-center space-x-3 space-y-4 mb-6 mt-4">
                {/* Custom Checkbox */}
                <div className="flex items-center h-5">
                  {/* Hidden default checkbox */}
                  <input
                    id="agreement"
                    type="checkbox"
                    className="hidden"
                    checked={isChecked}
                    onChange={toggleCheckbox}
                    required
                  />
                  {/* Custom checkbox */}
                  <div
                    onClick={toggleCheckbox}
                    className={`w-5 h-5 border border-gray-300 rounded flex items-center justify-center cursor-pointer focus:ring-primary-300 dark:border-gray-600 dark:focus:ring-primary-300 dark:ring-offset-gray-800 ${
                      isChecked
                        ? "bg-primary-500 border-primary-500 dark:bg-primary-500 dark:border-primary-500"
                        : "bg-gray-50 dark:bg-gray-700"
                    }`}
                  >
                    <svg
                      className={`w-3 h-3 text-white transition-opacity duration-200 ${
                        isChecked ? "opacity-100" : "opacity-0"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By signing up, you are creating an IMSCCA account, and you agree
                  to IMSCCA&apos;s{" "}
                  <a
                    href="#"
                    className="font-medium text-primary-600 hover:underline dark:text-primary-600"
                  >
                    Terms of Use
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="font-medium text-primary-600 hover:underline dark:text-primary-600"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>

              <button
                type="submit"
                className="w-full text-white bg-primary-600 hover:bg-primary-400 transform hover:scale-105 transition-all duration-300 ease-in-out focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-xl px-5 py-3 text-center dark:bg-primary-600 dark:hover:bg-primary-400 dark:focus:ring-primary-800"
              >
                Sign Up
              </button>
              <p className="text-sm font-light text-gray-500 dark:text-gray-400 text-center">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="font-medium text-primary-600 hover:underline dark:text-primary-600"
                >
                  Log In
                </a>
              </p>
            </form>

            {message && (
  <div className={`mt-4 p-3 rounded-lg text-center text-white ${messageType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
    {message}
  </div>
)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegisterForm;
