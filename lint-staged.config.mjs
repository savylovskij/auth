export default {
  'apps/backend/**/*.ts': ['pnpm --filter backend exec eslint --fix', 'prettier --write'],
  'apps/frontend/**/*.{ts,html}': ['pnpm --filter frontend exec eslint --fix', 'prettier --write'],
  '**/*.{json,md,yml,yaml,css,scss,js,mjs,cjs}': 'prettier --write',
};
