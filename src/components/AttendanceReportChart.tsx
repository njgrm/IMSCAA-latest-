import React, { useContext } from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { ThemeContext } from "../theme/ThemeContext";
import { chartTheme } from "../theme/chartTheme";

interface ChartProps {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

const AttendanceReportChart: React.FC<ChartProps> = ({ present, late, absent, excused }) => {
  const { isDark } = useContext(ThemeContext);
  const palette = chartTheme(isDark);
  const series = [present || 0, late || 0, absent || 0, excused || 0];
  const total = series.reduce((a, b) => a + b, 0);
  
  const options: ApexOptions = {
    chart: {
      type: "pie" as const,
      fontFamily: "Inter, sans-serif",
      foreColor: palette.text,
    },
    labels: ["Present", "Late", "Absent", "Excused"],
    colors: ["#3FBF7F", "#f59e42", "#f05252", "#3b82f6"],
    legend: {
      position: "bottom",
      fontSize: '16px',
      labels: { colors: palette.text, useSeriesColors: false },
    },
    dataLabels: {
      enabled: true,
      style: { fontFamily: "Inter, sans-serif", fontSize: '12px' },
    },
    theme: { mode: palette.mode },
    tooltip: { theme: palette.tooltip },
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        Attendance Status Breakdown
      </h5>
      <div className="py-4">
        {total > 0 ? <ReactApexChart options={options} series={series} type="pie" height={320} /> : <div className="flex h-80 items-center justify-center text-sm text-gray-500 dark:text-gray-400">No attendance data available.</div>}
      </div>
    </div>
  );
};

export default AttendanceReportChart; 
