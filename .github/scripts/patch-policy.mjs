import { createHash } from 'node:crypto';
import { isProtectedPath } from './review-policy.mjs';

export function verifyPatchDigest(patch, expectedDigest) {
  const actual = createHash('sha256').update(patch).digest('hex');
  if (!/^[a-f0-9]{64}$/i.test(expectedDigest ?? '') || actual !== expectedDigest.toLowerCase()) {
    throw new Error('Patch digest does not match the model job output; refusing to validate or publish it.');
  }
  return actual;
}

export function parseAndValidatePatchNumstat(numstat) {
  const lines = String(numstat).trimEnd().split('\n').filter(Boolean);
  if (!lines.length) throw new Error('Patch has no supported text changes.');
  const paths = lines.map((line) => {
    const match = line.match(/^(\d+)\t(\d+)\t([^\t\r\n]+)$/);
    if (!match) throw new Error('Patch contains an unsupported file path or binary change.');
    const path = match[3];
    if (path.startsWith('/') || path.split('/').includes('..') || path.includes('\\') || isProtectedPath(path)) {
      throw new Error('Patch targets a protected or unsafe path; rejecting it.');
    }
    return path;
  });
  return paths;
}
