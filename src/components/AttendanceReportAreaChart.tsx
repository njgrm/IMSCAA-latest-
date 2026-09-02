import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface LineChartDatum {
  label: string; // Should be the date string (yyyy-MM-dd)
  present: number;
  late: number;
  absent: number;
  excused: number;
}

interface LineChartProps {
  data: LineChartDatum[];
}

const AttendanceReportAreaChart: React.FC<LineChartProps> = ({ data }) => {
  // Sort data by date and prepare series
  const sortedData = [...data].sort((a, b) => new Date(a.label).getTime() - new Date(b.label).getTime());
  
  const series = [
    {
      name: "Present",
      data: sortedData.map(d => [new Date(d.label).getTime(), d.present]),
    },
    {
      name: "Late",
      data: sortedData.map(d => [new Date(d.label).getTime(), d.late]),
    },
    {
      name: "Absent",
      data: sortedData.map(d => [new Date(d.label).getTime(), d.absent]),
    },
    {
      name: "Excused",
      data: sortedData.map(d => [new Date(d.label).getTime(), d.excused]),
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: "area",
      stacked: false,
      fontFamily: "Inter, sans-serif",
      zoom: {
        type: 'x',
        enabled: true,
        autoScaleYaxis: true,
      },
      toolbar: {
        autoSelected: 'zoom',
        show: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 4,
      hover: { size: 6 },
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.4,
        opacityTo: 0.1,
      },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { fontFamily: "Inter, sans-serif", fontSize: '12px', colors: "#6b7280" },
        datetimeUTC: false,
        format: 'MMM dd',
      },
      title: { text: "Date", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    yaxis: {
      labels: {
        style: { fontFamily: "Inter, sans-serif", fontSize: '12px', colors: "#6b7280" },
        formatter: function(val: number) {
          return val.toFixed(0);
        }
      },
      title: { text: "Number of Students", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    legend: {
      position: "top",
      fontSize: '14px',
      labels: { colors: "#6b7280", useSeriesColors: false },
    },
    colors: ["#059669", "#f59e42", "#f05252", "#3b82f6"],
    grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: 'MMM dd, yyyy',
      },
      y: {
        formatter: function(val: number) {
          return `${val} students`;
        },
      },
    },
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Attendance Trends Over Time</h5>
      <div className="py-2">
        {data.length > 0 ? (
          <ReactApexChart options={options} series={series} type="area" height={380} />
        ) : (
          <div className="flex items-center justify-center h-80 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No trend data available</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No attendance records found for trend analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReportAreaChart; 