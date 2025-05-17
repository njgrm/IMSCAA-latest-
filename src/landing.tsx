import React, { useState, useEffect, useRef, useContext } from "react";
import { ThemeContext } from './theme/ThemeContext';
import { Link } from "react-router-dom";
import { Button } from "flowbite-react";
import headerlogo from "./assets/headerlogo.png";
import headerlogoDark from "./assets/headerlogoDark.png";
import aboutPic from "./assets/aboutPic.png";
import aboutPic2 from "./assets/aboutPic2.png";
import aboutPic3 from "./assets/aboutPic3.png";
import { motion, useAnimation, useMotionValue  } from "motion/react"
import aboutPic4 from "./assets/aboutPic4.svg";
import aboutPic4Dark from "./assets/aboutPic4Dark.svg";
import manage from "./assets/manage.svg";
import integrate from "./assets/integrate.svg";
import streamline from "./assets/streamline.svg";


  const Landing: React.FC = () => {
  const { isDark, theme, setTheme } = useContext(ThemeContext);
  const toggleDarkMode = () => setTheme(theme === 'dark' ? 'light' : 'dark');
    const [isScrolled, setIsScrolled] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(0);
    const x = useMotionValue(0);
    const controls = useAnimation();
    const speedFactor = 55; 
    

    interface Card {
      title: string;
      imgSrc: string;
      text: string;
    }


    useEffect(() => {
      const handleScroll = () => {
        if (scrollContainerRef.current) {
          if (scrollContainerRef.current.scrollTop > 0) {
            setIsScrolled(true);
          } else {
            setIsScrolled(false);
          }
        }
      };
  
      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener("scroll", handleScroll);
      }
      return () => {
        if (container) {
          container.removeEventListener("scroll", handleScroll);
        }
      };
    }, []);

    useEffect(() => {
      if (carouselRef.current) {
        // Calculate the total draggable width
        setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
      }
    }, []);
    
    const startAutoScroll = async () => {
      const currentX = x.get();
      // If near the end, reset to 0 (for an infinite loop effect)
      if (currentX <= -width + 1) {
        controls.set({ x: 0 });
        await controls.start({
          x: -width,
          transition: { ease: "linear", duration: width / speedFactor, repeat: Infinity },
        });
      } else {
        // Calculate remaining distance and duration based on current x
        const remainingDistance = -width - currentX;
        const newDuration = Math.abs(remainingDistance) / speedFactor;
        await controls.start({
          x: -width,
          transition: { ease: "linear", duration: newDuration, repeat: Infinity },
        });
      }
    };
  
    // Start auto scroll once width is set
    useEffect(() => {
      if (width) {
        startAutoScroll();
      }
    }, [width]);

    const cards: Card[] = [
    {
      title: "Integrate",
      imgSrc: integrate, // Ensure integrate is imported or defined
      text: "Seamlessly connect all your club tools in one unified platform.",
    },
    {
      title: "Manage",
      imgSrc: manage, // Ensure manage is imported or defined
      text: "Oversee memberships, events, and finances with powerful admin tools.",
    },
    {
      title: "Streamline",
      imgSrc: streamline, // Ensure streamline is imported or defined
      text: "Automate processes and reduce manual work with smart solutions.",
    },
    {
      title: "Curate",
      imgSrc: integrate, // Ensure integrate is imported or defined
      text: "Seamlessly connect all your club tools in one unified platform.",
    },
    {
      title: "Create",
      imgSrc: manage, // Ensure manage is imported or defined
      text: "Oversee memberships, events, and finances with powerful admin tools.",
    },
    {
      title: "Automate",
      imgSrc: streamline, // Ensure streamline is imported or defined
      text: "Automate processes and reduce manual work with smart solutions.",
    },
    
  ];
  
  const carouselItems: Card[] = [...cards, ...cards, ...cards,...cards,...cards];
    
    

                    return (
                      <div
                        ref={scrollContainerRef}
                        className="z-100 font-sans bg-white dark:bg-gray-900 min-h-screen relative overflow-y-scroll h-screen scroll-smooth"
                      >
                        {/* Sticky Navbar */}
                        <nav
                          className={`fixed w-full z-[100] top-0 left-0 transition-all duration-300 ease-in-out ${
                            isScrolled
                              ? "bg-white dark:bg-gray-900 shadow-[0px_1px_18px_rgba(0,0,0,0.1)]"
                              : "bg-[#fefefe] dark:bg-gray-900 shadow-none"
                          }`}
                        >
                      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
                        <Link to="/" className="flex items-center space-x-3">
                        
                          <img   src={isDark ? headerlogoDark : headerlogo} alt="headerlogo" className="h-14" />
                          <span className="self-center text-2xl font-bold whitespace-nowrap text-[#12262f] dark:text-primary-400">
                            <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
                              IMS
                            </span>
                            <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
                              CCA
                            </span>
                          </span>
                        </Link>
                        <div className="flex md:order-2 space-x-3">
                          {/* Dark Mode Toggle Button */}
                          <button
                            onClick={toggleDarkMode}
                            className="fixed top-4 right-4 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg z-50"
                          >
                            {isDark ? "🌙" : "☀️"}
                          </button>

                          {/* Log In Button */}
                          <Button
                            as={Link}
                            to="/login"
                            className="text-white bg-primary-600 hover:bg-primary-400 transform transition-all duration-300 ease-in-out hover:scale-105 focus:ring-4 focus:outline-none focus:ring-primary-300 font-bold rounded-xl text-3xl px-4 py-2 dark:bg-primary-600 dark:hover:bg-primary-400 dark:focus:ring-primary-800"
                          >
                            Log In
                          </Button>

                          {/* Register Button (Outline) */}
                          <Button
                            as={Link}
                            to="/register"
                            className="font-bold rounded-xl text-3xl px-4 py-2 border border-primary-600 text-primary-600 bg-transparent transform transition-all duration-300 ease-in-out hover:scale-105 hover:bg-primary-50 focus:ring-4 focus:outline-none focus:ring-primary-300 dark:bg-transparent dark:hover:bg-transparent dark:focus:ring-primary-800"
                          >
                            Sign Up
                          </Button>
                        </div>
                        <div
                          className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1"
                          id="navbar-sticky"
                        >
                          <ul className="flex flex-col p-4 md:p-0 mt-4 font-semibold border border-gray-100 rounded-lg bg-gray-transparent md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-transparent md:dark:bg-gray-900 dark:border-gray-700">
                            <li>
                            <a href="#home" className="block py-2 px-3 text-[#12262f] e bg-transparent rounded-sm md:bg-transparent md:hover:text-primary-600  md:p-0 dark:text-white">
                                Home
                                </a>
                            </li>
                            <li>
                            <a href="#about" className="block py-2 px-3 text-[#12262f]  bg-transparent rounded-sm md:bg-transparent md:hover:text-primary-600  md:p-0 dark:text-white">
                                About
                                </a>
                            </li>
                            <li>
                            <a
                                href="#features"
                                className="block py-2 px-3 text-[#12262f] rounded-sm hover:bg-gray-100 bg-transparent md:hover:bg-transparent md:hover:text-primary-600 md:p-0 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:text-primary-500 dark:border-gray-700"
                              >
                                Features
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </nav>
                
                

                    <motion.section
  id="home"
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="relative scroll-mt-[15%] bg-[#fefefe] dark:bg-gray-900 mt-[var(--navbar-height)] snap-center min-h-screen scroll-section"
>
  <div className="py-12 px-6 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12">
    {/* Main Heading */}
    <motion.h1
      initial={{ opacity: 0, y: -50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      viewport={{ once: false }}
      className="text-[#12262f] dark:text-white text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-4"
    >
      Revolutionize Your Campus Clubs.
    </motion.h1>

    {/* Subheading */}
    <motion.h2
      initial={{ opacity: 0, y: -30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
      viewport={{ once: false }}
      className="text-gray-700 dark:text-gray-300 text-2xl sm:text-3xl md:text-4xl font-semibold mb-6"
    >
      One Platform. Endless Possibilities.{" "}
      <span className="self-center font-bold whitespace-nowrap text-[#12262f] dark:text-primary-400">
        <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
          IMS
        </span>
        <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
          CCA
        </span>.
      </span>
    </motion.h2>
  </div>

  {/* Overlapping Images */}
  <div className="relative w-full max-w-screen-xl mx-auto -mb-32 z-40 mt-[-3%] pt-[5%]">
    
    {/* Center Image */}
<motion.figure
  initial={{ opacity: 0, scale: 0.9 }}
  whileInView={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.8 }}
  viewport={{ once: false }}
  className="absolute left-[32%] transform -translate-x-1/2 top-4 w-80 sm:w-96 md:w-[30rem] lg:w-[34rem] xl:w-[30rem] z-30"
>
  {/* Bobbing Text (Figcaption) */}
  <motion.div
    initial={{ y: 0 }}
    whileInView={{ y: [0, -10, 0] }}
    transition={{ duration: 2.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.3  }}
    viewport={{ once: false }}
  >
    <figcaption className="mb-2 text-xl font-bold leading-tight tracking-tight text-center">
      <span className="hidden dark:block bg-gradient-to-tr from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
        Analytics
      </span>
      <span className="dark:hidden bg-gradient-to-tl from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
        Analytics
      </span>
    </figcaption>
  </motion.div>

  {/* Bobbing Image */}
  <motion.div
    initial={{ y: 0 }}
    whileInView={{ y: [0, -10, 0] }}
    transition={{ duration: 2.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.3 }}
    viewport={{ once: false }}
  >
    <img
      className="h-auto w-full rounded-lg shadow-[0px_10px_18px_rgba(0,0,0,0.25)]"
      src={aboutPic}
      alt="Image 1"
    />
  </motion.div>
</motion.figure>

    {/* Left Image */}
    <motion.figure
      initial={{ opacity: 0, x: -100 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      viewport={{ once: false }}
      className="absolute left-5 sm:left-14 md:left-20 top-24 w-64 sm:w-72 md:w-80 lg:w-96 xl:w-[30rem] z-10"
    >
        <motion.div
    initial={{ y: 0 }}
    whileInView={{ y: [0, -10, 0] }}
    transition={{ duration: 3.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
    viewport={{ once: false }}
  >
      <figcaption className="mb-2 text-xl font-bold leading-tight tracking-tight text-center">
        <span className="hidden dark:block bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Payments
        </span>
        <span className="dark:hidden bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Payments
        </span>
      </figcaption>
      </motion.div>
      <motion.div
        initial={{ y: 0 }}
        whileInView={{ y: [0, -15, 0] }}
        transition={{ duration: 3.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
        viewport={{ once: false }}
      >
        <img
          className="h-auto w-full rounded-lg shadow-[0px_8px_18px_rgba(0,0,0,0.25)]"
          src={aboutPic2}
          alt="Image 2"
        />
      </motion.div>
    </motion.figure>

    {/* Right Image */}
    <motion.figure
      initial={{ opacity: 0, x: 100 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      viewport={{ once: false }}
      className="absolute right-5 sm:right-14 md:right-20 top-28 w-64 sm:w-72 md:w-80 lg:w-96 xl:w-[30rem] z-20"
    >
             <motion.div
    initial={{ y: 0 }}
    whileInView={{ y: [0, -10, 0] }}
    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.7 }}
    viewport={{ once: false }}
  >
      <figcaption className="mb-2 text-xl font-bold leading-tight tracking-tight text-center">
        <span className="hidden dark:block bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Events
        </span>
        <span className="dark:hidden bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Events
        </span>
      </figcaption>
      </motion.div>
      <motion.div
        initial={{ y: 0 }}
        whileInView={{ y: [0, -12, 0] }}
        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.7 }}
        viewport={{ once: false }}
      >
        <img
          className="h-auto w-full rounded-lg shadow-[0px_8px_18px_rgba(0,0,0,0.25)]"
          src={aboutPic3}
          alt="Image 3"
        />
      </motion.div>
    </motion.figure>
  </div>

  {/* Say Goodbye Section */}
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay: 0.3 }}
    viewport={{ once: false }}
    className="py-12 px-6 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12"
  >
    <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl md:text-2xl mb-8 pt-[33%]">
      Say goodbye to cluttered spreadsheets and endless paperwork. <br />
      Take your campus organization to the next level.
    </p>

    <div className="relative z-50 flex justify-center">
      <motion.div
        initial={{ scale: 0.9 }}
        whileHover={{ scale: 1.0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col sm:flex-row justify-center gap-4"
      >
        <Link
          to="/register"
          className="z-10 inline-flex justify-center items-center py-4 px-12 text-2xl font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-400 transition-transform focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-800"
        >
          Get Started
        </Link>
      </motion.div>
    </div>
  </motion.div>
</motion.section>

{/* SVG Wave Layers Container */}
<div className="absolute top-[57%] left-0 w-full h-screen overflow-hidden z-20">
  {/* Hero Layer */}
  <div
    className="absolute top-[-43%] left-0 w-full h-[90vh] bg-no-repeat bg-cover transition-all duration-200 ease-in-out z-10"
    style={{
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -10 1040 320"><path fill="${
        isDark ? "%2312262f" : "%23238354"
      }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
    }}
  ></div>

  {/* Mid Layer */}
  <div
    className="absolute top-[-12%] left-0s w-full h-[60vh] bg-no-repeat bg-cover opacity-100 transition-all duration-200 ease-in-out z-20"
    style={{
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 1040 320"><path fill="${
        isDark ? "%231a3a4a" : "%232E9B63"
      }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
    }}
  ></div>

  {/* Solid Color Block Behind Mid Layer */}
  <div
    className="absolute top-[46%] left-0 w-full h-[20vh] transition-all duration-200 ease-in-out z-20"
    style={{
      backgroundColor: isDark ? "#1a3a4a" : "#2E9B63", // Matches Mid Layer color
    }}
  ></div>

  {/* Top Layer */}
  <div
    className="absolute top-[-3%] left-0 w-full h-[70vh] bg-no-repeat bg-cover opacity-100 z-20"
    style={{
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -10 1040 320"><path fill="${
        isDark ? "%23224c5f" : "%233FBF7F"
      }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
    }}
  ></div>

  {/* Bottom Layer (Continuation of Top Layer) */}

</div>
             
<motion.section
  id="about"
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  viewport={{ once: false, amount: 0.2 }}
  className="relative mt-[15%] left-[-2%] pt-[-10%] bg-[#fefefe] dark:bg-gray-900 py-20 px-6 z-20 snap-center min-h-screen"
>
  <div className="py-12 mt-[-9%] px-6 mx-auto max-w-screen-xl flex flex-col lg:flex-row items-center lg:items-start lg:justify-between lg:py-16 lg:px-12">
    {/* Left Side - Title */}
    <div className="text-left lg:w-1/2">
      <h1 className="leading-tight text-[#12262f] dark:text-white text-4xl sm:text-5xl md:text-8xl font-extrabold mb-4 md:mb-4">
        <motion.span
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: false }}
          className="text-[#3FBF7F] block mb-[-13%]"
        >
          Integrated
        </motion.span>
        <br />
        <motion.span
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: false }}
          className="text-[#2E9B63] block mb-[-13%]"
        >
          Management
        </motion.span>
        <br />
        <motion.span
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: false }}
          className="text-[#238354] block mb-[-13%]"
        >
          System for
        </motion.span>
        <br />
        <motion.span
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: false }}
          className="text-[#f45d05] block mb-[-13%]"
        >
          Campus
        </motion.span>
        <br />
        <motion.span
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: false }}
          className="text-[#f45d05] block mb-[-13%]"
        >
          Club
        </motion.span>
        <br />
        <motion.span
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: false }}
          className="text-[#f45d05] block mb"
        >
          Affairs
        </motion.span>
      </h1>

      {/* Subheading */}
      <h2 className="text-gray-700 dark:text-gray-300 text-2xl sm:text-3xl md:text-4xl font-semibold mb-6">
        One Platform. Endless Possibilities.
      </h2>
    </div>

    {/* Right Side - About Section */}
{/* Right Side - About Section */}
<motion.div
  initial={{ opacity: 0, x: 50 }}
  whileInView={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.6, delay: 0.3 }}
  viewport={{ once: false }}
  className="absolute right-[4%] top-1/3 w-[40%] text-left z-10"
>
<div className="flex justify-center relative mb-4 right-[33%]  min-w-[120%] ">
    <img 
      src={isDark ?  aboutPic4Dark : aboutPic4} 
      alt="About IMSCCA"
    className="absolute z-10 left-0 top-0 translate-y-[-70%] h-auto opacity-100"
    />
  </div>

    <div className="z-20 relative flex flex-col items-left translate-y-[50%] translate-x-[-20%] mt-[5%] text-left w-full max-w-[80%] mx-auto">
      {/* Heading */}
      <h3 className="relative z-20 text-gray-700 dark:text-gray-300 text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
        About    {" "}
        <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
          IMS
        </span>
        <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
          CCA
        </span>
      </h3>
      
      {/* Paragraph */}
      <p className="relative z-20 text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
        The <strong>Integrated Management System for Campus Club Affairs (IMSCCA)</strong> is a 
        modern platform that simplifies campus club operations. It combines <strong>attendance tracking, 
        clearance processing, financial management, event coordination, and facility reservations</strong> 
        into a single, efficient system. With <strong>QR-based tracking, real-time updates, 
        and automated notifications</strong>, IMSCCA enhances efficiency, reduces paperwork, 
        and improves student engagement across campuses.
      </p>
 
</div>
</motion.div>

  </div>
</motion.section>

<motion.section
  id="features"
  initial={{ opacity: 0, y: 50 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="relative top-[-5%] bg-[#fefefe] dark:bg-gray-900 py-20 px-6 text-center text-[#12262f] dark:text-white"
>
  {/* Centered Heading & Description */}
  <div className="mx-auto max-w-screen-xl">
    <motion.h2
      initial={{ opacity: 0, y: -30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6"
    >
      Why Use{" "}
      <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
        IMS
      </span>
      <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
        CCA
      </span>
      ?
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
      className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto mb-12"
    >
      A single platform to manage all your club activities efficiently.
      From event planning to analytics, we've got it all covered!
    </motion.p>
  </div>

  {/* Full-Width Carousel Container – isolated from parent's animations */}
  <div className="w-screen -mx-6 overflow-x-hidden overflow-y-visible relative z-50 py-6">
    <motion.div
      ref={carouselRef}
      inherit={false} // Prevents inheriting parent's animation states
      initial={false} // Renders immediately in its final state
      style={{ x }}
      drag="x"
      dragConstraints={{ right: 0, left: -width }}
      animate={controls}
      onDragStart={() => controls.stop()}
      onDragEnd={() => startAutoScroll()}
      className="flex space-x-10 cursor-grab"
      whileTap={{ cursor: "grabbing" }}
    >
      {carouselItems.map((card, index) => (
        <motion.div
          key={index}
          inherit={false}
          initial={false}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
          className="min-w-[350px] bg-white border border-gray-200 rounded-lg shadow-[0px_4px_12px_rgba(0,0,0,0.25)] dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="p-14 pb-16">
            <h3 className="mb-0 mt-[-3%] z-50 text-5xl font-bold leading-[150%] tracking-tight text-gray-900 dark:text-white">
              <span className="hidden dark:block bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
                {card.title}
              </span>
              <span className="dark:hidden bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
                {card.title}
              </span>
            </h3>
          </div>
          <motion.img
            inherit={false}
            initial={false}
            className="rounded-none"
            src={card.imgSrc}
            alt={card.title}
          />
          <div className="p-5">
            <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
              {card.text}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  </div>
</motion.section>


{/* SVG Wave Layers Container */}
<div className="absolute top-[280%] left-0 w-full h-screen overflow-hidden z-0">
  {/* Hero Layer */}
  <div
    className="absolute top-[-43%] left-0 w-full h-[90vh] bg-no-repeat bg-cover transition-all duration-200 ease-in-out z-10"
    style={{
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -10 1040 320"><path fill="${
        isDark ? "%2312262f" : "%23238354"
      }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
    }}
  ></div>

  {/* Mid Layer */}
  <div
    className="absolute top-[-12%] left-0s w-full h-[60vh] bg-no-repeat bg-cover opacity-100 transition-all duration-200 ease-in-out z-20"
    style={{
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -20 1040 320"><path fill="${
        isDark ? "%231a3a4a" : "%232E9B63"
      }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
    }}
  ></div>

  {/* Solid Color Block Behind Mid Layer */}
  <div
    className="absolute top-[47%] left-0 w-full h-[20vh] transition-all duration-200 ease-in-out z-20"
    style={{
      backgroundColor: isDark ? "#1a3a4a" : "#2E9B63", // Matches Mid Layer color
    }}
  ></div>

  {/* Top Layer */}
  <div
    className="absolute top-[-3%] left-0 w-full h-[70vh] bg-no-repeat bg-cover opacity-100 z-20"
    style={{
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 -10 1040 320"><path fill="${
        isDark ? "%23224c5f" : "%233FBF7F"
      }" fill-opacity="1" d="M0,160L60,186.7C120,213,240,267,360,272C480,277,600,235,720,181.3C840,128,960,64,1080,64C1200,64,1320,128,1380,160L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>')`,
    }}
  ></div>

  {/* Bottom Layer (Continuation of Top Layer) */}

</div>

     {/* Footer */}
     <footer className="bg-white dark:bg-gray-900 pt-[8%] z-50">
        <div className="mx-auto w-full max-w-screen-xl p-4 py-6 lg:py-8 z-30">
          <div className="md:flex md:justify-between">
            <div className="mb-6 md:mb-0">
              <a href="https://flowbite.com/" className="flex items-center">
                <img
                src={isDark ? headerlogoDark : headerlogo}  
                  className="h-12 mr-3 me-3"
                  alt="FlowBite Logo"
                />
                <span className="self-center text-2xl font-bold whitespace-nowrap dark:text-white">
                          <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
                            IMS
                          </span>
                          <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
                            CCA
                          </span>
                        </span>
              </a>
            </div>
            <div className="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-3">
              <div>
                <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase dark:text-white">
                  Resources
                </h2>
                <ul className="text-gray-500 dark:text-gray-400 font-medium">
                  <li className="mb-4">
                    <a href="https://flowbite.com/" className="hover:underline">
                      Flowbite
                    </a>
                  </li>
                  <li>
                    <a href="https://tailwindcss.com/" className="hover:underline">
                      Tailwind CSS
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase dark:text-white">
                  Follow us
                </h2>
                <ul className="text-gray-500 dark:text-gray-400 font-medium">
                  <li className="mb-4">
                    <a
                      href="https://github.com/themesberg/flowbite"
                      className="hover:underline "
                    >
                      Github
                    </a>
                  </li>
                  <li>
                    <a href="https://discord.gg/4eeurUVvTy" className="hover:underline">
                      Discord
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="mb-6 text-sm font-semibold text-gray-900 uppercase dark:text-white">
                  Legal
                </h2>
                <ul className="text-gray-500 dark:text-gray-400 font-medium">
                  <li className="mb-4">
                    <a href="#" className="hover:underline">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:underline">
                      Terms & Conditions
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <hr className="my-6 border-gray-200 sm:mx-auto dark:border-gray-700 lg:my-8" />
          <div className="sm:flex sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500 sm:text-center dark:text-gray-400">
              © 2025{" "}
              <a href="https://flowbite.com/" className="hover:underline">
                IMSCCA™
              </a>
              . All Rights Reserved.
            </span>
            <div className="flex mt-4 sm:justify-center sm:mt-0">
              <a
                href="#"
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 8 19"
                >
                  <path
                    fillRule="evenodd"
                    d="M6.135 3H8V0H6.135a4.147 4.147 0 0 0-4.142 4.142V6H0v3h2v9.938h3V9h2.021l.592-3H5V3.591A.6.6 0 0 1 5.592 3h.543Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="sr-only">Facebook page</span>
              </a>
              <a
                href="#"
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white ms-5"
              >
                <svg
                  className="w-4 h-4"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 21 16"
                >
                  <path d="M16.942 1.556a16.3 16.3 0 0 0-4.126-1.3 12.04 12.04 0 0 0-.529 1.1 15.175 15.175 0 0 0-4.573 0 11.585 11.585 0 0 0-.535-1.1 16.274 16.274 0 0 0-4.129 1.3A17.392 17.392 0 0 0 .182 13.218a15.785 15.785 0 0 0 4.963 2.521c.41-.564.773-1.16 1.084-1.785a10.63 10.63 0 0 1-1.706-.83c.143-.106.283-.217.418-.33a11.664 11.664 0 0 0 10.118 0c.137.113.277.224.418.33-.544.328-1.116.606-1.71.832a12.52 12.52 0 0 0 1.084 1.785 16.46 16.46 0 0 0 5.064-2.595 17.286 17.286 0 0 0-2.973-11.59ZM6.678 10.813a1.941 1.941 0 0 1-1.8-2.045 1.93 1.93 0 0 1 1.8-2.047 1.919 1.919 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045Zm6.644 0a1.94 1.94 0 0 1-1.8-2.045 1.93 1.0 0 0 1 1.8-2.047 1.918 1.918 0 0 1 1.8 2.047 1.93 1.93 0 0 1-1.8 2.045Z"/>
                </svg>
                <span className="sr-only">Discord community</span>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;