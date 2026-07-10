import { describe, it, expect } from 'vitest';
import { detectFormat } from './detect';
import { validateAndParse } from './parsers';
import { removeComments } from './comments';
import { convertFormat } from './converters';
import { calculateDiff } from './diff';
import { formatMarkdown } from './markdownFormatter';

describe('Format Auto-detection', () => {
  it('should detect JSON', () => {
    expect(detectFormat('{\n  "name": "Kitsune"\n}')).toBe('json');
    expect(detectFormat('[\n  1, 2, 3\n]')).toBe('json');
  });

  it('should detect XML and HTML', () => {
    expect(detectFormat('<?xml version="1.0"?>\n<root></root>')).toBe('xml');
    expect(detectFormat('<html><body>Hello</body></html>')).toBe('html');
    expect(detectFormat('<html lang="en"><div>Hello</div></html>')).toBe('html');
    expect(detectFormat('<!DOCTYPE html>\n<html></html>')).toBe('xml');
    expect(detectFormat('<div>Hello</div>')).toBe('xml');
  });

  it('should detect TOML vs Properties vs YAML', () => {
    expect(detectFormat('[database]\nserver = "192.168.1.1"')).toBe('toml');
    expect(detectFormat('database.server = 192.168.1.1\ndatabase.port: 3306')).toBe('properties');
    expect(detectFormat('database:\n  server: 192.168.1.1\n  port: 3306')).toBe('yaml');
    expect(detectFormat('- item1\n- item2')).toBe('yaml');
  });
});

describe('Comments Stripping', () => {
  it('should strip JS-style comments from JSON', () => {
    const raw = '{\n  // this is a comment\n  "port": 8080 /* block comment */\n}';
    const cleaned = removeComments(raw, 'json');
    expect(cleaned).toContain('"port": 8080');
    expect(cleaned).not.toContain('comment');
  });

  it('should strip HTML/XML comments', () => {
    const raw = '<!-- comment --><div>Hello</div>';
    const cleaned = removeComments(raw, 'html');
    expect(cleaned).toBe('<div>Hello</div>');
  });

  it('should strip full-line comments and preserve inline comments safely in TOML/YAML', () => {
    const raw = '# Full line comment\nkey = "value" # inline comment\nurl = "http://site.com#anchor"';
    const cleaned = removeComments(raw, 'toml');
    const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
    expect(lines[0]).toBe('key = "value"');
    expect(lines[1]).toBe('url = "http://site.com#anchor"'); // hash in quotes is preserved
  });
});

describe('Java Properties Parsing', () => {
  it('should parse simple properties', () => {
    const raw = 'db.user = admin\ndb.pass : secret\nempty-val';
    const result = validateAndParse(raw, 'properties');
    expect(result.isValid).toBe(true);
    expect(result.parsed).toEqual({
      'db.user': 'admin',
      'db.pass': 'secret',
      'empty-val': ''
    });
  });

  it('should handle escape sequences and line continuations', () => {
    const raw = 'key = value\\\ncontinued\nescaped = text\\nnewline\\ttab';
    const result = validateAndParse(raw, 'properties');
    expect(result.isValid).toBe(true);
    expect(result.parsed['key']).toBe('valuecontinued');
    expect(result.parsed['escaped']).toBe('text\nnewline\ttab');
  });

  it('should reject invalid unicode sequences', () => {
    const raw = 'key = \\u12';
    const result = validateAndParse(raw, 'properties');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid unicode escape sequence');
  });
});

describe('Cross-Format Conversions', () => {
  it('should convert JSON to YAML and back', () => {
    const json = '{\n  "app": "kitsune",\n  "enabled": true\n}';
    const toYaml = convertFormat(json, 'json', 'yaml');
    expect(toYaml.success).toBe(true);
    expect(toYaml.output).toContain('app: kitsune');
    
    const backToJson = convertFormat(toYaml.output!, 'yaml', 'json');
    expect(backToJson.success).toBe(true);
    const parsed = JSON.parse(backToJson.output!);
    expect(parsed.app).toBe('kitsune');
    expect(parsed.enabled).toBe(true);
  });

  it('should flatten nested structures for Properties', () => {
    const json = '{\n  "db": {\n    "host": "localhost",\n    "ports": [3306, 3307]\n  }\n}';
    const toProp = convertFormat(json, 'json', 'properties');
    expect(toProp.success).toBe(true);
    expect(toProp.output).toContain('db.host = localhost');
    expect(toProp.output).toContain('db.ports.0 = 3306');
    expect(toProp.output).toContain('db.ports.1 = 3307');
  });

  it('should unflatten Properties into objects', () => {
    const prop = 'server.config.port = 80\nserver.config.host = local';
    const toJson = convertFormat(prop, 'properties', 'json');
    expect(toJson.success).toBe(true);
    const parsed = JSON.parse(toJson.output!);
    expect(parsed).toEqual({
      server: {
        config: {
          port: '80',
          host: 'local'
        }
      }
    });
  });

  it('should sanitize nulls and warn for TOML conversion', () => {
    const json = '{\n  "empty": null,\n  "mixed": [1, "two"]\n}';
    const toToml = convertFormat(json, 'json', 'toml');
    expect(toToml.success).toBe(true);
    expect(toToml.warnings.length).toBeGreaterThan(0);
    expect(toToml.output).not.toContain('empty'); // null is dropped
    expect(toToml.output).toContain('mixed = [ "1", "two" ]'); // cast to strings
  });
});

describe('Focused Line Diffing', () => {
  it('should compare identical content', () => {
    const txt = 'line 1\nline 2\nline 3';
    const diff = calculateDiff(txt, txt);
    // Identical files return skipped line node spanning all 3 lines
    expect(diff.length).toBe(1);
    expect(diff[0].type).toBe('skipped');
    expect(diff[0].skippedCount).toBe(3);
  });

  it('should compute and context-filter lines with differences', () => {
    const oldTxt = 'line 1\nline 2\nline 3\nline 4\nline 5';
    const newTxt = 'line 1\nline 2\nline modified\nline 4\nline 5';
    const diff = calculateDiff(oldTxt, newTxt);
    
    // We expect:
    // - skipped node (line 1 skipped, but line 2 is kept as context)
    // - unchanged line 2 (preceding context)
    // - removed line 3 (old line)
    // - added line 3 (new line)
    // - unchanged line 4 (following context)
    // - skipped node (line 5 skipped)
    
    expect(diff.some(l => l.type === 'removed' && l.content === 'line 3')).toBe(true);
    expect(diff.some(l => l.type === 'added' && l.content === 'line modified')).toBe(true);
    expect(diff.some(l => l.type === 'skipped')).toBe(true);
    
    // Unchanged line 2 (context) is present
    expect(diff.some(l => l.type === 'unchanged' && l.content === 'line 2')).toBe(true);
    // Unchanged line 5 is skipped, so not directly in output as 'unchanged'
    expect(diff.some(l => l.type === 'unchanged' && l.content === 'line 5')).toBe(false);
  });
});

describe('Markdown Formatting', () => {
  it('should format headings, lists, blockquotes, and collapse empty lines', () => {
    const raw = `
#Heading 1
Some paragraph text.

##Heading 2
-List item 1
-List item 2
•List item 3
• List item 4

>Quote text
>More quote
`;
    const expected = `# Heading 1
Some paragraph text.

## Heading 2
- List item 1
- List item 2
- List item 3
- List item 4

> Quote text
> More quote`;
    expect(formatMarkdown(raw)).toBe(expected);
  });

  it('should ignore formatting inside code blocks', () => {
    const raw = `
# Head
\`\`\`javascript
const x = 1;
# No heading format here
- No list item format
\`\`\`
`;
    const expected = `# Head

\`\`\`javascript
const x = 1;
# No heading format here
- No list item format
\`\`\``;
    expect(formatMarkdown(raw)).toBe(expected);
  });

  it('should replace literal \\n with actual newlines', () => {
    const raw = '# Title\\n\\nThis is a paragraph.\\n- List item 1\\n- List item 2';
    const expected = `# Title

This is a paragraph.
- List item 1
- List item 2`;
    expect(formatMarkdown(raw)).toBe(expected);
  });
});
