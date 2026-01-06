# Morellato Scraper Configuration

## URL Pagination Pattern

The Morellato catalog uses a specific URL pattern for pagination:

- **Page 1**: `https://www.morellato.com/catalogo-prodotti-A1.htm`
- **Page 2**: `https://www.morellato.com/catalogo-prodotti-A1_2.htm`
- **Page 3**: `https://www.morellato.com/catalogo-prodotti-A1_3.htm`
- **Page N**: `https://www.morellato.com/catalogo-prodotti-A1_N.htm`

## Implementation

The scraper uses a custom URL builder function (`morellatoUrlBuilder`) that:

1. Takes the base URL (page 1)
2. For page 1, returns the URL as-is
3. For pages 2+, inserts `_N` before the `.htm` extension

## Page Detection

The scraper automatically detects the total number of pages by:

1. Looking for the text pattern "Pagina X di Y" in the HTML
2. Extracting page numbers from pagination links
3. Finding the maximum page number in pagination URLs

## Product Extraction

The scraper extracts products using:

- **Product List Selector**: `article, .product-item, [class*="product"], [data-product]`
- **Name**: From headings (h2, h3, h4) or link text
- **Image**: From `img` tags (checks `src`, `data-src`, `data-lazy-src`)
- **Price**: From price elements or extracted from text using regex pattern `(\d+[.,]\d+\s*€)`
- **URL**: From product links
- **Type**: Automatically determined from product name (Charm, Bracelet, Necklace, Ring, Earring, Watch)

## Usage

The scraper is automatically registered when the module is imported. To use it:

1. Ensure the Morellato brand exists in the database with:
   - `website`: `https://www.morellato.com/catalogo-prodotti-A1.htm`
   - `baseUrl`: `https://www.morellato.com`

2. Start a scraping job via GraphQL:
```graphql
mutation {
  startScraping(input: { brandId: "morellato-brand-id" }) {
    id
    status
  }
}
```

The scraper will:
- Automatically detect all pages (currently 12 pages based on the website)
- Scrape products from all pages concurrently
- Track progress and update the ScraperJob
- Save all products to the database

## Customization

To customize the scraper for different product structures:

1. Edit `utils/morellatoScraper.ts`
2. Update the `productListSelector` to match the actual HTML structure
3. Adjust the `extractProduct` function for specific field extraction
4. Modify the `morellatoUrlBuilder` if the URL pattern changes

