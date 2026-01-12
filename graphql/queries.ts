import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts($filters: ProductFilters) {
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
      page
      pageSize
      hasMore
    }
  }
`;

export const GET_BRANDS = gql`
  query GetBrands {
    brands {
      id
      name
      website
      baseUrl
      isActive
      productCount
    }
  }
`;

export const GET_BRAND = gql`
  query GetBrand($id: ID!) {
    brand(id: $id) {
      id
      name
      website
      baseUrl
      isActive
      productCount
    }
  }
`;

export const START_SCRAPING = gql`
  mutation StartScraping($input: StartScrapingInput!) {
    startScraping(input: $input) {
      id
      status
      brand {
        id
        name
      }
      createdAt
    }
  }
`;

export const GET_SCRAPER_JOBS = gql`
  query GetScraperJobs($brandId: ID) {
    scraperJobs(brandId: $brandId) {
      id
      status
      totalPages
      currentPage
      productsFound
      error
      startedAt
      completedAt
      brand {
        id
        name
      }
    }
  }
`;

