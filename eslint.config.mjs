import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**", "public/sw.js", "public/vendor/**", "next-env.d.ts", ".data/**", "screenshots/**", "AGENTS.md"],
  },
];

export default config;
