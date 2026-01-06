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

### "Load More" and Infinite Scroll

**Location**: `app/page.tsx` and `components/VirtualizedProductGrid.tsx`

**Two Ways to Load More**:

1. **Manual "Load More" Button** (top of product list):
   ```typescript
   <button onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
     Load More ({remaining} remaining)
   </button>
   ```

2. **Automatic Infinite Scroll** (scroll to bottom):
   - Uses `react-intersection-observer` to detect when user scrolls near bottom
   - Triggers automatically when bottom element comes into view (300px margin)
   - Shows "Loading more products..." indicator while fetching

**How it works**:

1. **Checks `hasMore`**: Determines if more products exist
   ```typescript
   hasMore: (page - 1) * pageSize + products.length < totalCount
   ```
   - Example: Showing 50 of 500 → `hasMore = true`
   - Example: Showing 500 of 500 → `hasMore = false`

2. **On Trigger** (button click or scroll): Increments the page number
   ```typescript
   setFilters({ ...filters, page: filters.page + 1 })
   ```

3. **GraphQL Re-fetch**: Apollo Client automatically refetches with new page
   ```typescript
   const { data: productsData } = useQuery(GET_PRODUCTS, {
     variables: { filters }, // filters includes updated page number
   });
   ```

4. **Products Appended**: New products are appended to `allLoadedProducts` state
   ```typescript
   setAllLoadedProducts(prev => [...prev, ...newProducts]);
   ```

5. **Scroll Preserved**: `useLayoutEffect` restores scroll position after DOM update

## Important Notes

### ✅ "Load More" Appends Products

**Current Behavior**: "Load More" and infinite scroll **append** new products to the existing list

**Implementation**:

1. **Product Accumulation** (`app/page.tsx`):
   ```typescript
   const [allLoadedProducts, setAllLoadedProducts] = useState<Product[]>([]);
   
   useEffect(() => {
     if (currentPageProducts.length > 0) {
       if (filters.page === 1) {
         // First page: replace
         setAllLoadedProducts(currentPageProducts);
       } else {
         // Subsequent pages: append (avoid duplicates)
         setAllLoadedProducts(prev => {
           const existingIds = new Set(prev.map(p => p.id));
           const newProducts = currentPageProducts.filter(p => !existingIds.has(p.id));
           return [...prev, ...newProducts];
         });
       }
     }
   }, [currentPageProducts, filters.page]);
   ```

2. **Scroll Position Preservation**: Uses `useLayoutEffect` to maintain scroll position when new items are appended

3. **Display**: Shows all accumulated products in the `VirtualizedProductGrid`

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

## Virtualized Grid and Lazy Loading

### VirtualizedProductGrid Component

**Location**: `components/VirtualizedProductGrid.tsx`

**Features**:
- **Lazy Loading**: Items after index 50 use intersection observer
- **Placeholders**: Shows skeleton loaders for items not in viewport
- **Smooth Animations**: Staggered fade-in animations for items entering view
- **Performance**: Only renders visible items + buffer for optimal performance

**How it works**:
1. First 50 items render immediately (no lazy loading)
2. Items 50+ use `useInView` hook to detect when entering viewport
3. Placeholder skeleton shown until item is in view
4. Smooth fade-in animation when item becomes visible

## Scroll Position Preservation

**Implementation**: `app/page.tsx`

When loading more products:
1. **Save scroll position** before state update:
   ```typescript
   scrollPositionRef.current = { y: window.scrollY, height: document.documentElement.scrollHeight };
   ```

2. **Append new products** to state

3. **Restore scroll position** using `useLayoutEffect`:
   ```typescript
   useLayoutEffect(() => {
     if (scrollPositionRef.current && !isLoadingMore) {
       window.scrollTo({ top: scrollPositionRef.current.y, behavior: 'auto' });
     }
   }, [allLoadedProducts, isLoadingMore]);
   ```

This ensures users stay at their scroll position when new items are loaded.

## Summary

- **Scraping**: Collects ALL products (no filtering)
- **Filtering**: Happens in-memory on ALL scraped products
- **Pagination**: Slices the filtered results into pages
- **Load More**: Appends new products to existing list (doesn't replace)
- **Infinite Scroll**: Automatically loads more when scrolling to bottom
- **Scroll Preservation**: Maintains scroll position when new items load
- **Virtualization**: Lazy loads items after 50 for better performance
- **Filter Reset**: Changing filters resets to page 1

