import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface AttendanceRateData {
  label: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  attendanceRate: number;
}

interface AttendanceRateChartProps {
  data: AttendanceRateData[];
}

const AttendanceRateChart: React.FC<AttendanceRateChartProps> = ({ data }) => {
  const sortedData = [...data].sort((a, b) => b.attendanceRate - a.attendanceRate);
  
  const series = [
    {
      name: "Attendance Rate",
      data: sortedData.map(d => ({ x: d.label, y: d.attendanceRate, total: d.total })),
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: "line",
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    markers: {
      size: 6,
      hover: { size: 8 },
    },
    xaxis: {
      type: 'category',
      labels: { 
        style: { fontFamily: "Inter, sans-serif", fontSize: '12px', colors: "#6b7280" },
        rotate: -45,
        maxHeight: 120,
      },
      title: { text: "Events", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        formatter: function(val: number) {
          return val.toFixed(0) + '%';
        },
        style: { fontFamily: "Inter, sans-serif", fontSize: '12px', colors: "#6b7280" }
      },
      title: { text: "Attendance Rate (%)", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    colors: ["#2563eb"],
    grid: { 
      borderColor: "#e5e7eb", 
      strokeDashArray: 4,
      yaxis: {
        lines: {
          show: true
        }
      }
    },
    tooltip: {
      x: {
        show: true,
      },
      y: {
        formatter: function(val: number, opts: any) {
          const total = opts.w.config.series[0].data[opts.dataPointIndex].total;
          return `${val.toFixed(1)}% (${total} total students)`;
        },
      },
    },
    annotations: {
      yaxis: [
        {
          y: 75,
          borderColor: '#fbbf24',
          borderWidth: 2,
          strokeDashArray: 5,
          label: {
            text: 'Target: 75%',
            style: {
              color: '#fff',
              background: '#fbbf24',
              fontSize: '12px',
            },
          },
        },
      ],
    },
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Attendance Rate by Event</h5>
      <div className="py-2">
        {data.length > 0 ? (
          <ReactApexChart options={options} series={series} type="line" height={390} />
        ) : (
          <div className="flex items-center justify-center h-80 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No rate data available</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No events found for attendance rate analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRateChart; 