# Two-Layer Scraping Implementation

This document explains the two-layer scraping system that scrapes product list pages first, then visits each product's detail page to extract comprehensive metadata for CSV export.

## Overview

The scraping process now works in two layers:

1. **First Layer**: Scrapes product list/catalog pages to extract basic product information (name, image, price, URL, type)
2. **Second Layer**: Visits each product's detail page (using the URL from the first layer) to extract detailed metadata needed for CSV export

## Architecture

### Extended Product Type

The `Product` interface now includes a `details` field containing metadata fields from the CSV template:

```typescript
interface Product {
  // Basic fields (from first layer)
  id: string;
  name: string;
  brand: string;
  type: string;
  gender: "male" | "female";
  price?: string;
  imageUrl: string;
  description?: string;
  url: string;
  
  // Detailed metadata (from second layer)
  details?: {
    sku?: string;
    barcode?: string;
    urlHandle?: string;
    detailedDescription?: string;
    compareAtPrice?: string;
    costPerItem?: string;
    weightValue?: number;
    weightUnit?: string;
    variants?: ProductVariant[];
    additionalImages?: string[];
    tags?: string[];
    seoTitle?: string;
    seoDescription?: string;
    // ... and more
  };
}
```

### Scraper Configuration

The `ScraperConfig` interface now includes:

```typescript
interface ScraperConfig {
  // First layer extraction (existing)
  extractProduct?: ($: cheerio.CheerioAPI, element: any) => Partial<Product> | null | undefined;
  
  // Second layer extraction (new)
  extractProductDetails?: (
    $: cheerio.CheerioAPI,
    productUrl: string,
    baseProduct: Product
  ) => Partial<Product['details']> | null | undefined;
}
```

### Scraping Flow

1. **First Layer** (existing):
   - Fetches product list pages
   - Extracts basic product information using `extractProduct`
   - Filters products using `shouldIncludeProduct` if provided
   - Stores products with basic data

2. **Second Layer** (new):
   - After all list pages are scraped, visits each product's detail page
   - Extracts detailed metadata using `extractProductDetails`
   - Merges detailed data into the product's `details` field
   - Processes products in batches (5 concurrent requests by default)
   - Includes delays between batches to be respectful to the server

## Morellato Implementation

### First Layer (`extractProduct`)

Extracts basic product information from catalog pages:
- Product name from `h4.name a`
- Main image URL (excluding back-image)
- Price from `.price` or `p.price`
- Product URL from `h4.name a`
- Product type based on name keywords

### Second Layer (`extractProductDetails`)

Extracts detailed metadata from product detail pages:

#### Extracted Fields:

1. **SKU/Barcode**: From data attributes, meta tags, or `.sku` elements
2. **Detailed Description**: From `.product-description` or description sections
3. **Compare-at Price**: Original price if product is on sale
4. **Weight**: Extracted from weight elements, converted to grams
5. **URL Handle**: Generated from product URL slug
6. **Additional Images**: All product gallery images (excluding main image)
7. **Tags**: From meta keywords or tag elements
8. **SEO Fields**: Title and description from meta tags
9. **Google Shopping**: Gender, category, condition, etc.
10. **Variants**: Size/color options if available
11. **Product Category**: From breadcrumbs or category links

#### Selectors Used:

- SKU: `[data-product-id]`, `[data-sku]`, `.sku`, meta tags
- Description: `.product-description`, `.description`, `[class*="description"]`
- Compare Price: `.compare-price`, `.old-price`, `[data-compare-price]`
- Weight: `.weight`, `[data-weight]`
- Images: `.product-gallery img`, `.product-images img`
- Tags: `meta[name="keywords"]`, `[data-tags]`
- SEO: `meta[property="og:title"]`, `meta[name="description"]`

## CSV Export

The CSV export function now generates files matching the template format:

### Features:

1. **Complete Field Mapping**: All fields from the CSV template are included
2. **Variant Support**: Products with variants generate multiple rows (one per variant)
3. **Image Rows**: Additional images generate separate rows with `Image position` incremented
4. **Proper Formatting**: Prices, weights, and other numeric fields are properly formatted
5. **Default Values**: Missing fields are filled with sensible defaults

### CSV Structure:

- **Row 1**: Header row with all column names
- **Product Rows**: One row per product with all details
- **Variant Rows**: Additional rows for product variants (empty Title field)
- **Image Rows**: Additional rows for additional product images

## Configuration

### Enabling Second Layer Scraping

To enable second-layer scraping for a brand, simply add the `extractProductDetails` function to your scraper config:

```typescript
export const morellatoScraperConfig: ScraperConfig = {
  // ... existing config ...
  
  extractProductDetails: ($, productUrl, baseProduct) => {
    // Extract detailed metadata here
    return {
      sku: '...',
      detailedDescription: '...',
      // ... other fields
    };
  },
};
```

### Batch Processing

The second layer processes products in batches:
- **Batch Size**: 5 concurrent requests (configurable in code)
- **Delay**: 1 second between batches
- **Error Handling**: Failed detail scrapes don't stop the process; products are returned without details

### Progress Tracking

The progress callback is updated during second-layer scraping:
- Status remains `'running'` during detail scraping
- Status changes to `'completed'` when all layers are done
- `productsFound` reflects the total number of products

## Usage

1. **Automatic**: When you start a scraping job, both layers run automatically if `extractProductDetails` is defined
2. **Manual**: You can manually trigger detail scraping by calling the scraping service
3. **Export**: When exporting to CSV, all available detail fields are included

## Performance Considerations

- **First Layer**: Fast, processes list pages in parallel
- **Second Layer**: Slower, visits each product page individually
  - Processes in batches to avoid overwhelming servers
  - Includes delays between batches
  - Can be time-consuming for large catalogs

## Error Handling

- Failed detail page fetches are logged but don't stop the process
- Products without details are still saved (with basic information only)
- Missing detail fields are handled gracefully in CSV export (empty values)

## Future Enhancements

Potential improvements:
- Configurable batch size and delays
- Retry logic for failed detail requests
- Caching detail pages
- Parallel processing with rate limiting
- Progress tracking for detail scraping phase
