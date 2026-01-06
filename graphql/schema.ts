import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Product {
    id: ID!
    name: String!
    brand: Brand!
    type: String
    price: String
    imageUrl: String!
    description: String
    url: String!
    metadata: JSON
    createdAt: String!
    updatedAt: String!
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

  type Query {
    products(filters: ProductFilters): ProductConnection!
    product(id: ID!): Product
    brands: [Brand!]!
    brand(id: ID!): Brand
    scraperJobs(brandId: ID): [ScraperJob!]!
    scraperJob(id: ID!): ScraperJob
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
  }

  type Subscription {
    scraperJobUpdated(jobId: ID!): ScraperJob!
    productsUpdated(brandId: ID): [Product!]!
  }

  scalar JSON
`;

