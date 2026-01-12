'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (productId: string) => void;
}

export default function ProductCard({ product, isSelected, onToggleSelect }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Clean and validate image URL
  const getImageUrl = () => {
    if (!product.imageUrl || imageError) return null;
    
    let url = product.imageUrl.trim();
    
    // Remove any query parameters that might cause issues
    try {
      const urlObj = new URL(url);
      // Keep the URL as is, but ensure it's valid
      return urlObj.toString();
    } catch {
      // If URL is invalid, try to fix it
      if (url.startsWith('//')) {
        url = 'https:' + url;
      } else if (url.startsWith('/')) {
        url = 'https://www.morellato.com' + url;
      }
      return url;
    }
  };

  const imageUrl = getImageUrl();
  const showPlaceholder = !imageUrl || imageError;

  return (
    <div
      className={`relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-4 ring-blue-500' : ''
      }`}
      onClick={() => onToggleSelect(product.id)}
    >
      <div className="relative w-full h-48 bg-gray-200">
        {showPlaceholder ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        ) : (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
              onError={() => {
                console.warn(`Failed to load image: ${imageUrl}`);
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => setImageLoading(false)}
            />
          </>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
            ✓
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">{product.brand}</span> • {product.type}
        </p>
        {product.price && (
          <p className="text-lg font-bold text-green-600">{product.price}</p>
        )}
        {product.description && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>
        )}
      </div>
    </div>
  );
}

