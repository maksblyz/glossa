import katex from 'katex';

// Helper to render KaTeX math in HTML string
export default function renderMath(html: string) {
  // display: $$ … $$  OR  \[ … \]
  html = html
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => katex.renderToString(m, { displayMode: true, throwOnError: false }))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => katex.renderToString(m, { displayMode: true, throwOnError: false }));

  // inline: $ … $  OR  \( … \)
  html = html
    .replace(/\$([^$]+?)\$/g, (_, m) => katex.renderToString(m, { displayMode: false, throwOnError: false }))
    .replace(/\\\(([^\)]+?)\\\)/g, (_, m) => katex.renderToString(m, { displayMode: false, throwOnError: false }));

  return { __html: html };
} 