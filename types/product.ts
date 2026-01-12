export interface Product {
  id: string;
  name: string;
  brand: string;
  type: string;
  gender: "male" | "female"; 
  price?: string;
  imageUrl: string;
  description?: string;
  url: string;
  metadata?: Record<string, string | number>;
  
  // Detailed metadata for CSV export (populated by second-layer scraping)
  details?: {
    sku?: string;
    barcode?: string;
    urlHandle?: string; // URL handle/slug
    detailedDescription?: string;
    compareAtPrice?: string;
    costPerItem?: string;
    chargeTax?: boolean;
    taxCode?: string;
    
    // Unit price fields
    unitPriceTotalMeasure?: string;
    unitPriceTotalMeasureUnit?: string; // ml, g, etc.
    unitPriceBaseMeasure?: string;
    unitPriceBaseMeasureUnit?: string;
    
    // Inventory
    inventoryQuantity?: number;
    continueSellingWhenOutOfStock?: boolean;
    
    // Weight
    weightValue?: number; // in grams
    weightUnit?: string; // g, kg, etc.
    
    // Shipping
    requiresShipping?: boolean;
    fulfillmentService?: string;
    
    // Variants (for products with size/color options)
    variants?: ProductVariant[];
    
    // Images (additional images beyond the main one)
    additionalImages?: string[];
    
    // SEO
    seoTitle?: string;
    seoDescription?: string;
    
    // Google Shopping
    googleProductCategory?: string;
    googleGender?: string;
    googleAgeGroup?: string;
    googleMPN?: string;
    googleCondition?: string;
    
    // Tags
    tags?: string[];
    
    // Product category (hierarchical)
    productCategory?: string;
  };
}

export interface ProductVariant {
  sku?: string;
  barcode?: string;
  option1Name?: string; // e.g., "Size"
  option1Value?: string; // e.g., "Small"
  option2Name?: string; // e.g., "Color"
  option2Value?: string; // e.g., "Red"
  option3Name?: string;
  option3Value?: string;
  price?: string;
  compareAtPrice?: string;
  costPerItem?: string;
  inventoryQuantity?: number;
  weightValue?: number;
  weightUnit?: string;
  imageUrl?: string;
}

export interface ProductFilters {
  search: string;
  brand: string;
  type: string;
  gender: "male" | "female";
}

export interface BrandConfig {
  name: string;
  website: string;
  scraper: (url: string) => Promise<Product[]>;
}

