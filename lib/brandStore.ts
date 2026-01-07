// In-memory brand store (replaces database for now)

export interface Brand {
  id: string;
  name: string;
  website: string;
  baseUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class BrandStore {
  private brands: Map<string, Brand> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with Morellato brand
    this.addBrand({
      name: 'Morellato',
      website: 'https://www.morellato.com/catalogo-prodotti-A1.htm',
      baseUrl: 'https://www.morellato.com',
      isActive: true,
    });

     // Add more brands here
  this.addBrand({
    name: 'S\'Agapõ',
    website: 'https://www.sagapo.it/donna',
    baseUrl: 'https://www.sagapo.it/donna',
    isActive: true,
  });

  }

  addBrand(brandData: Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>): Brand {
    const id = `brand-${this.nextId++}`;
    const now = new Date();
    const brand: Brand = {
      id,
      ...brandData,
      createdAt: now,
      updatedAt: now,
    };
    this.brands.set(id, brand);
    return brand;
  }

  getBrand(id: string): Brand | undefined {
    return this.brands.get(id);
  }

  getBrandByName(name: string): Brand | undefined {
    return Array.from(this.brands.values()).find(b => b.name === name);
  }

  getAllBrands(): Brand[] {
    return Array.from(this.brands.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }

  updateBrand(id: string, updates: Partial<Omit<Brand, 'id' | 'createdAt'>>): Brand | undefined {
    const brand = this.brands.get(id);
    if (!brand) return undefined;

    const updated: Brand = {
      ...brand,
      ...updates,
      updatedAt: new Date(),
    };
    this.brands.set(id, updated);
    return updated;
  }

  deleteBrand(id: string): boolean {
    return this.brands.delete(id);
  }
}

// Singleton instance
export const brandStore = new BrandStore();

