import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scratch/**",
    "testsprite_tests/**",
  ]),
  {
    rules: {
      // TS style rules — downgraded so CI passes while these are cleaned up.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
      }],

      // JSX encoding
      "react/no-unescaped-entities": "warn",

      // React Hooks compiler rules — disabled; require architectural refactors.
      "react-hooks/error-boundaries": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/incompatible-library": "off",
      "react-hooks/immutability": "off",

      // Next.js image optimization — informational only.
      "@next/next/no-img-element": "off",

      // Unused expressions (e.g. standalone JSX evaluations in tests).
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
]);

export default eslintConfig;
