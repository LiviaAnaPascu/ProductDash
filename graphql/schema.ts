import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Product {
    id: ID!
    name: String!
    brand: Brand!
    type: String
    gender: String
    price: String
    imageUrl: String!
    description: String
    url: String!
    metadata: JSON
    details: ProductDetails
    createdAt: String!
    updatedAt: String!
  }

  type ProductDetails {
    sku: String
    barcode: String
    urlHandle: String
    detailedDescription: String
    compareAtPrice: String
    costPerItem: String
    chargeTax: Boolean
    taxCode: String
    unitPriceTotalMeasure: String
    unitPriceTotalMeasureUnit: String
    unitPriceBaseMeasure: String
    unitPriceBaseMeasureUnit: String
    inventoryQuantity: Int
    continueSellingWhenOutOfStock: Boolean
    weightValue: Int
    weightUnit: String
    requiresShipping: Boolean
    fulfillmentService: String
    additionalImages: [String!]
    tags: [String!]
    seoTitle: String
    seoDescription: String
    googleProductCategory: String
    googleGender: String
    googleAgeGroup: String
    googleMPN: String
    googleCondition: String
    productCategory: String
  }

  type Brand {
    id: ID!
    name: String!
    website: String!
    baseUrl: String
    isActive: Boolean!
    productCount: Int
    createdAt: String!
    updatedAt: String!
  }

  type ScraperJob {
    id: ID!
    brand: Brand!
    status: String!
    totalPages: Int
    currentPage: Int!
    productsFound: Int!
    error: String
    startedAt: String
    completedAt: String
    createdAt: String!
    updatedAt: String!
  }

  type ProductConnection {
    products: [Product!]!
    totalCount: Int!
    page: Int!
    pageSize: Int!
    hasMore: Boolean!
  }

  input ProductFilters {
    search: String
    brandId: ID
    type: String
    gender: String
    page: Int
    pageSize: Int
  }

  input CreateBrandInput {
    name: String!
    website: String!
    baseUrl: String
  }

  input StartScrapingInput {
    brandId: ID!
  }

  input ScrapeProductDetailsInput {
    productIds: [ID!]!
  }

  type ScrapeProductDetailsResult {
    success: Int!
    failed: Int!
  }

  type Job {
    id: ID!
    type: String!
    status: String!
    progress: Int
    data: JSON
    error: String
    createdAt: String!
    updatedAt: String!
    completedAt: String
  }

  input ExportCSVInput {
    productIds: [ID!]!
    filename: String
  }

  type ExportCSVResult {
    jobId: ID!
    status: String!
  }

  type Query {
    products(filters: ProductFilters): ProductConnection!
    product(id: ID!): Product
    brands: [Brand!]!
    brand(id: ID!): Brand
    scraperJobs(brandId: ID): [ScraperJob!]!
    scraperJob(id: ID!): ScraperJob
    job(id: ID!): Job
    jobs(type: String): [Job!]!
    debugStore: StoreDebug!
  }

  type StoreDebug {
    totalProducts: Int!
    totalBrands: Int!
    productsByBrand: [BrandProductCount!]!
  }

  type BrandProductCount {
    brandId: ID!
    brandName: String!
    productCount: Int!
  }

  type Mutation {
    createBrand(input: CreateBrandInput!): Brand!
    updateBrand(id: ID!, input: CreateBrandInput!): Brand!
    deleteBrand(id: ID!): Boolean!
    startScraping(input: StartScrapingInput!): ScraperJob!
    cancelScraping(jobId: ID!): Boolean!
    scrapeProductDetails(input: ScrapeProductDetailsInput!): Job!
    exportCSV(input: ExportCSVInput!): ExportCSVResult!
  }

  type Subscription {
    scraperJobUpdated(jobId: ID!): ScraperJob!
    productsUpdated(brandId: ID): [Product!]!
  }

  scalar JSON
`;

