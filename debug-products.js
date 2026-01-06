// Debug script to check products - Copy and paste into browser console

// 1. Check store state (shows total products and products per brand)
fetch('http://localhost:3000/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        debugStore {
          totalProducts
          totalBrands
          productsByBrand {
            brandId
            brandName
            productCount
          }
        }
      }
    `,
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('🔍 Store Debug Info:', data);
    if (data.data?.debugStore) {
      const store = data.data.debugStore;
      console.log(`📊 Total Products: ${store.totalProducts}`);
      console.log(`📦 Total Brands: ${store.totalBrands}`);
      console.table(store.productsByBrand);
      
      if (store.totalProducts === 0) {
        console.warn('⚠️ No products found! You need to run scraping first.');
        console.log('💡 Run this to start scraping:');
        console.log(`
fetch('http://localhost:3000/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'mutation { startScraping(input: { brandId: "brand-1" }) { id status } }'
  }),
}).then(r => r.json()).then(console.log);
        `);
      }
    }
  })
  .catch(error => console.error('❌ Error:', error));

// 2. Get brands to see available brand IDs
fetch('http://localhost:3000/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '{ brands { id name website productCount } }'
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('📦 Brands:', data.data?.brands);
    if (data.data?.brands?.length > 0) {
      const brand = data.data.brands[0];
      console.log(`\n💡 To start scraping, use brand ID: "${brand.id}"`);
      console.log(`   Current product count: ${brand.productCount}`);
    }
  })
  .catch(error => console.error('❌ Error:', error));

// 3. Try to get products
fetch('http://localhost:3000/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query {
        products(filters: { page: 1, pageSize: 5 }) {
          products {
            id
            name
            brand { name }
            price
          }
          totalCount
        }
      }
    `,
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('🛍️ Products Query Result:', data);
    if (data.data?.products) {
      console.log(`Found ${data.data.products.totalCount} products`);
      if (data.data.products.products.length > 0) {
        console.table(data.data.products.products);
      } else {
        console.warn('⚠️ No products returned. Check server console for errors.');
      }
    }
    if (data.errors) {
      console.error('❌ GraphQL Errors:', data.errors);
    }
  })
  .catch(error => console.error('❌ Error:', error));

