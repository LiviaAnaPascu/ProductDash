# Filtering and Pagination System

## Overview

The product filtering and pagination system works in two stages:
1. **Scraping Stage**: The scraper collects ALL products from the website
2. **Display Stage**: The frontend filters and paginates the scraped products

## How Filtering Works

### Filter Flow

```
User Input (Search/Filter) 
  ↓
Frontend State (filters object)
  ↓
GraphQL Query (with filters)
  ↓
Product Store (getAllProducts with filters)
  ↓
Filtered Results (applied in memory)
  ↓
Pagination (slice results)
  ↓
Display (show page of results)
```

### Filter Types

The system supports three types of filters:

1. **Search Filter** (`search`)
   - Searches in product `name` and `description`
   - Case-insensitive
   - Partial matching (contains)

2. **Brand Filter** (`brandId`)
   - Filters by specific brand ID
   - Exact match

3. **Type Filter** (`type`)
   - Filters by product type (e.g., "Charm", "Bracelet", "Watch")
   - Exact match

### Filter Implementation

**Location**: `lib/productStore.ts` → `getAllProducts()`

```typescript
getAllProducts(filters?: {
  brandId?: string;
  type?: string;
  search?: string;
  page?: number;
  pageSize?: number;
})
```

**Filtering Process**:

1. **Start with all products** from the store
2. **Apply brand filter** (if provided):
   ```typescript
   if (filters?.brandId) {
     filtered = filtered.filter(p => p.brandId === filters.brandId);
   }
   ```

3. **Apply type filter** (if provided):
   ```typescript
   if (filters?.type) {
     filtered = filtered.filter(p => p.type === filters.type);
   }
   ```

4. **Apply search filter** (if provided):
   ```typescript
   if (filters?.search) {
     const searchLower = filters.search.toLowerCase();
     filtered = filtered.filter(p => 
       p.name.toLowerCase().includes(searchLower) ||
       p.description?.toLowerCase().includes(searchLower)
     );
   }
   ```

5. **Count total** filtered results
6. **Apply pagination** (slice the filtered array)
7. **Sort** by creation date (newest first)

## How Pagination Works

### Pagination Flow

```
Filtered Products (e.g., 500 products)
  ↓
Calculate Skip: (page - 1) * pageSize
  ↓
Slice: filtered.slice(skip, skip + pageSize)
  ↓
Return: products for current page + totalCount
```

### Example

- **Total filtered products**: 500
- **Page size**: 50
- **Current page**: 1

**Calculation**:
- Skip = (1 - 1) * 50 = 0
- Slice = products[0..50]
- Returns: 50 products (items 1-50)

**Page 2**:
- Skip = (2 - 1) * 50 = 50
- Slice = products[50..100]
- Returns: 50 products (items 51-100)

### "Load More" Button

**Location**: `app/page.tsx` (line 197-204)

```typescript
{productsData?.products?.hasMore && (
  <button
    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
  >
    Load More
  </button>
)}
```

**How it works**:

1. **Checks `hasMore`**: Determines if more products exist
   ```typescript
   hasMore: (page - 1) * pageSize + products.length < totalCount
   ```
   - Example: Page 1, showing 50 of 500 → `hasMore = true`
   - Example: Page 10, showing 500 of 500 → `hasMore = false`

2. **On Click**: Increments the page number
   ```typescript
   setFilters({ ...filters, page: filters.page + 1 })
   ```

3. **GraphQL Re-fetch**: Apollo Client automatically refetches with new page
   ```typescript
   const { data: productsData } = useQuery(GET_PRODUCTS, {
     variables: { filters }, // filters includes updated page number
   });
   ```

4. **New Products Loaded**: The query returns the next page of products

## Important Notes

### ⚠️ Current Limitation: "Load More" Replaces, Doesn't Append

**Current Behavior**: When you click "Load More", it shows the NEXT page (replaces current products)

**Expected Behavior**: "Load More" should APPEND new products to the existing list

### Current Implementation Issue

Looking at the code:
- `products` state is derived from `productsData.products.products`
- When page changes, it shows ONLY that page's products
- Previous products are not kept

### How to Fix "Load More" to Append

You would need to:

1. **Accumulate products** instead of replacing:
   ```typescript
   const [allLoadedProducts, setAllLoadedProducts] = useState<Product[]>([]);
   
   useEffect(() => {
     if (productsData?.products?.products) {
       if (filters.page === 1) {
         // First page: replace
         setAllLoadedProducts(productsData.products.products);
       } else {
         // Subsequent pages: append
         setAllLoadedProducts(prev => [...prev, ...productsData.products.products]);
       }
     }
   }, [productsData, filters.page]);
   ```

2. **Display accumulated products**:
   ```typescript
   {allLoadedProducts.map((product) => (
     <ProductCard key={product.id} ... />
   ))}
   ```

## Filter Interaction

### Filter Reset Behavior

When you change a filter, the page resets to 1:

```typescript
// Search changes
onChange={(value) => setFilters({ ...filters, search: value, page: 1 })}

// Brand changes
onBrandChange={(brand) => setFilters({ ...filters, brandId: brand?.id || '', page: 1 })}

// Type changes
onTypeChange={(type) => setFilters({ ...filters, type, page: 1 })}
```

This ensures you always start from page 1 when filtering.

## Data Flow Diagram

```
┌─────────────────┐
│  Product Store  │ (All scraped products)
│  (In Memory)    │
└────────┬────────┘
         │
         │ getAllProducts(filters)
         ↓
┌─────────────────┐
│  Filter Stage   │
│  - brandId      │
│  - type         │
│  - search       │
└────────┬────────┘
         │
         │ Filtered array
         ↓
┌─────────────────┐
│ Pagination      │
│ - page: 1       │
│ - pageSize: 50  │
│ - slice array   │
└────────┬────────┘
         │
         │ Page of products
         ↓
┌─────────────────┐
│  GraphQL        │
│  Response       │
└────────┬────────┘
         │
         │ { products, totalCount, hasMore }
         ↓
┌─────────────────┐
│  Frontend       │
│  Display        │
└─────────────────┘
```

## Summary

- **Scraping**: Collects ALL products (no filtering)
- **Filtering**: Happens in-memory on ALL scraped products
- **Pagination**: Slices the filtered results into pages
- **Load More**: Currently shows next page (replaces), should append
- **Filter Reset**: Changing filters resets to page 1

