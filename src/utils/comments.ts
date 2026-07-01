import type { FileFormat } from './detect';

/**
 * Removes comments from the pasted text based on the file format.
 * Returns the cleaned string.
 */
export function removeComments(content: string, format: FileFormat): string {
  switch (format) {
    case 'json':
      // Remove double-slash (//) and block (/* */) comments
      return content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

    case 'xml':
    case 'html':
      // Remove XML/HTML comments (<!-- -->)
      return content.replace(/<!--[\s\S]*?-->/g, '');

    case 'properties': {
      // Remove full-line comments starting with # or !
      const propLines = content.split(/\r?\n/);
      return propLines
        .filter(line => {
          const trimmed = line.trim();
          return !trimmed.startsWith('#') && !trimmed.startsWith('!');
        })
        .join('\n');
    }

    case 'yaml':
    case 'toml': {
      // Remove full-line and inline hash comments safely
      const lines = content.split(/\r?\n/);
      return lines
        .map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('#')) {
            return ''; // Strip full line comment
          }
          return stripInlineHashComment(line);
        })
        .filter((line, index) => {
          // Keep empty lines for spacing, unless it was a full line comment that got completely stripped
          if (line === '' && lines[index].trim() !== '') {
            return false;
          }
          return true;
        })
        .join('\n');
    }

    default:
      return content;
  }
}

/**
 * Safely strips inline hash (#) comments, ignoring hashes inside quotes.
 */
function stripInlineHashComment(line: string): string {
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '#' && !inDoubleQuote && !inSingleQuote) {
      // Found comment starting at index i
      return line.substring(0, i).trimEnd();
    }
  }
  
  return line;
}
