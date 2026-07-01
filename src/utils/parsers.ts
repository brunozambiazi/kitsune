import { parse as parseYaml } from 'yaml';
import { parse as parseToml } from 'smol-toml';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { FileFormat } from './detect';

export interface ParseResult {
  isValid: boolean;
  error?: string;
  parsed?: any;
}

/**
 * Parses and validates JSON content. Supports stripping comments if present.
 */
export function parseJSON(content: string): ParseResult {
  try {
    // Attempt standard parse
    const parsed = JSON.parse(content);
    return { isValid: true, parsed };
  } catch (err: any) {
    // If it fails, check if stripping comments helps (JSON with comments)
    try {
      const clean = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
      const parsed = JSON.parse(clean);
      return { 
        isValid: true, 
        parsed,
        error: 'Note: Content parsed successfully after removing non-standard comments.'
      };
    } catch {
      return { isValid: false, error: err.message || 'Invalid JSON syntax' };
    }
  }
}

/**
 * Parses and validates YAML content.
 */
export function parseYAML(content: string): ParseResult {
  try {
    const parsed = parseYaml(content);
    if (parsed === undefined || parsed === null) {
      return { isValid: false, error: 'Empty YAML content' };
    }
    return { isValid: true, parsed };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Invalid YAML syntax' };
  }
}

/**
 * Parses and validates TOML content.
 */
export function parseTOML(content: string): ParseResult {
  try {
    const parsed = parseToml(content);
    return { isValid: true, parsed };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Invalid TOML syntax' };
  }
}

/**
 * Parses and validates XML content.
 */
export function parseXML(content: string): ParseResult {
  const validation = XMLValidator.validate(content);
  if (validation !== true) {
    const err = (validation as any).err;
    const errorMsg = err 
      ? `Error at line ${err.line}, col ${err.col}: ${err.msg}`
      : 'Invalid XML structure';
    return { isValid: false, error: errorMsg };
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });
    const parsed = parser.parse(content);
    return { isValid: true, parsed };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Failed to parse XML content' };
  }
}

/**
 * Parses and validates Java Properties content.
 */
export function parseProperties(content: string): ParseResult {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  let i = 0;

  try {
    while (i < lines.length) {
      let line = lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        i++;
        continue;
      }

      // Handle line continuation (ends with backslash but not escaped backslash)
      while (line.endsWith('\\') && !line.endsWith('\\\\') && i + 1 < lines.length) {
        // Remove trailing backslash and append next line
        line = line.slice(0, -1) + lines[i + 1].trimStart();
        i++;
      }

      // Find first unescaped separator (= or :)
      let separatorIdx = -1;
      let escaped = false;
      for (let j = 0; j < line.length; j++) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (line[j] === '\\') {
          escaped = true;
          continue;
        }
        if (line[j] === '=' || line[j] === ':') {
          separatorIdx = j;
          break;
        }
      }

      let key = '';
      let value = '';
      if (separatorIdx !== -1) {
        key = line.substring(0, separatorIdx);
        value = line.substring(separatorIdx + 1);
      } else {
        // If there's no separator, the whole line is the key and value is empty
        key = line;
        value = '';
      }

      // Clean up key (can be separated by spaces if no separator character exists)
      key = decodePropertiesString(key.trim());
      value = decodePropertiesString(value.trim());

      result[key] = value;
      i++;
    }
    return { isValid: true, parsed: result };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Invalid Properties syntax' };
  }
}

function decodePropertiesString(str: string): string {
  // Validate unicode escape sequences (\uXXXX)
  const invalidUnicodeMatch = str.match(/\\u([0-9a-fA-F]{0,3})(?![0-9a-fA-F])/);
  if (invalidUnicodeMatch) {
    throw new Error(`Invalid unicode escape sequence: \\u${invalidUnicodeMatch[1]}`);
  }

  return str.replace(/\\(t|r|n|f|u[0-9a-fA-F]{4}|.)/g, (_match, p1) => {
    if (p1 === 't') return '\t';
    if (p1 === 'r') return '\r';
    if (p1 === 'n') return '\n';
    if (p1 === 'f') return '\f';
    if (p1.startsWith('u')) {
      const hex = p1.substring(1);
      return String.fromCharCode(parseInt(hex, 16));
    }
    return p1; // unescape other escaped chars like \=, \:, \!
  });
}

/**
 * Validates HTML tags (matching and self-closing tags)
 */
export function parseHTML(content: string): ParseResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Empty HTML content' };
  }

  // HTML Void elements that do not require closing tags
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'source', 'track', 'wbr'
  ]);

  const stack: { tag: string; line: number }[] = [];
  
  // Find lines to track errors
  const getLineNumber = (index: number) => {
    return content.substring(0, index).split('\n').length;
  };

  // Tag matcher: captures tags e.g. <div class="..."> or </div>
  const tagRegex = /<(\/?[a-zA-Z][a-zA-Z0-9:-]*)(?:\s+[^>]*)?>/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const tagNameWithSlash = match[1];
    const index = match.index;
    const line = getLineNumber(index);

    // Skip self-closing tags like <img />
    if (fullTag.endsWith('/>')) {
      continue;
    }

    if (tagNameWithSlash.startsWith('/')) {
      // Closing tag
      const tagName = tagNameWithSlash.slice(1).toLowerCase();
      if (voidElements.has(tagName)) {
        continue; // void elements should not have closing tags, but we'll ignore them if they do
      }

      if (stack.length === 0) {
        return { isValid: false, error: `Mismatched closing tag </${tagName}> at line ${line} (no matching open tag)` };
      }

      const top = stack.pop()!;
      if (top.tag !== tagName) {
        return { 
          isValid: false, 
          error: `Mismatched closing tag </${tagName}> at line ${line}. Expected </${top.tag}> to match the open tag from line ${top.line}.` 
        };
      }
    } else {
      // Opening tag
      const tagName = tagNameWithSlash.toLowerCase();
      if (!voidElements.has(tagName)) {
        stack.push({ tag: tagName, line });
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack.map(s => `<${s.tag}> (line ${s.line})`).join(', ');
    return { isValid: false, error: `Unclosed tags detected: ${unclosed}` };
  }

  return { isValid: true, parsed: content };
}

/**
 * Universal parse entrypoint
 */
export function validateAndParse(content: string, format: FileFormat): ParseResult {
  switch (format) {
    case 'json':
      return parseJSON(content);
    case 'xml':
      return parseXML(content);
    case 'yaml':
      return parseYAML(content);
    case 'toml':
      return parseTOML(content);
    case 'properties':
      return parseProperties(content);
    case 'html':
      return parseHTML(content);
    default:
      return { isValid: false, error: 'Unknown format' };
  }
}
