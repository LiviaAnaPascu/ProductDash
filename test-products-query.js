// Test Products Query - Copy and paste into browser console

// Basic products query
fetch('http://localhost:3000/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query {
        products(filters: {
          page: 1
          pageSize: 20
        }) {
          products {
            id
            name
            brand {
              id
              name
            }
            type
            price
            imageUrl
            description
            url
          }
          totalCount
          page
          pageSize
          hasMore
        }
      }
    `,
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('Products Query Result:', data);
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
    } else {
      console.log(`Found ${data.data.products.totalCount} products`);
      console.log('Products:', data.data.products.products);
    }
  })
  .catch(error => {
    console.error('Fetch Error:', error);
  });

// Query with filters (search, brand, type)
fetch('http://localhost:3000/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query {
        products(filters: {
          brandId: "brand-1"
          search: "charm"
          type: "Charm"
          page: 1
          pageSize: 10
        }) {
          products {
            id
            name
            brand {
              name
            }
            price
            imageUrl
            type
          }
          totalCount
          hasMore
        }
      }
    `,
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('Filtered Products Result:', data);
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
    } else {
      console.log(`Found ${data.data.products.totalCount} matching products`);
    }
  })
  .catch(error => {
    console.error('Fetch Error:', error);
  });

// Get brands first (to get brand IDs)
fetch('http://localhost:3000/api/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query {
        brands {
          id
          name
          website
          productCount
        }
      }
    `,
  }),
})
  .then(res => res.json())
  .then(data => {
    console.log('Brands:', data);
    if (data.data?.brands) {
      console.log('Available brand IDs:', data.data.brands.map(b => b.id));
    }
  })
  .catch(error => {
    console.error('Fetch Error:', error);
  });

