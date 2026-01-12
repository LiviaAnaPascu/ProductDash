# Theme Customization Guide

This guide explains how to customize the Tailwind theme based on the [MMH Identity Experience Design](https://www.behance.net/gallery/240954433/MMH-Identity-Experience-Design).

## Quick Start

1. **Extract Design Tokens** from the Behance design:
   - Primary colors
   - Secondary colors
   - Typography (fonts, sizes, weights)
   - Spacing scale
   - Border radius values
   - Shadow styles

2. **Update `tailwind.config.ts`** with your design tokens

3. **Update `app/globals.css`** CSS variables if needed

## Color System

### Primary Colors

Update the `primary` color scale in `tailwind.config.ts`:

```typescript
primary: {
  50: '#f0f9ff',   // Lightest
  100: '#e0f2fe',
  // ... add your color values
  950: '#082f49',  // Darkest
}
```

**To extract colors from Behance:**
1. Open the design in your browser
2. Use browser dev tools or a color picker
3. Copy hex/rgb values
4. Map them to the appropriate shade (50-950)

### Secondary & Accent Colors

Follow the same pattern for:
- `secondary` colors
- `accent` colors
- `success`, `warning`, `error` (semantic colors)

## Typography

### Fonts

1. **Identify fonts** from the Behance design
2. **Add fonts** to your project (Google Fonts, local files, etc.)
3. **Update** `app/globals.css`:

```css
:root {
  --font-sans: 'Your Font Name', system-ui, sans-serif;
  --font-display: 'Your Display Font', system-ui, sans-serif;
}
```

4. **Update** `tailwind.config.ts`:

```typescript
fontFamily: {
  sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  display: ['var(--font-display)', 'system-ui', 'sans-serif'],
}
```

### Font Sizes

Adjust the `fontSize` scale in `tailwind.config.ts` to match the design system.

## Spacing & Layout

### Custom Spacing

Add custom spacing values if the design uses specific measurements:

```typescript
spacing: {
  '18': '4.5rem',  // Custom value
  '88': '22rem',
}
```

### Border Radius

Update `borderRadius` to match the design:

```typescript
borderRadius: {
  '4xl': '2rem',  // Custom radius
}
```

## Shadows

Customize shadows to match the design aesthetic:

```typescript
boxShadow: {
  'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07)',
  'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1)',
  'large': '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
}
```

## Applying the Theme

### Using Custom Colors

```tsx
// Primary color
<div className="bg-primary-500 text-primary-50">

// Secondary color
<div className="bg-secondary-200 text-secondary-900">

// Accent color
<button className="bg-accent-500 hover:bg-accent-600">
```

### Using Custom Components

Pre-built component classes are available:

```tsx
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<div className="card">Card Content</div>
<input className="input" />
```

## Dark Mode

Dark mode colors are defined in `app/globals.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --color-primary: #38bdf8;
  }
}
```

Update these values to match your design's dark mode palette.

## Example: Complete Theme Update

1. **Extract from Behance:**
   - Primary: `#0066FF`
   - Secondary: `#6B7280`
   - Font: `Inter`

2. **Update `tailwind.config.ts`:**
   ```typescript
   primary: {
     500: '#0066FF',
     600: '#0052CC',
     // ... build full scale
   }
   ```

3. **Update `app/globals.css`:**
   ```css
   --font-sans: 'Inter', system-ui, sans-serif;
   ```

4. **Use in components:**
   ```tsx
   <button className="bg-primary-500 hover:bg-primary-600">
   ```

## Resources

- [Tailwind CSS Customization](https://tailwindcss.com/docs/theme)
- [Design Token Extraction Tools](https://www.figma.com/community/plugins/tag/design-tokens)
- [Color Palette Generators](https://coolors.co/)

## Need Help?

If you need help extracting specific design tokens from the Behance design, provide:
- Screenshots of the design
- Specific color values you've identified
- Typography specifications
- Any design system documentation

