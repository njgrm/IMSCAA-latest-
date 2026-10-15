import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/source-sans-3";
import { ThemeContext } from './theme/ThemeContext';
import { Link } from "react-router-dom";
import { Button } from "flowbite-react";
import headerlogo from "./assets/headerlogo.png";
import headerlogoDark from "./assets/headerlogoDark.png";
import analyticsLight from "./assets/hero-analytics-light.png";
import analyticsDark from "./assets/hero-analytics-dark.png";
import paymentsLight from "./assets/hero-payments-light.png";
import paymentsDark from "./assets/hero-payments-dark.png";
import eventsLight from "./assets/hero-events-light.png";
import eventsDark from "./assets/hero-events-dark.png";
import { motion, useReducedMotion } from "motion/react"
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
    const carouselSequenceRef = useRef<HTMLDivElement>(null);
    const carouselOffsetRef = useRef(0);
    const carouselWidthRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const resumeTimerRef = useRef<number | null>(null);
    const dragRef = useRef({ active: false, startX: 0, startOffset: 0, moved: false, samples: [] as Array<{ x: number; time: number }> });
    const inertiaVelocityRef = useRef(0);
    const suppressClickRef = useRef(false);
    const [userPaused, setUserPaused] = useState(false);
    const [hoverPaused, setHoverPaused] = useState(false);
    const [focusPaused, setFocusPaused] = useState(false);
    const [dragPaused, setDragPaused] = useState(false);
    const [resumePaused, setResumePaused] = useState(false);
    const [pageHidden, setPageHidden] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const reduceMotion = useReducedMotion();
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

  const applyCarouselOffset = useCallback(() => {
    if (!carouselRef.current || reduceMotion) return;
    const width = carouselWidthRef.current;
    if (width > 0) carouselOffsetRef.current = ((carouselOffsetRef.current % width) + width) % width;
    carouselRef.current.style.transform = `translate3d(${-carouselOffsetRef.current}px, 0, 0)`;
  }, [reduceMotion]);

  useEffect(() => {
    const sequence = carouselSequenceRef.current;
    if (!sequence) return;
    const measure = () => {
      carouselWidthRef.current = sequence.getBoundingClientRect().width;
      applyCarouselOffset();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(sequence);
    measure();
    return () => observer.disconnect();
  }, [applyCarouselOffset]);

  useEffect(() => {
    const onVisibilityChange = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || userPaused || pageHidden) return;
    let previousTime: number | null = null;
    const animate = (time: number) => {
      if (previousTime !== null && !dragRef.current.active) {
        const elapsedMs = Math.min(time - previousTime, 50);
        const elapsedSeconds = elapsedMs / 1000;
        if (Math.abs(inertiaVelocityRef.current) > 8) {
          carouselOffsetRef.current += inertiaVelocityRef.current * elapsedSeconds;
          inertiaVelocityRef.current *= Math.exp(-4.5 * elapsedSeconds);
        } else {
          inertiaVelocityRef.current = 0;
          if (!hoverPaused && !focusPaused && !dragPaused && !resumePaused) {
            carouselOffsetRef.current += elapsedMs * 0.018;
          }
        }
      }
      previousTime = time;
      applyCarouselOffset();
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };
    animationFrameRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [applyCarouselOffset, dragPaused, focusPaused, hoverPaused, pageHidden, reduceMotion, resumePaused, userPaused]);

  useEffect(() => () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
  }, []);

  const pauseForInteraction = () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    setResumePaused(true);
  };

  const resumeAfterInteraction = () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    setResumePaused(true);
    resumeTimerRef.current = window.setTimeout(() => setResumePaused(false), 2000);
  };

  const nudgeCarousel = (distance: number) => {
    inertiaVelocityRef.current = 0;
    carouselOffsetRef.current += distance;
    applyCarouselOffset();
    pauseForInteraction();
    resumeAfterInteraction();
  };

  const themedScreenshot = (light: string, dark: string, alt: string) => (
    <span className="landing-theme-shot">
      <img draggable={false} className="landing-shot-light h-auto w-full rounded-lg" src={light} alt={`${alt} in light mode`} />
      <img draggable={false} className="landing-shot-dark h-auto w-full rounded-lg" src={dark} alt={`${alt} in dark mode`} />
    </span>
  );

                    return (
                      <div
                        ref={scrollContainerRef}
                        className="landing-page z-100 font-sans bg-white dark:bg-gray-900 min-h-screen relative overflow-x-hidden overflow-y-scroll h-screen scroll-smooth"
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
                        <div className="flex md:order-2 items-center space-x-2 sm:space-x-3">
                          {/* Dark Mode Toggle Button */}
                          <button
                            onClick={toggleDarkMode}
                            className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg z-50"
                            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
                          >
                            {isDark ? "🌙" : "☀️"}
                          </button>

                          {/* Log In Button */}
                          <Button
                            as={Link}
                            to="/login"
                            className="hidden text-white bg-primary-600 hover:bg-primary-400 transform transition-all duration-300 ease-in-out hover:scale-105 focus:ring-4 focus:outline-none focus:ring-primary-300 font-bold rounded-xl text-3xl px-4 py-2 dark:bg-primary-600 dark:hover:bg-primary-400 dark:focus:ring-primary-800 md:inline-flex"
                          >
                            Log In
                          </Button>
                          <button type="button" className="landing-menu-button md:hidden" aria-label="Toggle navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(value => !value)}>☰</button>

                          {/* Register Button (Outline) */}
                          <Button
                            as={Link}
                            to="/register"
                            className="hidden font-bold rounded-xl text-3xl px-4 py-2 border border-primary-600 text-primary-600 bg-transparent transform transition-all duration-300 ease-in-out hover:scale-105 hover:bg-primary-50 focus:ring-4 focus:outline-none focus:ring-primary-300 dark:bg-transparent dark:hover:bg-transparent dark:focus:ring-primary-800 md:inline-flex"
                          >
                            Sign Up
                          </Button>
                        </div>
                        <div
                          className={`${mobileMenuOpen ? "flex" : "hidden"} items-center justify-between w-full md:flex md:w-auto md:order-1`}
                          id="navbar-sticky"
                        >
                          <ul className="flex flex-col p-4 md:p-0 mt-4 font-semibold border border-gray-100 rounded-lg bg-gray-transparent md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-white dark:bg-transparent md:dark:bg-gray-900 dark:border-gray-700">
                            <li>
                            <a href="#home" className="block rounded-sm bg-transparent px-3 py-2 text-[#12262f] md:bg-transparent md:p-0 md:hover:text-primary-600 dark:text-white">
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
                            <li className="md:hidden"><Link to="/login" className="block rounded-sm px-3 py-2 font-semibold text-primary-700 dark:text-primary-400">Log In</Link></li>
                            <li className="md:hidden"><Link to="/register" className="block rounded-sm px-3 py-2 font-semibold text-primary-700 dark:text-primary-400">Sign Up</Link></li>
                          </ul>
                        </div>
                      </div>
                    </nav>



<motion.section
  id="home"
  initial={reduceMotion ? false : { opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="landing-hero relative bg-[#fefefe] dark:bg-gray-900 snap-center min-h-screen scroll-section"
>
  <div className="landing-hero-intro mx-auto max-w-screen-xl px-6 text-center lg:px-12">
    {/* Main Heading */}
    <motion.h1
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      viewport={{ once: true }}
      className="landing-display text-[#12262f] dark:text-white font-extrabold leading-tight mb-3"
    >
      Revolutionize Your Campus Clubs.
    </motion.h1>

    {/* Subheading */}
    <motion.h2
      initial={reduceMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
      viewport={{ once: true }}
      className="landing-subtitle text-gray-700 dark:text-gray-300 font-semibold"
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
  <div className="landing-hero-shots relative z-40 mx-auto w-full max-w-screen-xl">

    {/* Center Image */}
<figure className="landing-shot landing-shot-analytics absolute z-30">
  <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65 }} viewport={{ once: true }}>
  <motion.div className="landing-shot-breathe" animate={reduceMotion ? undefined : { y: [0, -4, 0] }} transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity }}>
    <figcaption className="mb-2 text-xl font-bold leading-tight tracking-tight text-center">
      <span className="hidden dark:block bg-gradient-to-tr from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
        Analytics
      </span>
      <span className="dark:hidden bg-gradient-to-tl from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
        Analytics
      </span>
    </figcaption>
    {themedScreenshot(analyticsLight, analyticsDark, "IMSCCA analytics dashboard")}
  </motion.div>
  </motion.div>
</figure>

    {/* Left Image */}
    <figure className="landing-shot landing-shot-payments absolute z-10">
      <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.15 }} viewport={{ once: true }}>
      <motion.div className="landing-shot-breathe" animate={reduceMotion ? undefined : { y: [0, -4, 0] }} transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, delay: 0.2 }}>
      <figcaption className="mb-2 text-xl font-bold leading-tight tracking-tight text-center">
        <span className="hidden dark:block bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Payments
        </span>
        <span className="dark:hidden bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Payments
        </span>
      </figcaption>
        {themedScreenshot(paymentsLight, paymentsDark, "IMSCCA payments page")}
      </motion.div>
      </motion.div>
    </figure>

    {/* Right Image */}
    <figure className="landing-shot landing-shot-events absolute z-20">
      <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.15 }} viewport={{ once: true }}>
      <motion.div className="landing-shot-breathe" animate={reduceMotion ? undefined : { y: [0, -4, 0] }} transition={{ duration: 3.8, ease: "easeInOut", repeat: Infinity, delay: 0.4 }}>
      <figcaption className="mb-2 text-xl font-bold leading-tight tracking-tight text-center">
        <span className="hidden dark:block bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Events
        </span>
        <span className="dark:hidden bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">
          Events
        </span>
      </figcaption>
        {themedScreenshot(eventsLight, eventsDark, "IMSCCA events page")}
      </motion.div>
      </motion.div>
    </figure>
  </div>

  <div aria-hidden="true" className="landing-wave landing-wave-hero pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden">
    <svg className="h-full w-full" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice">
      <path fill={isDark ? "#12262f" : "#238354"} d="M0 160L60 186.7C120 213 240 267 360 272C480 277 600 235 720 181.3C840 128 960 64 1080 64C1200 64 1320 128 1380 160L1440 192V320H0Z" />
      <path transform="translate(0 34)" fill={isDark ? "#1a3a4a" : "#2e9b63"} d="M0 160L60 186.7C120 213 240 267 360 272C480 277 600 235 720 181.3C840 128 960 64 1080 64C1200 64 1320 128 1380 160L1440 192V320H0Z" />
      <path transform="translate(0 68)" fill={isDark ? "#224c5f" : "#3fbf7f"} d="M0 160L60 186.7C120 213 240 267 360 272C480 277 600 235 720 181.3C840 128 960 64 1080 64C1200 64 1320 128 1380 160L1440 192V320H0Z" />
    </svg>
  </div>

  <div className="landing-hero-cta absolute inset-x-0 z-50 flex justify-center">
    <Link to="/register" className="landing-heading inline-flex items-center justify-center rounded-xl border border-white/30 bg-primary-600 px-8 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.32)] transition-colors hover:bg-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-800">Get Started</Link>
  </div>

</motion.section>

<motion.section
  id="about"
  initial={reduceMotion ? false : { opacity: 0, scale: 0.99 }}
  whileInView={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  viewport={{ once: true, amount: 0.2 }}
  className="landing-about relative bg-[#fefefe] dark:bg-gray-900 z-20 snap-center"
>
  <div className="landing-about-grid mx-auto grid max-w-screen-xl items-center px-6 lg:px-12">
    <div className="landing-about-title text-left">
      <h1 className="landing-heading landing-about-name font-extrabold text-[#12262f] dark:text-white">
        <motion.span initial={reduceMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.08 }} viewport={{ once: true }} className="text-[#3FBF7F]">Integrated</motion.span>
        <motion.span initial={reduceMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.14 }} viewport={{ once: true }} className="text-[#2E9B63]">Management</motion.span>
        <motion.span initial={reduceMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.2 }} viewport={{ once: true }} className="text-[#238354]">System for</motion.span>
        <motion.span initial={reduceMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.26 }} viewport={{ once: true }} className="text-[#f45d05]">Campus</motion.span>
        <motion.span initial={reduceMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.32 }} viewport={{ once: true }} className="text-[#f45d05]">Club</motion.span>
        <motion.span initial={reduceMotion ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.38 }} viewport={{ once: true }} className="text-[#f45d05]">Affairs</motion.span>
      </h1>
      <h2 className="landing-heading landing-about-tagline font-semibold text-gray-700 dark:text-gray-300">
        One Platform. Endless Possibilities.
      </h2>
    </div>
    <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.99 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.2 }} viewport={{ once: true }} className="landing-about-copy text-left">
      <img src={isDark ? aboutPic4Dark : aboutPic4} alt="About IMSCCA" className="landing-about-art" />
      <h3 className="landing-heading landing-about-heading font-bold text-gray-700 dark:text-gray-300">
        About{" "}
        <span className="bg-gradient-to-r from-[#2E9B63] to-[#3FBF7F] bg-clip-text text-transparent">
          IMS
        </span>
        <span className="bg-gradient-to-r from-[#FB8C00] to-[#f45d05] bg-clip-text text-transparent">
          CCA
        </span>
      </h3>
      <p className="landing-about-body text-gray-700 dark:text-gray-300">
        The <strong>Integrated Management System for Campus Club Affairs (IMSCCA)</strong> is a
        modern platform that simplifies campus club operations. It combines <strong>attendance tracking,
	        membership, financial management, event coordination, and operational reporting</strong>
        into a single, efficient system. With <strong>QR-based tracking, real-time updates,
        and automated notifications</strong>, IMSCCA enhances efficiency, reduces paperwork,
        and improves student engagement across campuses.
      </p>
    </motion.div>
  </div>
</motion.section>

<motion.section
  id="features"
  initial={reduceMotion ? false : { opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="landing-features relative bg-[#fefefe] dark:bg-gray-900 py-20 px-6 text-center text-[#12262f] dark:text-white"
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

  <div className="landing-carousel-shell relative z-50 py-6" onMouseEnter={() => setHoverPaused(true)} onMouseLeave={() => setHoverPaused(false)} onFocusCapture={() => setFocusPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusPaused(false); }}>
    {!reduceMotion && (
      <button
        type="button"
        className="landing-carousel-toggle"
        aria-label={userPaused ? "Play feature carousel" : "Pause feature carousel"}
        title={userPaused ? "Play carousel" : "Pause carousel"}
        onClick={() => setUserPaused((value) => !value)}
      >
        <span aria-hidden="true" className={userPaused ? "landing-play-icon" : "landing-pause-icon"} />
      </button>
    )}
    <div
      className="landing-carousel-viewport"
      role="region"
      aria-label="IMSCCA features"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); nudgeCarousel(-320); }
        if (event.key === "ArrowRight") { event.preventDefault(); nudgeCarousel(320); }
        if (event.key === " ") { event.preventDefault(); setUserPaused(value => !value); }
      }}
      onPointerDown={(event) => {
        if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
        setResumePaused(false);
        setDragPaused(true);
        inertiaVelocityRef.current = 0;
        suppressClickRef.current = false;
        dragRef.current = {
          active: true,
          startX: event.clientX,
          startOffset: carouselOffsetRef.current,
          moved: false,
          samples: [{ x: event.clientX, time: performance.now() }],
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragRef.current.active) return;
        carouselOffsetRef.current = dragRef.current.startOffset + dragRef.current.startX - event.clientX;
        const now = performance.now();
        dragRef.current.moved ||= Math.abs(event.clientX - dragRef.current.startX) > 6;
        dragRef.current.samples.push({ x: event.clientX, time: now });
        dragRef.current.samples = dragRef.current.samples.filter((sample) => now - sample.time <= 120).slice(-8);
        applyCarouselOffset();
      }}
      onPointerUp={(event) => {
        const samples = dragRef.current.samples;
        const first = samples[0];
        const last = samples[samples.length - 1];
        if (dragRef.current.moved && first && last && last.time > first.time) {
          const velocity = (first.x - last.x) / ((last.time - first.time) / 1000);
          inertiaVelocityRef.current = Math.max(-1400, Math.min(1400, velocity));
          suppressClickRef.current = true;
        }
        dragRef.current.active = false;
        setDragPaused(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragRef.current.active = false;
        inertiaVelocityRef.current = 0;
        setDragPaused(false);
        resumeAfterInteraction();
      }}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
    >
      <div ref={carouselRef} className="landing-carousel-track">
        {[false, true].map((duplicate) => (
          <div key={duplicate ? "duplicate" : "primary"} ref={duplicate ? undefined : carouselSequenceRef} className="landing-carousel-sequence" aria-hidden={duplicate || undefined}>
            {cards.map((card) => (
              <motion.article key={card.title} initial={false} whileHover={reduceMotion ? undefined : { scale: 1.025 }} transition={{ duration: 0.2 }} className="landing-carousel-card min-w-[350px] bg-white border border-gray-200 rounded-lg shadow-[0px_4px_12px_rgba(0,0,0,0.25)] dark:bg-gray-800 dark:border-gray-700">
                <div className="p-14 pb-16">
                  <h3 className="landing-heading mb-0 mt-[-3%] z-50 text-5xl font-bold leading-[150%] text-gray-900 dark:text-white">
                    <span className="hidden dark:block bg-gradient-to-l from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">{card.title}</span>
                    <span className="dark:hidden bg-gradient-to-r from-[#238354] via-[#2FAE68] to-[#3FBF7F] bg-clip-text text-transparent">{card.title}</span>
                  </h3>
                </div>
                <motion.img draggable={false} inherit={false} initial={false} className="rounded-none" src={card.imgSrc} alt={duplicate ? "" : card.title} />
                <div className="p-5"><p className="mb-3 font-normal text-gray-700 dark:text-gray-400">{card.text}</p></div>
              </motion.article>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
</motion.section>


{/* SVG Wave Layers Container */}
<div aria-hidden="true" className="landing-wave landing-wave-footer absolute top-[280%] left-0 w-full h-screen overflow-hidden z-0 pointer-events-none">
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
    className="absolute top-[-12%] left-0 w-full h-[60vh] bg-no-repeat bg-cover opacity-100 transition-all duration-200 ease-in-out z-20"
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
