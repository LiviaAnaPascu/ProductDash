import Papa from 'papaparse';
import { Product, ProductVariant } from '@/types/product';

// Helper function to generate URL handle from product name
function generateUrlHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper function to clean text fields (remove line breaks)
function cleanText(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/(\r\n|\n|\r)/gm, ' ').trim();
}

// Convert products to CSV format matching Shopify's variant-based format
function productsToCSVRows(products: Product[]): any[] {
  const rows: any[] = [];
  
  for (const product of products) {
    const details = product.details || {};
    const handle = details.urlHandle || generateUrlHandle(product.name);
    
    // Base product data (shared across all variants)
    const baseProductData = {
      'Handle': handle,
      'Title': product.name || '',
      'Body (HTML)': cleanText(details.detailedDescription || product.description),
      'Vendor': product.brand || '',
      'Type': product.type || '',
      'Tags': details.tags?.join(', ') || '',
      'Published': 'TRUE',
    };
    
    // If product has variants, create one row per variant
    if (details.variants && details.variants.length > 0) {
      for (const variant of details.variants) {
        const row: any = {
          ...baseProductData,
          'Option1 Name': variant.option1Name || '',
          'Option1 Value': variant.option1Value || '',
          'Option2 Name': variant.option2Name || '',
          'Option2 Value': variant.option2Value || '',
          'Option3 Name': variant.option3Name || '',
          'Option3 Value': variant.option3Value || '',
          'Variant SKU': variant.sku || details.sku || '',
          'Variant Grams': variant.weightValue ? Math.round(variant.weightValue) : (details.weightValue ? Math.round(details.weightValue) : ''),
          'Variant Inventory Tracker': 'shopify',
          'Variant Inventory Qty': variant.inventoryQuantity?.toString() || details.inventoryQuantity?.toString() || '',
          'Variant Inventory Policy': details.continueSellingWhenOutOfStock ? 'continue' : 'deny',
          'Variant Fulfillment Service': details.fulfillmentService || 'manual',
          'Variant Price': variant.price ? variant.price.replace(/[^\d.,]/g, '').replace(',', '.') : (product.price ? product.price.replace(/[^\d.,]/g, '').replace(',', '.') : ''),
          'Variant Compare-at Price': variant.compareAtPrice ? variant.compareAtPrice.replace(/[^\d.,]/g, '').replace(',', '.') : (details.compareAtPrice ? details.compareAtPrice.replace(/[^\d.,]/g, '').replace(',', '.') : ''),
          'Variant Requires Shipping': details.requiresShipping !== false ? 'TRUE' : 'FALSE',
          'Variant Taxable': details.chargeTax !== false ? 'TRUE' : 'FALSE',
          'Variant Barcode': variant.barcode || details.barcode || '',
          'Image Src': variant.imageUrl || product.imageUrl || '',
          'Image Alt Text': cleanText(product.name),
        };
        
        rows.push(row);
      }
    } else {
      // No variants - create a single row for the product
      const row: any = {
        ...baseProductData,
        'Option1 Name': '',
        'Option1 Value': '',
        'Option2 Name': '',
        'Option2 Value': '',
        'Option3 Name': '',
        'Option3 Value': '',
        'Variant SKU': details.sku || '',
        'Variant Grams': details.weightValue ? Math.round(details.weightValue) : '',
        'Variant Inventory Tracker': 'shopify',
        'Variant Inventory Qty': details.inventoryQuantity?.toString() || '',
        'Variant Inventory Policy': details.continueSellingWhenOutOfStock ? 'continue' : 'deny',
        'Variant Fulfillment Service': details.fulfillmentService || 'manual',
        'Variant Price': product.price ? product.price.replace(/[^\d.,]/g, '').replace(',', '.') : '',
        'Variant Compare-at Price': details.compareAtPrice ? details.compareAtPrice.replace(/[^\d.,]/g, '').replace(',', '.') : '',
        'Variant Requires Shipping': details.requiresShipping !== false ? 'TRUE' : 'FALSE',
        'Variant Taxable': details.chargeTax !== false ? 'TRUE' : 'FALSE',
        'Variant Barcode': details.barcode || '',
        'Image Src': product.imageUrl || '',
        'Image Alt Text': cleanText(product.name),
      };
      
      rows.push(row);
      
      // Add additional images as separate rows (Shopify format: empty Title for additional images)
      if (details.additionalImages && details.additionalImages.length > 0) {
        for (let i = 0; i < details.additionalImages.length; i++) {
          const imageRow: any = {
            ...row,
            'Title': '', // Empty for additional images
            'Image Src': details.additionalImages[i],
          };
          rows.push(imageRow);
        }
      }
    }
  }
  
  return rows;
}

export const exportToCSV = (products: Product[], filename: string = 'products.csv') => {
  // Convert products to CSV rows matching Shopify's variant-based format
  const csvRows = productsToCSVRows(products);
  
  // Define column order matching Shopify's variant-based format
  const columns = [
    'Handle',
    'Title',
    'Body (HTML)',
    'Vendor',
    'Type',
    'Tags',
    'Published',
    'Option1 Name',
    'Option1 Value',
    'Option2 Name',
    'Option2 Value',
    'Option3 Name',
    'Option3 Value',
    'Variant SKU',
    'Variant Grams',
    'Variant Inventory Tracker',
    'Variant Inventory Qty',
    'Variant Inventory Policy',
    'Variant Fulfillment Service',
    'Variant Price',
    'Variant Compare-at Price',
    'Variant Requires Shipping',
    'Variant Taxable',
    'Variant Barcode',
    'Image Src',
    'Image Alt Text',
  ];
  
  const csv = Papa.unparse(csvRows, {
    columns,
    header: true,
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ',',
    newline: '\n',
  });

  // Add UTF-8 BOM for better compatibility with platforms like Shopify
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csv;

  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
