# YNAB Monthly Reset

This pack analyzes one month of budget data and generates:

- A short narrative summary of spending patterns
- Priority categories to fix first
- Suggested category targets for next month

## Intended audience

Personal users who already track spending in YNAB and want a recurring monthly review flow.

## Runtime behavior

- Default mode is read/analysis only
- No side effects are executed
- Approval mode defaults to `ask`

## Testing

Run locally with fixture data:

```bash
pnpm operator pack test config/packs/examples/ynab-monthly-reset
```
