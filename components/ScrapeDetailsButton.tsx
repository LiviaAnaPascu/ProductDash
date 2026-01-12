'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const SCRAPE_PRODUCT_DETAILS = gql`
  mutation ScrapeProductDetails($input: ScrapeProductDetailsInput!) {
    scrapeProductDetails(input: $input) {
      success
      failed
    }
  }
`;

interface ScrapeDetailsButtonProps {
  selectedProductIds: string[];
  disabled?: boolean;
}

export default function ScrapeDetailsButton({ selectedProductIds, disabled }: ScrapeDetailsButtonProps) {
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeDetails] = useMutation(SCRAPE_PRODUCT_DETAILS);

  const handleScrapeDetails = async () => {
    if (selectedProductIds.length === 0) {
      alert('Please select at least one product to scrape details');
      return;
    }

    setIsScraping(true);
    
    try {
      const result = await scrapeDetails({
        variables: {
          input: {
            productIds: selectedProductIds,
          },
        },
      });

      console.log('Detail scraping started:', result.data?.scrapeProductDetails);
      
      // Show notification
      alert(`Detail scraping started for ${selectedProductIds.length} products. This will run in the background.`);
    } catch (error: any) {
      console.error('Error starting detail scraping:', error);
      alert(`Error starting detail scraping: ${error.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <button
      onClick={handleScrapeDetails}
      disabled={disabled || selectedProductIds.length === 0 || isScraping}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
      suppressHydrationWarning
    >
      {isScraping ? (
        <>
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          Scraping...
        </>
      ) : (
        <>
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Scrape Details ({selectedProductIds.length})
        </>
      )}
    </button>
  );
}
