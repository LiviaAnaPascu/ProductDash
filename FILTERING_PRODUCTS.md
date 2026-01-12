# Filtering Products During Scraping

This guide explains how to skip/scrape products that don't match certain criteria.

## Methods to Skip Products

There are **two main ways** to filter out products during scraping:

### Method 1: Return `null` or `undefined` from `extractProduct`

In your scraper's `extractProduct` function, return `null` or `undefined` to skip a product entirely.

**Example in `morellatoScraper.ts`:**

```typescript
extractProduct: ($: cheerio.CheerioAPI, element: any) => {
  // ... extract product data ...
  
  // Skip products without images
  if (!imageUrl) {
    return null; // This product will be skipped
  }
  
  // Skip products with certain types
  if (type === 'Pen' || type === 'Other') {
    return null; // Skip pens and other items
  }
  
  // Skip products based on price (e.g., free items or very expensive items)
  if (price) {
    const priceNum = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (priceNum === 0 || priceNum > 10000) {
      return null; // Skip free or very expensive items
    }
  }
  
  // Skip products with certain keywords in name
  if (name.toLowerCase().includes('discontinued') || name.toLowerCase().includes('out of stock')) {
    return null;
  }
  
  // Return the product if it passes all checks
  return {
    name: name || 'Unknown Product',
    imageUrl: imageUrl || '',
    gender: 'female',
    price: price || undefined,
    description: description || undefined,
    url: productUrl || 'https://www.morellato.com',
    type,
  };
}
```

### Method 2: Use the `shouldIncludeProduct` Filter Function

Add a `shouldIncludeProduct` function to your scraper config. This function receives the extracted product data and returns `true` to include it or `false` to skip it.

**Example in `morellatoScraper.ts`:**

```typescript
export const morellatoScraperConfig: ScraperConfig = {
  // ... other config ...
  
  extractProduct: ($, element) => {
    // ... extraction logic ...
    return { name, imageUrl, gender, price, description, url, type };
  },
  
  // Filter function - runs after extractProduct
  shouldIncludeProduct: (product) => {
    // Skip products without images
    if (!product.imageUrl) {
      return false;
    }
    
    // Skip specific product types
    if (product.type === 'Pen' || product.type === 'Other') {
      return false;
    }
    
    // Skip products with certain keywords
    if (product.name && product.name.toLowerCase().includes('discontinued')) {
      return false;
    }
    
    // Skip products below a certain price
    if (product.price) {
      const priceNum = parseFloat(product.price.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (priceNum < 50) { // Skip products under €50
        return false;
      }
    }
    
    return true; // Include this product
  },
};
```

## Common Filtering Criteria

### 1. Skip products without images
```typescript
if (!imageUrl) return null;
```

### 2. Skip products by type
```typescript
if (type === 'Pen' || type === 'Watch') return null;
```

### 3. Skip products by price range
```typescript
const priceNum = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
if (priceNum < 50 || priceNum > 1000) return null; // Only products between €50-€1000
```

### 4. Skip products by name keywords
```typescript
const nameLower = name.toLowerCase();
if (nameLower.includes('discontinued') || nameLower.includes('out of stock')) {
  return null;
}
```

### 5. Skip products by URL pattern
```typescript
if (productUrl.includes('/outlet/') || productUrl.includes('/sale/')) {
  return null; // Skip outlet or sale items
}
```

### 6. Skip duplicate products (by URL)
```typescript
// This would need to be tracked outside the extractProduct function
const seenUrls = new Set();
if (seenUrls.has(productUrl)) {
  return null;
}
seenUrls.add(productUrl);
```

## When to Use Each Method

- **Use Method 1 (return null)** when:
  - You want to skip early in the extraction process (before processing all fields)
  - The filtering logic is tightly coupled with extraction
  - You want to avoid unnecessary processing

- **Use Method 2 (shouldIncludeProduct)** when:
  - You want cleaner separation between extraction and filtering
  - You need to filter based on multiple extracted fields
  - The filtering logic is complex and reusable

## Notes

- Products without a `name` are automatically skipped by the extraction system
- Returning `null` or `undefined` from `extractProduct` is the same as skipping
- The `shouldIncludeProduct` function runs after `extractProduct`, so all fields are available
- Filtering happens during scraping, so filtered products are never added to the store
