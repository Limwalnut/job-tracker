import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendRoot = fileURLToPath(new URL('..', import.meta.url));
const distRoot = path.join(frontendRoot, 'dist');
const serverRoot = path.join(frontendRoot, 'dist-ssr');
const sourceHtml = await readFile(path.join(distRoot, 'index.html'), 'utf8');
const { render } = await import(path.join(serverRoot, 'entry-server.js'));

const pages = [
  {
    path: '/',
    title: 'Applyline — Job Application Tracker',
    description: 'Applyline is a job application tracker for organizing roles, application stages, interview schedules, notes and follow-ups in one place.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Applyline',
    description: 'Learn how Applyline collects, uses and protects account and job-search information.',
  },
  {
    path: '/terms',
    title: 'Terms of Service | Applyline',
    description: 'Read the terms that apply when you create an account or use Applyline.',
  },
  {
    path: '/guide/job-application-tracking',
    title: 'How to Track Job Applications | Applyline',
    description: 'A practical way to track job applications, interviews and follow-ups without losing the details behind each opportunity.',
  },
];

const spaShell = replaceOne(
  replaceOne(
    sourceHtml,
    /<meta name="robots" content="[^"]*"\s*\/>/,
    '<meta name="robots" content="noindex, nofollow" />',
    'robots meta tag',
  ),
  /\s*<link rel="canonical" href="[^"]*"\s*\/>/,
  '',
  'canonical link',
);
await writeFile(path.join(distRoot, 'spa-shell.html'), spaShell);

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
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
  const canonical = `https://applyline.app${page.path === '/' ? '/' : page.path}`;
  let html = sourceHtml;

  html = replaceOne(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, 'title');
  html = replaceOne(
    html,
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`,
    'description meta tag',
  );
  html = replaceOne(html, /<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}" />`, 'canonical link');
  html = replaceOne(html, /<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonical}" />`, 'Open Graph URL meta tag');
  html = replaceOne(html, /<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`, 'Open Graph title meta tag');
  html = replaceOne(html, /<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`, 'Open Graph description meta tag');
  html = replaceOne(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${title}" />`, 'Twitter title meta tag');
  html = replaceOne(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${description}" />`, 'Twitter description meta tag');

  const body = render(page.path);
  if (!body.trim()) throw new Error(`SSR returned empty body for ${page.path}`);
  html = replaceOne(
    html,
    '<div id="root"></div>',
    `<div id="root" data-prerendered-path="${page.path}">${body}</div>`,
    'root mount point',
  );

  const outputDirectory = page.path === '/'
    ? distRoot
    : path.join(distRoot, page.path.slice(1));
  if (page.path !== '/') await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), html);
}

await rm(serverRoot, { recursive: true, force: true });
