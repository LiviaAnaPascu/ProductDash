'use client';

import { exportToCSV } from '@/utils/csvExport';
import { Product } from '@/types/product';

interface ExportButtonProps {
  selectedProducts: Product[];
  disabled?: boolean;
}

export default function ExportButton({ selectedProducts, disabled }: ExportButtonProps) {
  const handleExport = () => {
    if (selectedProducts.length === 0) {
      alert('Please select at least one product to export');
      return;
    }
    exportToCSV(selectedProducts, `products-export-${Date.now()}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || selectedProducts.length === 0}
      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      suppressHydrationWarning
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Export CSV ({selectedProducts.length})
    </button>
  );
}

