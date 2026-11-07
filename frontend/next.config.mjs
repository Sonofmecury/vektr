export default {
  output: process.env.STATIC_EXPORT === "1" ? "export" : undefined,
  trailingSlash: process.env.STATIC_EXPORT === "1",
  env: {NEXT_PUBLIC_PUBLIC_DEMO: process.env.STATIC_EXPORT === "1" ? "true" : "false"},
  turbopack: {root: process.cwd()},
};
