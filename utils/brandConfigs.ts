// Brand configurations - easily extensible for adding new brands
// To add a new brand, simply add a new entry to the array below

import { BrandConfig } from '@/types/product';
import { genericScraper } from './productScraper';

// Example: Custom scraper for a specific brand
const morelattoScraper = async (url: string) => {
  // Implement custom scraping logic for specific website structure
  // This is where you'd add brand-specific selectors and parsing logic
  return genericScraper(url);
};

export const brandConfigs: BrandConfig[] = [
  {
    name: 'Example Brand',
    website: 'https://www.morellato.com/catalogo-prodotti-A1.htm',
    scraper: genericScraper,
  },
  // Add more brands here:
  // {
  //   name: 'Brand Name',
  //   website: 'https://brand-website.com/products',
  //   scraper: customBrandScraper, // or genericScraper
  // },
];

// Helper function to get brand config by name
export const getBrandConfig = (brandName: string): BrandConfig | undefined => {
  return brandConfigs.find((config) => config.name === brandName);
};

// Helper function to add a new brand dynamically
export const addBrandConfig = (config: BrandConfig) => {
  brandConfigs.push(config);
};

