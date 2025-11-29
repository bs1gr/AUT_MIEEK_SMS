// Type declarations for JS locale modules so tsc can import them as records
declare module './locales/*/*' {
  const value: Record<string, string>;
  export default value;
}

// Generic fallback for any locale path
declare module './locales/*' {
  const value: Record<string, string> | Record<string, Record<string, string>>;
  export default value;
}
// Allow importing locale JS files without TypeScript declaration files.
// The frontend translations use plain .js files under src/locales/en and src/locales/el.
// Without a declaration, TypeScript reports TS7016. This file provides a safe
// ambient module declaration so tsc treats those imports as 'any'.

// Wildcard matches for imports like './locales/en/controlPanel' (no extension)
declare module './locales/*/*' {
  const contents: { [key: string]: any };
  export default contents;
}

// Support alternative relative import forms
declare module '../locales/*/*' {
  const contents: { [key: string]: any };
  export default contents;
}

// Generic catch-all for plain JS imports (files without a .d.ts)
declare module '*.js' {
  const value: any;
  export default value;
}

// Support imports via absolute aliases (e.g., '@/locales/en/...') if used
declare module '@/locales/*/*' {
  const contents: { [key: string]: any };
  export default contents;
}
