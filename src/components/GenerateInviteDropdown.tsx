import React, { useState } from "react";
import { toast } from "react-toastify";

interface GenerateInviteDropdownProps {
  userRole: "President" | "Officer";
}

const DEFAULT_EXPIRY_HOURS = 24;

const GenerateInviteDropdown: React.FC<GenerateInviteDropdownProps> = ({ userRole }) => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"member" | "officer">("member");
  const [allowed, setAllowed] = useState(1);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState("");
  const [expiry, setExpiry] = useState(DEFAULT_EXPIRY_HOURS); // in hours
  const [expiryUnit, setExpiryUnit] = useState<'hours' | 'minutes' | 'seconds'>('hours');

  const canGenerateOfficer = userRole === "President";

  // Convert expiry to hours for backend
  const getExpiryForBackend = () => {
    if (expiryUnit === 'hours') return expiry;
    if (expiryUnit === 'minutes') return expiry / 60;
    if (expiryUnit === 'seconds') return expiry / 3600;
    return expiry;
  };

  // Human readable expiry
  const getExpiryText = () => {
    if (expiryUnit === 'hours') return `${expiry} hour${expiry !== 1 ? 's' : ''}`;
    if (expiryUnit === 'minutes') return `${expiry} minute${expiry !== 1 ? 's' : ''}`;
    if (expiryUnit === 'seconds') return `${expiry} second${expiry !== 1 ? 's' : ''}`;
    return `${expiry} hours`;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setLink("");
    try {
      const res = await fetch("http://localhost/my-app-server/generate_invite.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, allowed, expiry: getExpiryForBackend() }),
        credentials: "include"
      });
      const data = await res.json();
      console.log("Invite link response:", data); // For debugging
      if (data.link) {
        setLink(data.link);
        toast.success("Invite link generated!");
      } else {
        toast.error(data.error || "Failed to generate link.");
      }
    } catch (err) {
      toast.error("Error generating link.");
      console.error(err);
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("Copied to clipboard!");
    }
  };

  return (
    <div className="relative inline-block text-left dark:text-white">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center py-3 px-4 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:focus:ring-primary-400 transition-all duration-200"
        type="button"
      >
        Generate Link
        <svg className={`w-4 h-4 ml-1 transform transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>
      {/* Dropdown content */}
      <div
        className={`absolute right-0 z-50 mt-2 w-80 bg-white rounded-lg shadow dark:bg-gray-700 px-4 py-4 pt-1 border border-gray-200 dark:border-gray-600 transform-gpu transition-[opacity,transform] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top overflow-hidden
          ${open ? 'opacity-100 translate-y-0 pointer-events-auto visible' : 'opacity-0 -translate-y-4 pointer-events-none invisible'}`}
      >
        <div className="flex items-center justify-between pt-2">
          <h6 className="text-sm font-medium text-black dark:text-white">Invite Link</h6>
          <button
            onClick={() => {
              setRole("member");
              setAllowed(1);
              setLink("");
              setExpiry(DEFAULT_EXPIRY_HOURS);
              setExpiryUnit('hours');
            }}
            className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Clear
          </button>
        </div>
        {/* Role radio */}
        <div className="mb-3 pt-3 mt-3 border-spacing-2 border-t dark:border-gray-600">
          <p className="text-xs font-medium mb-1">Role</p>
          <div className="flex gap-4">
            <label className="flex items-center text-sm mb-1">
              <input
                type="radio"
                name="invite-role"
                value="member"
                checked={role === "member"}
                onChange={() => setRole("member")}
                className="mr-2 focus:ring-3 focus:ring-primary-400 dark:focus:ring-primary-400 dark:ring-offset-gray-800 rounded text-primary-600 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              />
              Member
            </label>
            {canGenerateOfficer && (
              <label className="flex items-center text-sm mb-1">
                <input
                  type="radio"
                  name="invite-role"
                  value="officer"
                  checked={role === "officer"}
                  onChange={() => setRole("officer")}
                  className="mr-2 focus:ring-3 focus:ring-primary-400 dark:focus:ring-primary-400 dark:ring-offset-gray-800 rounded text-primary-600 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                />
                Officer
              </label>
            )}
          </div>
        </div>
        {/* Allowed signups */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1">Allowed Sign-ups</label>
          <input
            type="number"
            min={1}
            value={allowed}
            onChange={e => setAllowed(Number(e.target.value))}
            className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
          />
        </div>
        {/* Expiry time */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1">Link Expiry</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={expiry}
              onChange={e => setExpiry(Number(e.target.value))}
              className="w-20 p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
            />
            <select
              value={expiryUnit}
              onChange={e => setExpiryUnit(e.target.value as any)}
              className="p-2 border rounded-lg text-sm bg-gray-50 focus:ring-primary-400 focus:border-primary-400 dark:bg-gray-600 dark:border-gray-500 dark:text-white border-gray-300"
            >
              <option value="hours">Hours</option>
              <option value="minutes">Minutes</option>
              <option value="seconds">Seconds</option>
            </select>
          </div>
        </div>
        <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Link expires in <b>{getExpiryText()}</b> or after <b>{allowed}</b> sign-up{allowed > 1 ? "s" : ""}.
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 mb-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-400"
          type="button"
        >
          {loading ? "Generating..." : "Generate"}
        </button>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={link}
            readOnly
            className="flex-1 px-2 py-1 border rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm focus:ring-primary-400 focus:border-primary-400 dark:focus:ring-primary-400 dark:focus:border-primary-400"
            placeholder="Invite link will appear here"
          />
          <button
            onClick={handleCopy}
            disabled={!link}
            className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            title="Copy link"
            type="button"
          >
            {/* Link SVG */}
            <svg className="w-6 h-6 transition-colors duration-300 text-gray-700 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.213 9.787a3.391 3.391 0 0 0-4.795 0l-3.425 3.426a3.39 3.39 0 0 0 4.795 4.794l.321-.304m-.321-4.49a3.39 3.39 0 0 0 4.795 0l3.424-3.426a3.39 3.39 0 0 0-4.794-4.795l-1.028.961"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateInviteDropdown; 