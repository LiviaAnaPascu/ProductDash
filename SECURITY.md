# Security Notes

## Package Updates

### Deprecated Packages (Non-Critical)

1. **Apollo Server v4** - Deprecated, will EOL on January 26, 2026
   - Current version: `^4.12.2`
   - Status: Still functional, but should plan migration to v5
   - Action: Monitor for v5 migration guide

2. **ESLint v8** - Deprecated
   - Current version: `^8.57.1`
   - Status: Latest v8.x, stable for now
   - Action: Can upgrade to v9 when ready (has breaking changes)

### Security Vulnerabilities

Run `npm audit` to see current vulnerabilities. To fix:

```bash
# Fix non-breaking vulnerabilities
npm audit fix

# Review and fix manually if needed
npm audit
```

### Recommended Actions

1. **Immediate**: Run `npm audit fix` to auto-fix non-breaking vulnerabilities
2. **Short-term**: Monitor Apollo Server v5 migration path
3. **Medium-term**: Plan ESLint v9 upgrade (test thoroughly)
4. **Ongoing**: Keep dependencies updated regularly

## Notes

- Deprecation warnings are informational and don't break functionality
- High severity vulnerabilities should be addressed promptly
- Always test after running `npm audit fix --force` as it may introduce breaking changes

