// In-memory product store (replaces database for now)

import { Product } from '@/types/product';
import { Brand } from './brandStore';

export interface StoredProduct extends Product {
  brandId: string;
  createdAt: Date;
  updatedAt: Date;
}

class ProductStore {
  private products: Map<string, StoredProduct> = new Map();
  private brandProducts: Map<string, Set<string>> = new Map(); // brandId -> Set of product IDs

  addProduct(product: Product, brandId: string): StoredProduct {
    // Use brandId + url as unique key
    const id = `${brandId}-${product.url}`;
    
    const now = new Date();
    const storedProduct: StoredProduct = {
      ...product,
      id,
      brandId,
      createdAt: now,
      updatedAt: now,
    };
    
    this.products.set(id, storedProduct);
    
    // Track products by brand
    if (!this.brandProducts.has(brandId)) {
      this.brandProducts.set(brandId, new Set());
    }
    this.brandProducts.get(brandId)!.add(id);
    
    return storedProduct;
  }

  addProducts(products: Product[], brandId: string): StoredProduct[] {
    return products.map(product => this.addProduct(product, brandId));
  }

  getProduct(id: string): StoredProduct | undefined {
    return this.products.get(id);
  }

  getAllProducts(filters?: {
    brandId?: string;
    type?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): { products: StoredProduct[]; totalCount: number } {
    let filtered = Array.from(this.products.values());

    // Apply filters
    if (filters?.brandId) {
      filtered = filtered.filter(p => p.brandId === filters.brandId);
    }

    if (filters?.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    const totalCount = filtered.length;

    // Apply pagination
    if (filters?.page && filters?.pageSize) {
      const skip = (filters.page - 1) * filters.pageSize;
      filtered = filtered.slice(skip, skip + filters.pageSize);
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { products: filtered, totalCount };
  }

  getProductsByBrand(brandId: string): StoredProduct[] {
    const productIds = this.brandProducts.get(brandId);
    if (!productIds) return [];
    
    return Array.from(productIds)
      .map(id => this.products.get(id))
      .filter((p): p is StoredProduct => p !== undefined);
  }

  deleteProduct(id: string): boolean {
    const product = this.products.get(id);
    if (!product) return false;

    const brandProducts = this.brandProducts.get(product.brandId);
    if (brandProducts) {
      brandProducts.delete(id);
    }

    return this.products.delete(id);
  }

  deleteProductsByBrand(brandId: string): number {
    const productIds = this.brandProducts.get(brandId);
    if (!productIds) return 0;

    let count = 0;
    for (const id of productIds) {
      if (this.products.delete(id)) {
        count++;
      }
    }
    this.brandProducts.delete(brandId);
    return count;
  }

  getProductCount(brandId?: string): number {
    if (brandId) {
      return this.brandProducts.get(brandId)?.size || 0;
    }
    return this.products.size;
  }
}

// Singleton instance
export const productStore = new ProductStore();

