import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * eslint-config-next 16 ships native flat configs, so they are spread in
 * directly. Going through FlatCompat crashes on this version.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".test-build/**",
      "node_modules/**",
      "next-env.d.ts",
      "projects/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
