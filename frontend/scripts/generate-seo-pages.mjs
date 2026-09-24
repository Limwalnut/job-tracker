import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const distRoot = path.join(frontendRoot, 'dist');
const sourceHtml = await readFile(path.join(distRoot, 'index.html'), 'utf8');

const pages = [
  {
    path: 'privacy',
    title: 'Privacy Policy | Applyline',
    description: 'Learn how Applyline collects, uses and protects account and job-search information.',
  },
  {
    path: 'terms',
    title: 'Terms of Service | Applyline',
    description: 'Read the terms that apply when you create an account or use Applyline.',
  },
];

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function replaceOne(html, expression, replacement, label) {
  const matches = html.match(expression);
  if (!matches || matches.length !== 1) {
    throw new Error(`Expected exactly one ${label} in frontend/dist/index.html`);
  }
  return html.replace(expression, replacement);
}

for (const page of pages) {
  const title = escapeAttribute(page.title);
  const description = escapeAttribute(page.description);
  const canonical = `https://applyline.app/${page.path}`;
  let html = sourceHtml;

  html = replaceOne(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, 'title');
  html = replaceOne(
    html,
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`,
    'description meta tag',
  );
  html = replaceOne(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${canonical}" />`,
    'canonical link',
  );
  html = replaceOne(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${canonical}" />`,
    'Open Graph URL meta tag',
  );
  html = replaceOne(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${title}" />`,
    'Open Graph title meta tag',
  );
  html = replaceOne(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${description}" />`,
    'Open Graph description meta tag',
  );
  html = replaceOne(
    html,
    /<meta name="twitter:title" content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${title}" />`,
    'Twitter title meta tag',
  );
  html = replaceOne(
    html,
    /<meta name="twitter:description" content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${description}" />`,
    'Twitter description meta tag',
  );

  const outputDirectory = path.join(distRoot, page.path);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), html);
}
