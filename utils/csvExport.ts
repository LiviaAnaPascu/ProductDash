import Papa from 'papaparse';
import { Product } from '@/types/product';

export const exportToCSV = (products: Product[], filename: string = 'products.csv') => {
  const csv = Papa.unparse(products, {
    columns: ['name', 'brand', 'type', 'price', 'description', 'url', 'imageUrl'],
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

