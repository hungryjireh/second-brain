## Working agreements

- Always respond in English, regardless of the language of any code comments,
  variable names, error messages, or documentation you encounter.
  Never switch to Chinese or any other language.
- Always run `npm test` after modifying JavaScript files. Thereafter, if there are no errors, always proceed to run `pnpm eslint` and proceed to fix any linting errors if any. If tests and lint pass, proceed to fix any prettier errors if any. Do not run `npm test` and do not check any lint errors again if any prettier errors are fixed.
- Prefer `pnpm` when installing dependencies.
- Ask for confirmation before adding new production dependencies.
- Never do type coercions. Fix upstream to ensure the correct data type is being returned.
