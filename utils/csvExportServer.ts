import Papa from 'papaparse';
import { Product } from '@/types/product';

function generateUrlHandle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanText(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/(\r\n|\n|\r)/gm, ' ').trim();
}

function formatPrice(price: string | undefined | null): string {
  if (!price) return '';
  const cleaned = price.replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num < 0) return '';
  return num.toFixed(2);
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes('data:image')) return false;
  if (url.includes('base64,')) return false;
  if (url.startsWith('data:')) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  return true;
}

function extractCleanDescription(product: Product): string {
  const details = product.details || {};
  const raw = details.detailedDescription || product.description || '';

  const cleaned = raw
    .replace(/Descrizione\s*/gi, '')
    .replace(/Caratteristiche\s*/gi, '')
    .replace(/Spedizione e resi\s*/gi, '')
    .replace(/Cura del Gioiello\s*/gi, '')
    .replace(/Spediamo il tuo ordine.*$/gis, '')
    .replace(/Su Morellato.*$/gis, '')
    .replace(/Troverai le informazioni.*$/gis, '')
    .replace(/(\r\n|\n|\r)/gm, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned) return '';

  return `<p>${cleaned}</p>`;
}

function buildEmptyRow(handle: string): Record<string, string> {
  return {
    'Title': '',
    'URL handle': handle,
    'Description': '',
    'Vendor': '',
    'Product category': '',
    'Type': '',
    'Tags': '',
    'Published on online store': '',
    'Status': '',
    'SKU': '',
    'Barcode': '',
    'Option1 name': '',
    'Option1 value': '',
    'Option1 Linked To': '',
    'Option2 name': '',
    'Option2 value': '',
    'Option2 Linked To': '',
    'Option3 name': '',
    'Option3 value': '',
    'Option3 Linked To': '',
    'Price': '',
    'Compare-at price': '',
    'Cost per item': '',
    'Charge tax': '',
    'Tax code': '',
    'Unit price total measure': '',
    'Unit price total measure unit': '',
    'Unit price base measure': '',
    'Unit price base measure unit': '',
    'Inventory tracker': '',
    'Inventory quantity': '',
    'Continue selling when out of stock': '',
    'Weight value (grams)': '',
    'Weight unit for display': '',
    'Requires shipping': '',
    'Fulfillment service': '',
    'Product image URL': '',
    'Image position': '',
    'Image alt text': '',
    'Variant image URL': '',
    'Gift card': '',
    'SEO title': '',
    'SEO description': '',
    'Google Shopping / Google product category': '',
    'Google Shopping / Gender': '',
    'Google Shopping / Age group': '',
    'Google Shopping / Manufacturer part number (MPN)': '',
    'Google Shopping / Condition': '',
  };
}

function productsToCSVRows(products: Product[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  for (const product of products) {
    const details = product.details || {};
    const handle = details.urlHandle || generateUrlHandle(product.name);

    if (!product.name || !product.name.trim()) {
      console.warn(`[CSV Export] Skipping product with missing name: ${product.id}`);
      continue;
    }

    const mainImageUrl = isValidImageUrl(product.imageUrl) ? product.imageUrl : '';
    const tags = details.tags?.join(', ') || '';
    const description = extractCleanDescription(product);
    let imagePosition = 1;

    if (details.variants && details.variants.length > 0) {
      let isFirstRow = true;
      for (const variant of details.variants) {
        const variantImage = variant.imageUrl && isValidImageUrl(variant.imageUrl)
          ? variant.imageUrl : '';

        const row: Record<string, string> = {
          'Title': isFirstRow ? product.name.trim() : '',
          'URL handle': handle,
          'Description': isFirstRow ? description : '',
          'Vendor': isFirstRow ? ((product.brand && product.brand.trim()) || 'Unknown') : '',
          'Product category': isFirstRow ? (details.productCategory || '') : '',
          'Type': isFirstRow ? (product.type || 'General') : '',
          'Tags': isFirstRow ? tags : '',
          'Published on online store': isFirstRow ? 'TRUE' : '',
          'Status': isFirstRow ? 'Active' : '',
          'SKU': variant.sku || details.sku || '',
          'Barcode': variant.barcode || details.barcode || '',
          'Option1 name': variant.option1Name || '',
          'Option1 value': variant.option1Value || '',
          'Option1 Linked To': '',
          'Option2 name': variant.option2Name || '',
          'Option2 value': variant.option2Value || '',
          'Option2 Linked To': '',
          'Option3 name': variant.option3Name || '',
          'Option3 value': variant.option3Value || '',
          'Option3 Linked To': '',
          'Price': formatPrice(variant.price || product.price) || '0.01',
          'Compare-at price': formatPrice(variant.compareAtPrice || details.compareAtPrice),
          'Cost per item': formatPrice(variant.costPerItem || details.costPerItem),
          'Charge tax': details.chargeTax !== false ? 'TRUE' : 'FALSE',
          'Tax code': details.taxCode || '',
          'Unit price total measure': details.unitPriceTotalMeasure || '',
          'Unit price total measure unit': details.unitPriceTotalMeasureUnit || '',
          'Unit price base measure': details.unitPriceBaseMeasure || '',
          'Unit price base measure unit': details.unitPriceBaseMeasureUnit || '',
          'Inventory tracker': 'shopify',
          'Inventory quantity': variant.inventoryQuantity?.toString() || details.inventoryQuantity?.toString() || '0',
          'Continue selling when out of stock': 'CONTINUE',
          'Weight value (grams)': variant.weightValue ? Math.round(variant.weightValue).toString() : (details.weightValue ? Math.round(details.weightValue).toString() : '0'),
          'Weight unit for display': variant.weightUnit || details.weightUnit || 'g',
          'Requires shipping': details.requiresShipping !== false ? 'TRUE' : 'FALSE',
          'Fulfillment service': details.fulfillmentService || 'manual',
          'Product image URL': isFirstRow ? mainImageUrl : '',
          'Image position': isFirstRow && mainImageUrl ? String(imagePosition++) : '',
          'Image alt text': isFirstRow ? cleanText(product.name) : '',
          'Variant image URL': variantImage,
          'Gift card': 'FALSE',
          'SEO title': isFirstRow ? (details.seoTitle || '') : '',
          'SEO description': isFirstRow ? (details.seoDescription || '') : '',
          'Google Shopping / Google product category': isFirstRow ? (details.googleProductCategory || '') : '',
          'Google Shopping / Gender': isFirstRow ? (details.googleGender || '') : '',
          'Google Shopping / Age group': isFirstRow ? (details.googleAgeGroup || '') : '',
          'Google Shopping / Manufacturer part number (MPN)': isFirstRow ? (details.googleMPN || '') : '',
          'Google Shopping / Condition': isFirstRow ? (details.googleCondition || 'New') : '',
        };

        rows.push(row);
        isFirstRow = false;
      }
    } else {
      const row: Record<string, string> = {
        'Title': product.name.trim(),
        'URL handle': handle,
        'Description': description,
        'Vendor': (product.brand && product.brand.trim()) || 'Unknown',
        'Product category': details.productCategory || '',
        'Type': product.type || 'General',
        'Tags': tags,
        'Published on online store': 'TRUE',
        'Status': 'Active',
        'SKU': details.sku || '',
        'Barcode': details.barcode || '',
        'Option1 name': '',
        'Option1 value': '',
        'Option1 Linked To': '',
        'Option2 name': '',
        'Option2 value': '',
        'Option2 Linked To': '',
        'Option3 name': '',
        'Option3 value': '',
        'Option3 Linked To': '',
        'Price': formatPrice(product.price) || '0.01',
        'Compare-at price': formatPrice(details.compareAtPrice),
        'Cost per item': formatPrice(details.costPerItem),
        'Charge tax': details.chargeTax !== false ? 'TRUE' : 'FALSE',
        'Tax code': details.taxCode || '',
        'Unit price total measure': details.unitPriceTotalMeasure || '',
        'Unit price total measure unit': details.unitPriceTotalMeasureUnit || '',
        'Unit price base measure': details.unitPriceBaseMeasure || '',
        'Unit price base measure unit': details.unitPriceBaseMeasureUnit || '',
        'Inventory tracker': 'shopify',
        'Inventory quantity': details.inventoryQuantity?.toString() || '0',
        'Continue selling when out of stock': 'CONTINUE',
        'Weight value (grams)': details.weightValue ? Math.round(details.weightValue).toString() : '0',
        'Weight unit for display': details.weightUnit || 'g',
        'Requires shipping': details.requiresShipping !== false ? 'TRUE' : 'FALSE',
        'Fulfillment service': details.fulfillmentService || 'manual',
        'Product image URL': mainImageUrl,
        'Image position': mainImageUrl ? String(imagePosition++) : '',
        'Image alt text': cleanText(product.name),
        'Variant image URL': '',
        'Gift card': 'FALSE',
        'SEO title': details.seoTitle || '',
        'SEO description': details.seoDescription || '',
        'Google Shopping / Google product category': details.googleProductCategory || '',
        'Google Shopping / Gender': details.googleGender || '',
        'Google Shopping / Age group': details.googleAgeGroup || '',
        'Google Shopping / Manufacturer part number (MPN)': details.googleMPN || '',
        'Google Shopping / Condition': details.googleCondition || 'New',
      };

      rows.push(row);

      if (details.additionalImages && details.additionalImages.length > 0) {
        const validImages = details.additionalImages.filter(isValidImageUrl);
        for (const imageUrl of validImages) {
          const imageRow = buildEmptyRow(handle);
          imageRow['Product image URL'] = imageUrl;
          imageRow['Image position'] = String(imagePosition++);
          imageRow['Image alt text'] = cleanText(product.name);
          rows.push(imageRow);
        }
      }
    }
  }

  return rows;
}

const COLUMNS = [
  'Title',
  'URL handle',
  'Description',
  'Vendor',
  'Product category',
  'Type',
  'Tags',
  'Published on online store',
  'Status',
  'SKU',
  'Barcode',
  'Option1 name',
  'Option1 value',
  'Option1 Linked To',
  'Option2 name',
  'Option2 value',
  'Option2 Linked To',
  'Option3 name',
  'Option3 value',
  'Option3 Linked To',
  'Price',
  'Compare-at price',
  'Cost per item',
  'Charge tax',
  'Tax code',
  'Unit price total measure',
  'Unit price total measure unit',
  'Unit price base measure',
  'Unit price base measure unit',
  'Inventory tracker',
  'Inventory quantity',
  'Continue selling when out of stock',
  'Weight value (grams)',
  'Weight unit for display',
  'Requires shipping',
  'Fulfillment service',
  'Product image URL',
  'Image position',
  'Image alt text',
  'Variant image URL',
  'Gift card',
  'SEO title',
  'SEO description',
  'Google Shopping / Google product category',
  'Google Shopping / Gender',
  'Google Shopping / Age group',
  'Google Shopping / Manufacturer part number (MPN)',
  'Google Shopping / Condition',
];

export function generateCSV(products: Product[]): string {
  const csvRows = productsToCSVRows(products);

  const csv = Papa.unparse(csvRows, {
    columns: COLUMNS,
    header: true,
    quoteChar: '"',
    escapeChar: '"',
    delimiter: ',',
    newline: '\n',
  });

  const BOM = '\uFEFF';
  return BOM + csv;
}
