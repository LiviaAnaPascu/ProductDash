'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { exportToCSV } from '@/utils/csvExport';
import { Product } from '@/types/product';

const SCRAPE_PRODUCT_DETAILS = gql`
  mutation ScrapeProductDetails($input: ScrapeProductDetailsInput!) {
    scrapeProductDetails(input: $input) {
      success
      failed
    }
  }
`;

const GET_PRODUCTS_WITH_DETAILS = gql`
  query GetProductsWithDetails($filters: ProductFilters) {
    products(filters: $filters) {
      products {
        id
        name
        brand {
          id
          name
        }
        type
        gender
        price
        imageUrl
        description
        url
        metadata
        details {
          sku
          barcode
          urlHandle
          detailedDescription
          compareAtPrice
          costPerItem
          chargeTax
          taxCode
          unitPriceTotalMeasure
          unitPriceTotalMeasureUnit
          unitPriceBaseMeasure
          unitPriceBaseMeasureUnit
          inventoryQuantity
          continueSellingWhenOutOfStock
          weightValue
          weightUnit
          requiresShipping
          fulfillmentService
          additionalImages
          tags
          seoTitle
          seoDescription
          googleProductCategory
          googleGender
          googleAgeGroup
          googleMPN
          googleCondition
          productCategory
        }
      }
      totalCount
    }
  }
`;

interface ExportButtonProps {
  selectedProducts: Product[];
  selectedProductIds: string[];
  disabled?: boolean;
  onProductsUpdate?: () => void; // Callback to refresh products after scraping
}

export default function ExportButton({ 
  selectedProducts, 
  selectedProductIds,
  disabled,
  onProductsUpdate 
}: ExportButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scraping' | 'exporting' | 'complete'>('idle');
  const [scrapeDetails] = useMutation(SCRAPE_PRODUCT_DETAILS);
  const { refetch: refetchProducts } = useQuery(GET_PRODUCTS_WITH_DETAILS, {
    skip: true, // Don't run automatically
    variables: { filters: {} }, // Empty filters to get all products
  });

  const handleExport = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select at least one product to export');
      return;
    }

    setIsProcessing(true);
    setStatus('scraping');

    try {
      // Step 1: Scrape details for selected products
      console.log(`Starting detail scraping for ${selectedProductIds.length} products`);
      
      const scrapeResult = await scrapeDetails({
        variables: {
          input: {
            productIds: selectedProductIds,
          },
        },
      });

      const scrapeData = scrapeResult.data?.scrapeProductDetails;
      console.log('Detail scraping completed:', scrapeData);
      
      // Step 2: Refetch products to get updated data with details
      setStatus('exporting');
      
      if (onProductsUpdate) {
        onProductsUpdate();
        // Wait a bit for the update to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 3: Get updated products with details and export
      // Refetch to get products with details
      let productsToExport = selectedProducts;
      
      // Refetch products to get updated data with details
      try {
        const updatedResult = await refetchProducts({
          filters: { page: 1, pageSize: 1000 },
        });
        
        if (updatedResult.data?.products?.products) {
          // Filter to only selected products and map to Product format
          productsToExport = updatedResult.data.products.products
            .filter((p: any) => selectedProductIds.includes(p.id))
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              brand: p.brand.name,
              type: p.type || 'General',
              gender: (p.gender as 'male' | 'female') || 'female',
              price: p.price || undefined,
              imageUrl: p.imageUrl,
              description: p.description || undefined,
              url: p.url,
              metadata: p.metadata,
              details: p.details || undefined, // Include details if available
            }));
        }
      } catch (error) {
        console.warn('Could not refetch products, using current selection:', error);
      }
      
      // Export with updated products (they should have details now)
      exportToCSV(productsToExport, `products-export-${Date.now()}.csv`);
      
      setStatus('complete');
      setTimeout(() => {
        setStatus('idle');
        setIsProcessing(false);
      }, 2000);
      
    } catch (error: any) {
      console.error('Error during scrape and export:', error);
      alert(`Error: ${error.message}`);
      setIsProcessing(false);
      setStatus('idle');
    }
  };

  const getButtonText = () => {
    if (status === 'scraping') {
      return `Scraping Details... (${selectedProducts.length})`;
    } else if (status === 'exporting') {
      return 'Exporting CSV...';
    } else if (status === 'complete') {
      return 'Export Complete!';
    }
    return `Export CSV (${selectedProducts.length})`;
  };

  const getButtonIcon = () => {
    if (isProcessing) {
      return (
        <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
      );
    }
    return (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || selectedProducts.length === 0 || isProcessing}
      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      suppressHydrationWarning
    >
      {getButtonIcon()}
      {getButtonText()}
    </button>
  );
}

