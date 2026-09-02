import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface ChartProps {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

const AttendanceReportChart: React.FC<ChartProps> = ({ present, late, absent, excused }) => {
  const series = [present || 0, late || 0, absent || 0, excused || 0];
  const total = series.reduce((a, b) => a + b, 0);
  
  // Debug logging
  console.log('AttendanceReportChart - Props received:', { present, late, absent, excused });
  console.log('AttendanceReportChart - Series:', series);
  console.log('AttendanceReportChart - Total:', total);
  
  // For testing, let's use sample data if total is 0
  const testSeries = total === 0 ? [10, 5, 3, 2] : series;
  const isUsingTestData = total === 0;
  
  const options: ApexOptions = {
    chart: {
      type: "pie" as const,
      fontFamily: "Inter, sans-serif",
    },
    labels: ["Present", "Late", "Absent", "Excused"],
    colors: ["#3FBF7F", "#f59e42", "#f05252", "#3b82f6"],
    legend: {
      position: "bottom",
      fontSize: '16px',
      labels: { colors: "#6b7280", useSeriesColors: false },
    },
    dataLabels: {
      enabled: true,
      style: { fontFamily: "Inter, sans-serif", fontSize: '12px' },
    },
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        Attendance Status Breakdown
        {isUsingTestData && <span className="text-xs text-red-500 ml-2">(Test Data)</span>}
      </h5>
      <div className="py-4">
        <ReactApexChart options={options} series={testSeries} type="pie" height={320} />
      </div>
    </div>
  );
};

export default AttendanceReportChart; 