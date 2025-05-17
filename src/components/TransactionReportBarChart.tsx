import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface BarChartDatum {
  label: string;
  paid: number;
  unpaid: number;
  partial: number;
  count: number;
}

interface BarChartProps {
  data: BarChartDatum[];
}

const TransactionReportBarChart: React.FC<BarChartProps> = ({ data }) => {
  const series = [
    {
      name: "Paid",
      data: data.map(d => d.paid),
    },
    {
      name: "Partial",
      data: data.map(d => d.partial),
    },
    {
      name: "Unpaid",
      data: data.map(d => d.unpaid),
    },
  ];

  const options: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      stackType: '100%',
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 6,
        columnWidth: "40%",
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
      categories: data.map(d => d.label),
      labels: { style: { fontFamily: "Inter, sans-serif", fontSize: '13px', colors: "#6b7280" } },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: {
        formatter: val => `${val}%`,
        style: { fontFamily: "Inter, sans-serif", fontSize: '13px', colors: "#6b7280" }
      },
      title: { text: "Percent (%)", style: { fontWeight: 600, fontSize: '14px', color: "#374151" } },
    },
    legend: {
      position: "top",
      horizontalAlign: 'left',
      offsetX: 40,
      fontSize: '15px',
      labels: { colors: "#6b7280", useSeriesColors: false },
    },
    colors: ["#059669", "#f59e42", "#dc2626"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#e5e7eb", strokeDashArray: 4 },
    tooltip: {
      y: {
        formatter: function (val: number, opts: any) {
          const seriesIdx = opts.seriesIndex;
          const dataIdx = opts.dataPointIndex;
          const datum = data[dataIdx];
          let count = 0;
          if (seriesIdx === 0) count = Math.round((datum.paid / 100) * datum.count);
          else if (seriesIdx === 1) count = Math.round((datum.partial / 100) * datum.count);
          else if (seriesIdx === 2) count = Math.round((datum.unpaid / 100) * datum.count);
          return `${val.toFixed(1)}% (${count})`;
        },
      },
    },
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">By Fee Type</h5>
      <div className="py-2">
        <ReactApexChart options={options} series={series} type="bar" height={320} />
      </div>
    </div>
  );
};

export default TransactionReportBarChart; 