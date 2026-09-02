import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface BarChartDatum {
  label: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  attendanceRate: number;
}

interface BarChartProps {
  data: BarChartDatum[];
}

const AttendanceReportBarChart: React.FC<BarChartProps> = ({ data }) => {
  // Calculate percentages for each data point
  const processedData = data.map(d => ({
    ...d,
    presentPercent: d.total > 0 ? (d.present / d.total) * 100 : 0,
    latePercent: d.total > 0 ? (d.late / d.total) * 100 : 0,
    absentPercent: d.total > 0 ? (d.absent / d.total) * 100 : 0,
    excusedPercent: d.total > 0 ? (d.excused / d.total) * 100 : 0,
  }));

  const series = [
    {
      name: "Present",
      data: processedData.map(d => ({ x: d.label, y: d.presentPercent, count: d.present })),
    },
    {
      name: "Late", 
      data: processedData.map(d => ({ x: d.label, y: d.latePercent, count: d.late })),
    },
    {
      name: "Absent",
      data: processedData.map(d => ({ x: d.label, y: d.absentPercent, count: d.absent })),
    },
    {
      name: "Excused",
      data: processedData.map(d => ({ x: d.label, y: d.excusedPercent, count: d.excused })),
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: "60%",
      },
    },
    stroke: {
      width: 1,
      colors: ['#fff']
    },
    fill: {
      opacity: 1
    },
    xaxis: {
      type: 'category',
      labels: { 
        style: { fontFamily: "Inter, sans-serif", fontSize: '12px', colors: "#6b7280" },
        rotate: -45,
        maxHeight: 120,
      },
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
      title: { text: "Percentage (%)", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    legend: {
      position: "top",
      horizontalAlign: 'left',
      offsetX: 40,
      fontSize: '14px',
      labels: { colors: "#6b7280", useSeriesColors: false },
    },
    colors: ["#059669", "#f59e42", "#f05252", "#3b82f6"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function (val: number, opts: any) {
          const count = opts.w.config.series[opts.seriesIndex].data[opts.dataPointIndex].count;
          return `${val.toFixed(1)}% (${count} students)`;
        },
      },
    },
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Attendance Distribution by Event</h5>
      <div className="py-2">
        {data.length > 0 ? (
          <ReactApexChart options={options} series={series} type="bar" height={320} />
        ) : (
          <div className="flex items-center justify-center h-80 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No event data available</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No events found for the current filters.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReportBarChart; 