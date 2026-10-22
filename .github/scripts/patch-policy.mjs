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
    if (path.startsWith('/') || path.split('/').includes('..') || path.includes('\\') || path.includes('"') || isProtectedPath(path)) {
      throw new Error('Patch targets a protected or unsafe path; rejecting it.');
    }
    return path;
  });
  return paths;
}

export function validateBaseTreeModes(entries, paths) {
  const modes = new Map();
  for (const entry of Buffer.isBuffer(entries) ? entries.toString('utf8').split('\0') : String(entries).split('\0')) {
    if (!entry) continue;
    const separator = entry.indexOf('\t');
    if (separator < 0) throw new Error('Git returned malformed tree entries.');
    const metadata = entry.slice(0, separator).split(' ');
    if (metadata.length !== 3) throw new Error('Git returned malformed tree metadata.');
    modes.set(entry.slice(separator + 1), metadata[0]);
  }
  for (const path of paths) {
    const mode = modes.get(path);
    if (mode && mode !== '100644') {
      throw new Error('Patches may not modify symlinks, gitlinks, executable files, or special file modes.');
    }
  }
}

export function validatePatchText(patch) {
  const text = Buffer.isBuffer(patch) ? patch.toString('utf8') : String(patch);
  if (/^GIT binary patch$/m.test(text) || /^Binary files .* differ$/m.test(text)) {
    throw new Error('Binary patches are not supported.');
  }
  if (/^(?:old|new) mode \d{6}$/m.test(text)) {
    throw new Error('File mode changes are not supported.');
  }
  for (const match of text.matchAll(/^(?:new file mode|deleted file mode) (\d{6})$/gm)) {
    if (match[1] !== '100644') throw new Error('Symlinks, gitlinks, executable files, and special file modes are not supported.');
  }

  const sections = text.split(/(?=^diff --git )/m);
  for (const section of sections) {
    const header = section.match(/^diff --git a\/([^\n]+?) b\/([^\n]+)$/m);
    if (!header) continue;
    const filePath = header[2];
    if (/\.csproj$/i.test(filePath) && /^[+-].*<(?:Target|UsingTask|Import|Exec)\b/im.test(section)) {
      throw new Error('MSBuild execution target changes are not supported.');
    }
  }
  return text;
}

export function validatePackageScriptsUnchanged(originalText, updatedText) {
  let original;
  let updated;
  try {
    original = originalText ? JSON.parse(originalText) : {};
    updated = updatedText ? JSON.parse(updatedText) : {};
  } catch {
    throw new Error('Changed package.json must remain valid JSON.');
  }
  if (JSON.stringify(original.scripts ?? null) !== JSON.stringify(updated.scripts ?? null)) {
    throw new Error('package.json script changes are not supported.');
  }
}
