import katex from 'katex';

// Helper to render KaTeX math in HTML string, supporting inline and display math
export default function renderMath(text: string) {
  if (!text) return { __html: '' };

  // Replace display math: $$...$$ and \[ ... \]
  const displayMathRe = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g;
  // Replace inline math: $...$ and \( ... \)
  const inlineMathRe = /\$(.+?)\$|\\\((.+?)\\\)/g;

  // First, handle display math (so we don't double-process)
  let html = text.replace(displayMathRe, (_, m1, m2) => {
    const latex = (m1 || m2 || '').trim();
    try {
      if (typeof window !== 'undefined') {
        console.log('Rendering display LaTeX:', latex);
      }
      return katex.renderToString(latex, { displayMode: true, throwOnError: false });
    } catch (e) {
      console.error('KaTeX display error:', e, latex);
      return `<span class="katex-error">$$${latex}$$</span>`;
    }
  });

  // Then, handle inline math
  html = html.replace(inlineMathRe, (_, m1, m2) => {
    const latex = (m1 || m2 || '').trim();
    try {
      if (typeof window !== 'undefined') {
        console.log('Rendering inline LaTeX:', latex);
      }
      return katex.renderToString(latex, { displayMode: false, throwOnError: false });
    } catch (e) {
      console.error('KaTeX inline error:', e, latex);
      return `<span class="katex-error">$${latex}$</span>`;
    }
  });

  return { __html: html };
}
