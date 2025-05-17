import React, { useState, useContext, useEffect } from "react";
import { ThemeContext } from './theme/ThemeContext';
import logo from "./assets/logo.png"; 
import loginPic from "./assets/loginPic.svg";
import loginPicDark from "./assets/loginPicDark.png"; 
import logoDark from "./assets/logo_dark.png";
import headerLogo from "./assets/headerlogo.png";
import headerlogoDark from "./assets/headerlogoDark.png";
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';


const FlowbiteForm: React.FC = () => {
  const { isDark, theme, setTheme } = useContext(ThemeContext);
  const toggleDarkMode = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const [isChecked, setIsChecked] = useState(false);
  const [error, setError] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const toggleCheckbox = () => {
    setIsChecked(!isChecked);
  };



  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const school_id = (form.elements.namedItem('school_id') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
  
    setIsError(false);
    setError("");
  
    try {
      const res = await fetch(
        'http://localhost/my-app-server/login.php',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id, password })
        }
      );
  
      if (res.ok) {
        const body = await res.json();
        localStorage.setItem('user_id', String(body.user_id));
        localStorage.setItem('role', body.role);
        localStorage.setItem('club_id', String(body.club_id));
        navigate('/dashboard');
      } else {
        const err = await res.json();
        setError(err.error || 'Login failed');
        setIsError(true);
      }
    } catch (err) {
      console.error(err);
      setError('Network/server error');
      setIsError(true);
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
      {/* Hero Layer (Dark Green / Dark Blue) */}
      <div
        className="absolute bottom-0 left-0 w-full h-[90vh] bg-no-repeat bg-cover z-10 transition-all duration-200 ease-in-out"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -10 1040 320"><path fill="${
            isDark ? "%2312262f" : "%23238354"
          }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
        }}
      ></div>

      {/* Mid Green / Mid Blue Layer */}
      <div
        className="absolute bottom-0 left-0 w-full h-[60vh] bg-no-repeat bg-cover z-20 opacity-90 transition-all duration-200 ease-in-out"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -20 1040 320"><path fill="${
            isDark ? "%231a3a4a" : "%232E9B63"
          }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
        }}
      ></div>

      {/* Light Green / Light Blue Layer */}
      <div
        className="absolute bottom-0 left-0 w-full h-[70vh] bg-no-repeat bg-cover z-30 opacity-95 transition-all duration-200 ease-in-out"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -120 1040 320"><path fill="${
            isDark ? "%23224c5f" : "%233FBF7F"
          }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
        }}
      ></div>

{/* Main Layout */}
<div className="relative z-40 flex flex-col min-h-screen w-full lg:flex-row">
  {/* Left Side: Login Form */}
  <div className="flex items-center justify-center w-full lg:w-1/2 p-6 ml-[-5%] z-100">
    <div className="w-[clamp(300px,80%,500px)] bg-white dark:bg-gray-800 dark:border-gray-600 rounded-xl shadow-xl dark:shadow-none border border-gray-200 p-12 transition-colors duration-200 ease-in-out">
            {/* Acronym */}
          <div className="flex justify-center mb-2">
            {/* Dark mode gradient version */}
            <span className=" text-4xl font-bold mt-[-3%]">

            </span>
          </div>

          <div className="flex justify-center mb-4 mt-[-13%]  border-primary-700 "> 
            <img 
             src={isDark ? logoDark : logo}
            alt="Logo" 
            className="w-60 h-60 " />
          </div>

{/* Form Heading */}
    <h1 className="text-4xl font-bold leading-tight tracking-tight text-center mb-6">
      {/* Dark mode gradient version */}
      <span className="hidden dark:block bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
        Log In
      </span>
      {/* Light mode original version */}
      <span className="dark:hidden bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
        Log In
      </span>
    </h1>
    {/* Form */}
    <form className="space-y-6 z-40" onSubmit={handleSubmit}>
          <div>
        <label
          htmlFor="school_id"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          School ID
        </label>
        <input
          type="text"
          name="school_id"
          id="school_id"
          className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Enter School ID"
          required
          onChange={() => {
            setIsError(false);
            setError("");
          }}
        />
      </div>

        <div className="z-40">
    <label
      htmlFor="password"
      className={`block mb-2 text-sm font-medium ${
        isError 
          ? 'text-red-700 dark:text-red-500' 
          : 'text-gray-900 dark:text-white'
      }`}
    >
      Password
    </label>
    <input
      type="password"
      name="password"
      id="password"
      placeholder="••••••••"
      className={`bg-gray-50 border ${
        isError
          ? 'border-red-500 text-red-900 placeholder-red-700 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-red-500 dark:text-red-500 dark:placeholder-red-500'
          : 'border-gray-300 text-gray-900 focus:ring-primary-600 focus:border-primary-600 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
      } rounded-lg block w-full p-2.5`}
      required
      onChange={() => {
        setIsError(false);
        setError("");
      }}
    />
    {isError && (
      <p className="mt-2 text-sm text-red-600 dark:text-red-500">
        <span className="font-medium"></span> {error}
      </p>
    )}
  </div>

      <button
        type="submit"
        className="w-full text-white bg-primary-600 hover:bg-primary-400 transform hover:scale-105 transition-all duration-300 ease-in-out focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-xl px-5 py-3 text-center dark:bg-primary-600 dark:hover:bg-primary-400 dark:focus:ring-primary-800"
      >
        Log In
      </button>
      <p className="text-sm font-light text-gray-500 dark:text-gray-400 text-center">
        Don’t have an account yet?{" "}
        <a
          href="/register"
          className="font-medium text-primary-600 hover:underline dark:text-primary-600"
        >
          Sign up
        </a>
      </p>
    </form>
          </div>
        </div>

          {/* Right Side: Illustration + Tagline */}
          <div className="hidden lg:flex w-[50%]  items-center justify-center relative px-5 right-[10%] z-0 ">
            <div className="flex flex-row items-center pr-64">
              <img
                src={isDark ? loginPicDark : loginPic}
                alt="loginPic"
                className="w-[85%] relative  h-auto mb-[10%] mr-[8%] top-[20%] right-[-4%]"
              />
              <h2 className="text-7xl font-bold text-[#12262f] dark:text-white mr-20 right-[-19%] absolute mb-[20%]">
                <span className="text-[#238354]">Create.</span>
                <br />
                <span className="text-[#2E9B63]">Curate.</span>
                <br />
                <span className="text-[#3FBF7F]">Automate.</span>
              </h2>
            </div>
          </div>
      </div>
    </section>
  );
};

export default FlowbiteForm;