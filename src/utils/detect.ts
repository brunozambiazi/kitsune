/**
 * Heuristic auto-detection of text formats: JSON, XML, HTML, TOML, Properties, YAML.
 */
export type FileFormat = 'json' | 'xml' | 'html' | 'toml' | 'properties' | 'yaml' | 'markdown';

export function detectFormat(content: string): FileFormat {
  const trimmed = content.trim();
  if (!trimmed) return 'yaml'; // Default fallback

  // 1. JSON / TOML brackets
  if (trimmed.startsWith('{')) {
    return 'json';
  }
  if (trimmed.startsWith('[')) {
    // If the first line matches a TOML section header like [database] or [[items]]
    const firstLine = trimmed.split('\n')[0].trim();
    if (/^\[{1,2}[a-zA-Z0-9_\-.]+(?:\.[a-zA-Z0-9_\-.]+)*\]{1,2}$/.test(firstLine)) {
      return 'toml';
    }
    return 'json';
  }

  // 2. HTML / XML (starts with <)
  if (trimmed.startsWith('<')) {
    // HTML only if it starts with <html> tag (e.g. <html> or <html lang="en">)
    if (/^<html[\s>]/i.test(trimmed)) {
      return 'html';
    }
    return 'xml';
  }

  // 3. Properties (Java/INI style key=value or key:value without TOML or YAML structures)
  // Typically, properties files have flat keys, comments starting with # or !, and simple key=value pairs.
  // YAML has nested indentation and lists starting with "- ".
  // TOML has table headers like "[table]".
  if (trimmed.includes('[') && trimmed.includes(']')) {
    // Check if looks like TOML sections e.g. [database] or [[products]]
    const hasTomlSections = /^\s*\[{1,2}[a-zA-Z0-9_\-.]+\s*\]{1,2}/m.test(trimmed);
    if (hasTomlSections) {
      return 'toml';
    }
  }

  // Check for YAML list items (e.g. "\n- " or starts with "- ")
  const hasYamlLists = /^\s*-\s+\w+/m.test(trimmed);
  
  // Properties files use # or ! for comments. YAML uses #.
  // Let's count key-value pairs
  const lines = trimmed.split('\n');
  let propertiesScore = 0;
  let yamlScore = 0;
  let tomlScore = 0;

  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;

    // Check if line contains TOML/Properties assignment
    const equalsIdx = line.indexOf('=');
    const colonIdx = line.indexOf(':');

    if (equalsIdx > 0) {
      // Could be TOML (keys can be quoted, values can be objects/arrays/quotes) or Properties (flat)
      const value = line.substring(equalsIdx + 1).trim();
      
      // If it contains quotes, booleans, arrays, or numbers that are TOML syntax
      if (value.startsWith('"') || value.startsWith("'") || value.startsWith('[') || value.startsWith('{') || value === 'true' || value === 'false') {
        tomlScore++;
      } else {
        propertiesScore++;
      }
    } else if (colonIdx > 0) {
      // YAML uses "key: value" with space after colon. Properties can use "key:value" or "key = value"
      const afterColon = line.substring(colonIdx + 1);
      if (afterColon.startsWith(' ') || afterColon.startsWith('\n') || afterColon === '') {
        yamlScore++;
      } else {
        propertiesScore++;
      }
    }
  }

  if (hasYamlLists) yamlScore += 5;

  if (tomlScore > propertiesScore && tomlScore > yamlScore) {
    return 'toml';
  }
  if (yamlScore > propertiesScore) {
    return 'yaml';
  }
  if (propertiesScore > 0) {
    return 'properties';
  }

  return 'yaml'; // Fallback
}
