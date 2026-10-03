import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", ".public-build/**", "node_modules/**", "data/**", "test-results/**"]),
  { rules: { "@next/next/no-img-element": "off" } },
]);
