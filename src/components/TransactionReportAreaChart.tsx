import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface LineChartDatum {
  label: string; // Should be the original date_added string from the DB
  paid: number;
  partial: number;
  unpaid?: number;
}

interface LineChartProps {
  data: LineChartDatum[];
}

const TransactionReportAreaChart: React.FC<LineChartProps> = ({ data }) => {
  // Prepare series with x as datetime (original string), y as amount
  const paidSeries = data.map(d => ({ x: d.label, y: d.paid }));
  const partialSeries = data.map(d => ({ x: d.label, y: d.partial }));

  const series = [
    {
      name: "Paid",
      data: paidSeries,
    },
    {
      name: "Partial",
      data: partialSeries,
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: "line",
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
      hover: { size: 7 },
    },
    fill: {
      type: "solid",
      colors: ["#059669", "#f59e42"],
      opacity: 1,
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { fontFamily: "Inter, sans-serif", fontSize: '13px', colors: "#6b7280" },
        datetimeUTC: false,
      },
      title: { text: "Date & Time", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    yaxis: {
      labels: {
        style: { fontFamily: "Inter, sans-serif", fontSize: '13px', colors: "#6b7280" },
      },
      title: { text: "Amount (₱)", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    legend: {
      position: "top",
      fontSize: '15px',
      labels: { colors: "#6b7280", useSeriesColors: false },
    },
    colors: ["#059669", "#f59e42"],
    grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    tooltip: {
      shared: true,
      intersect: false,
      x: {
        format: 'yyyy-MM-dd',
      },
      y: {
        formatter: val => `₱${val.toLocaleString()}`,
      },
    },
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Payments Over Time</h5>
      <div className="py-2">
        <ReactApexChart options={options} series={series} type="line" height={380} />
      </div>
    </div>
  );
};

export default TransactionReportAreaChart; 