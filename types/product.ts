export interface Product {
  id: string;
  name: string;
  brand: string;
  type: string;
  price?: string;
  imageUrl: string;
  description?: string;
  url: string;
  metadata?: Record<string, string | number>;
}

export interface ProductFilters {
  search: string;
  brand: string;
  type: string;
}

export interface BrandConfig {
  name: string;
  website: string;
  scraper: (url: string) => Promise<Product[]>;
}

