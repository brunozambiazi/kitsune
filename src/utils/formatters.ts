import { stringify as stringifyYaml } from 'yaml';
import { stringify as stringifyToml } from 'smol-toml';
import { XMLBuilder } from 'fast-xml-parser';
import type { FileFormat } from './detect';
import { validateAndParse } from './parsers';
import { formatMarkdown } from './markdownFormatter';

/**
 * Formats (prettifies) the content based on type and indent size.
 */
export function prettify(content: string, format: FileFormat, indentSize: number): string {
  const indentChar = ' '.repeat(indentSize);
  const parseResult = validateAndParse(content, format);
  if (!parseResult.isValid) {
    throw new Error(parseResult.error || 'Failed to parse content before formatting');
  }

  const data = parseResult.parsed;

  switch (format) {
    case 'json':
      return JSON.stringify(data, null, indentSize);

    case 'yaml':
      return stringifyYaml(data, { indent: indentSize });

    case 'toml':
      // smol-toml outputs formatted string automatically
      return stringifyToml(data);

    case 'xml': {
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        format: true,
        indentBy: indentChar
      });
      return builder.build(data).trim();
    }

    case 'properties': {
      // Sort keys alphabetically and format as key = value
      const keys = Object.keys(data).sort();
      return keys.map(key => `${key} = ${data[key]}`).join('\n');
    }

    case 'html':
      return prettifyHTML(content, indentSize);

    case 'markdown':
      return formatMarkdown(content);

    default:
      return content;
  }
}

/**
 * Minifies the content based on type.
 */
export function minify(content: string, format: FileFormat): string {
  const parseResult = validateAndParse(content, format);
  if (!parseResult.isValid) {
    throw new Error(parseResult.error || 'Failed to parse content before minifying');
  }

  const data = parseResult.parsed;

  switch (format) {
    case 'json':
      return JSON.stringify(data);

    case 'yaml':
      // Convert to flow-style (JSON-like compact YAML style)
      return stringifyYaml(data, { collectionStyle: 'flow' }).trim();

    case 'toml':
      // Minify TOML by removing optional whitespace around keys and equal signs, and compacting
      return stringifyToml(data)
        .split('\n')
        .map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return '';
          // Remove spaces around '=' for assignments
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0 && !trimmed.startsWith('[')) {
            const k = trimmed.substring(0, eqIdx).trim();
            const v = trimmed.substring(eqIdx + 1).trim();
            return `${k}=${v}`;
          }
          return trimmed;
        })
        .filter(line => line !== '')
        .join('\n');

    case 'xml': {
      const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        format: false
      });
      return builder.build(data).trim().replace(/>\s+</g, '><');
    }

    case 'properties': {
      // Remove spaces around '=' and strip empty lines
      const keys = Object.keys(data);
      return keys.map(key => `${key.replace(/\s+/g, '')}=${data[key]}`).join('\n');
    }

    case 'html':
      return minifyHTML(content);

    default:
      return content;
  }
}

/**
 * Prettifier for HTML DOM structures
 */
function prettifyHTML(content: string, indentSize: number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const indentChar = ' '.repeat(indentSize);
  
  let result = '';
  const hasDoctype = /<!doctype/i.test(content);
  const hasHtml = /<html/i.test(content);
  
  if (hasDoctype || hasHtml) {
    result += '<!DOCTYPE html>\n';
    result += formatDOMNode(doc.documentElement, 0, indentChar);
  } else {
    // Fragment: only format child nodes of body element to avoid wrapping
    const body = doc.body;
    for (let i = 0; i < body.childNodes.length; i++) {
      result += formatDOMNode(body.childNodes[i], 0, indentChar);
    }
  }
  return result.trim();
}

function formatDOMNode(node: Node, indentLevel: number, indentChar: string): string {
  const indent = indentChar.repeat(indentLevel);
  
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue?.trim();
    return text ? `${indent}${text}\n` : '';
  }
  
  if (node.nodeType === Node.COMMENT_NODE) {
    const val = node.nodeValue?.trim();
    return val ? `${indent}<!-- ${val} -->\n` : '';
  }
  
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();
    
    // Serialize attributes
    let attrs = '';
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attrs += ` ${attr.name}="${attr.value}"`;
    }
    
    // HTML Void elements
    const voidElements = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'source', 'track', 'wbr'
    ]);
    
    if (voidElements.has(tagName)) {
      return `${indent}<${tagName}${attrs}>\n`;
    }
    
    // Check if it's a simple inline text node (e.g. <span>Hello</span>)
    const isTextOnly = el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE;
    if (isTextOnly) {
      const text = el.firstChild!.nodeValue?.trim();
      return text 
        ? `${indent}<${tagName}${attrs}>${text}</${tagName}>\n` 
        : `${indent}<${tagName}${attrs}></${tagName}>\n`;
    }
    
    // Recursively process children
    let childrenStr = '';
    for (let i = 0; i < el.childNodes.length; i++) {
      const child = formatDOMNode(el.childNodes[i], indentLevel + 1, indentChar);
      childrenStr += child;
    }
    
    return `${indent}<${tagName}${attrs}>\n${childrenStr}${indent}</${tagName}>\n`;
  }
  
  return '';
}

/**
 * Minifier for HTML structures
 */
function minifyHTML(content: string): string {
  // Remove comments
  let minified = content.replace(/<!--[\s\S]*?-->/g, '');
  // Remove whitespace between tags
  minified = minified.replace(/>\s+</g, '><');
  // Collapse extra whitespaces
  minified = minified.replace(/\s+/g, ' ');
  return minified.trim();
}
