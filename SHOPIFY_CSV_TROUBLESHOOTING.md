# Shopify CSV Import Troubleshooting

## Issue: Products Upload Successfully But Don't Appear in Dashboard

If Shopify says the import completed but you can't see products, check the following:

### 1. Check Product Status

**In Shopify Admin:**
- Go to **Products** → Check the filter dropdown
- Make sure you're viewing **All products** (not just "Active" or "Draft")
- Check if products are in **Draft** status

**Common causes:**
- Products might be created as drafts
- Products might be archived
- Products might be filtered out

### 2. Verify Required Fields

Shopify requires these fields to be valid:

- ✅ **Title** - Must not be empty
- ✅ **Variant Price** - Must be > 0 (we default to 0.01 if missing)
- ✅ **Handle** - Must be unique and valid
- ✅ **Vendor** - Should be a valid brand name (not an ID)

### 3. Check for Validation Errors

**In Shopify Admin:**
1. Go to **Settings** → **Import**
2. Check the import history
3. Look for any error messages or warnings
4. Download the error report if available

### 4. Common Issues and Fixes

#### Issue: Empty Vendor Field
**Symptom:** Vendor shows as "brand-1" or empty
**Fix:** ✅ Fixed - Now uses actual brand name

#### Issue: Missing or Zero Price
**Symptom:** Products have $0.00 or empty price
**Fix:** ✅ Fixed - Now defaults to 0.01 if price is missing

#### Issue: Invalid Handle
**Symptom:** Handle contains invalid characters
**Fix:** ✅ Fixed - Handles are generated from product names

#### Issue: Missing Inventory Quantity
**Symptom:** Inventory Qty is empty
**Fix:** ✅ Fixed - Now defaults to '0'

### 5. Verify CSV Format

Check your exported CSV file:

```bash
# View the first few lines
head -5 exports/products-export-*.csv
```

**Required columns should be present:**
- Handle
- Title
- Variant Price (must have a value > 0)
- Vendor (should be brand name, not ID)
- Variant Inventory Policy (deny or continue)

### 6. Test with a Single Product

Try exporting and importing just ONE product to isolate the issue:

1. Select only one product
2. Export CSV
3. Upload to Shopify
4. Check if it appears

### 7. Check Shopify Import Settings

When importing in Shopify:
- Make sure you're importing to the correct store
- Check if there are any import rules or filters applied
- Verify you have permission to create products

### 8. Manual Verification

Open your CSV file and check:

1. **Prices are valid:**
   ```csv
   Variant Price
   79.00  ✅ Good
   0.00   ❌ Bad (will cause issues)
   (empty) ❌ Bad
   ```

2. **Vendor is a name, not ID:**
   ```csv
   Vendor
   Morellato  ✅ Good
   brand-1    ❌ Bad
   ```

3. **Handles are unique:**
   - Each product should have a unique handle
   - Handles should be URL-friendly (lowercase, hyphens)

4. **Required fields are present:**
   - Title: Not empty
   - Variant Price: > 0
   - Variant Inventory Policy: "deny" or "continue"

### 9. Shopify-Specific Requirements

- **Price format:** Must be a number with up to 2 decimal places (e.g., "79.00")
- **Inventory:** If using "shopify" tracker, quantity must be set
- **Published:** "TRUE" means published, "FALSE" means draft
- **Images:** Image URLs must be accessible (not broken links)

### 10. Debug Steps

1. **Export a test CSV:**
   - Select 1-2 products
   - Export CSV
   - Open in Excel/Google Sheets
   - Verify all fields look correct

2. **Check Shopify import log:**
   - Go to Settings → Import
   - Look for the import you just did
   - Check for any errors or warnings

3. **Try manual product creation:**
   - Create one product manually in Shopify
   - Compare the fields with your CSV
   - See what's different

4. **Check product visibility:**
   - In Shopify, go to Products
   - Use filters: Status = All, Collection = All
   - Search for your product by name

### 11. Common Shopify Dashboard Filters

Products might be hidden due to:
- **Status filter:** Only showing "Active" (check "Draft" and "Archived")
- **Collection filter:** Products not in any collection
- **Search filter:** Search term doesn't match
- **Inventory filter:** Showing only "In stock" (check "Out of stock")

### 12. If Still Not Working

1. **Check Shopify's import error report:**
   - Shopify usually provides a detailed error report
   - Download and review it

2. **Verify CSV encoding:**
   - File should be UTF-8 with BOM (we add this automatically)
   - Open in a text editor to verify

3. **Test with Shopify's sample CSV:**
   - Download Shopify's sample CSV
   - Compare structure with yours
   - See what fields are different

4. **Contact Shopify Support:**
   - They can check your import logs
   - They can see why products aren't appearing

## Quick Checklist

Before uploading to Shopify, verify:

- [ ] CSV has UTF-8 BOM encoding
- [ ] All products have a Title
- [ ] All products have Variant Price > 0
- [ ] Vendor field contains brand names (not IDs)
- [ ] Handles are unique and valid
- [ ] Variant Inventory Policy is "deny" or "continue"
- [ ] Published is "TRUE" for products you want visible
- [ ] Image URLs are accessible

## Recent Fixes Applied

✅ **Brand Name:** Now uses actual brand name instead of brand ID  
✅ **Price Default:** Defaults to 0.01 if price is missing (Shopify requires > 0)  
✅ **Inventory Qty:** Defaults to '0' if missing  
✅ **Variant Grams:** Defaults to '0' if missing  
✅ **Validation:** Skips products without names

Try exporting again with these fixes!
