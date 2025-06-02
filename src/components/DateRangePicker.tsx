// src/components/DateRangePicker.tsx
import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

interface Props {
  value: { start: string; end: string };
  onChange: (range: { start: string; end: string }) => void;
}

export default function DateRangePicker({ value, onChange }: Props) {
  const startDate = value.start ? new Date(value.start) : null;
  const endDate = value.end ? new Date(value.end) : null;

  // Custom input for styling
  const CustomInput = React.forwardRef<HTMLInputElement, any>(
    ({ value, onClick, placeholder }, ref) => (
      <div className="relative w-48 flex-shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <svg className="w-5 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M5 5a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1h1a1 1 0 0 0 1-1 1 1 0 1 1 2 0 1 1 0 0 0 1 1 2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a2 2 0 0 1 2-2ZM3 19v-7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Zm6.01-6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-10 4a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm2 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" clipRule="evenodd"/>
          </svg>
        </span>
        <input
          type="text"
          className="pl-9 pr-8 py-3 w-full border dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm shadow-sm focus:ring-2 focus:ring-primary-400 focus:border-primary-400 text-left cursor-pointer"
          onClick={onClick}
          ref={ref}
          value={value || ""}
          placeholder={placeholder}
          readOnly
        />
      </div>
    )
  );

  return (
    <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 'fit-content' }}>
      <div className="relative">
        <DatePicker
          selected={startDate}
          onChange={date => onChange({ start: date ? format(date, "yyyy-MM-dd") : "", end: value.end })}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          customInput={<CustomInput />}
          placeholderText="Choose Start Date"
          dateFormat="MMM d, yyyy"
          wrapperClassName="datepicker-wrapper"
          popperClassName="datepicker-popper"
          popperPlacement="bottom-start"
          maxDate={endDate || undefined}
          isClearable
          shouldCloseOnSelect={true}
        />
      </div>
      <span className="mx-1 text-gray-400 flex-shrink-0">to</span>
      <div className="relative">
        <DatePicker
          selected={endDate}
          onChange={date => onChange({ start: value.start, end: date ? format(date, "yyyy-MM-dd") : "" })}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate || undefined}
          customInput={<CustomInput />}
          placeholderText="Choose End Date"
          dateFormat="MMM d, yyyy"
          wrapperClassName="datepicker-wrapper"
          popperClassName="datepicker-popper"
          popperPlacement="bottom-start"
          isClearable
          shouldCloseOnSelect={true}
        />
      </div>
    </div>
  );
}