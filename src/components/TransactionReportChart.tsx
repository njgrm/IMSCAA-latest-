import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

interface ChartProps {
  paid: number;
  unpaid: number;
  partial: number;
}

const TransactionReportChart: React.FC<ChartProps> = ({ paid, unpaid, partial }) => {
  const series = [paid, unpaid, partial];
  const options: ApexOptions = {
    chart: {
        type: "pie" as const,
        fontFamily: "Inter, sans-serif",
      },
    labels: ["Paid", "Unpaid", "Partial"],
    colors: ["#059669", "#dc2626", "#f59e42"],
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
    <div className="max-w-md w-full bg-white rounded-lg shadow-sm dark:bg-gray-800 p-4 md:p-6">
      <h5 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Payment Status Breakdown</h5>
      <div className="py-6">
        <ReactApexChart options={options} series={series} type="pie" height={320} />
      </div>
    </div>
  );
};

export default TransactionReportChart;