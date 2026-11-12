# Contributing

Thanks for taking a look at the demo. This repository is a front-end prototype; contributions that improve clarity, accessibility or the completeness of the 22 requirement workflows are welcome.

## Development setup

1. Install Node.js 20.19+ (22 or 24 LTS recommended).
2. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Before opening a pull request, run:

   ```bash
   npm run lint
   npm run build
   ```

## Project conventions

- **BoardUI first.** Check `components/base/` and `components/application/` before building a new UI element. Install missing BoardUI components rather than writing lookalikes.
- **Semantic tokens only.** Do not use raw Tailwind palette classes, hex values or `dark:` overrides with literal colors.
- **Composite typography.** Use `text-title-*`, `text-body-*`, `text-caption-*` utilities rather than stacking font size and weight classes.
- **Use `cx()`** from `@/utils/cx` for conditional classes.
- **Keep state transitions in the reducer.** Pages should dispatch actions and derive display values through selectors.
- **Preserve the data model.** Stock is a SKU × location ledger; available quantity is `onHand - reserved`; movements are append-only.
- **Add requirement traceability.** If you add a workflow, update `src/data/requirements.ts` and `docs/REQUIREMENTS.md` where relevant.

## Commit style

Short, imperative summaries are preferred, for example:

```text
Add partial receipt validation
Fix packaging issue balance
Document role permissions
```

## Pull requests

Please include:

- What changed and why
- Which requirement IDs are affected
- How you tested it (browser, build, lint)
- Screenshots for visual changes when possible

## Reporting issues

Include the page, role, steps to reproduce, expected result and actual result. If the problem is data-related, mention whether you had reset the demo first.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
