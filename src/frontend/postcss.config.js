export default {
  plugins: {
    '@tailwindcss/postcss': {},
    // Tailwind 4 prefixes its own output; this keeps the component stylesheets
    // (notifications, analytics, dashboard) prefixed as they were under Tailwind 3.
    autoprefixer: {},
  },
}
