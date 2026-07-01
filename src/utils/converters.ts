import type { FileFormat } from './detect';
import { validateAndParse } from './parsers';
import { stringify as stringifyYaml } from 'yaml';
import { stringify as stringifyToml } from 'smol-toml';
import { XMLBuilder } from 'fast-xml-parser';

export interface ConversionResult {
  success: boolean;
  output?: string;
  warnings: string[];
  error?: string;
}

/**
 * Converts content from a source format to a target format.
 */
export function convertFormat(
  content: string,
  sourceFormat: FileFormat,
  targetFormat: FileFormat
): ConversionResult {
  const warnings: string[] = [];

  if (sourceFormat === targetFormat) {
    return { success: true, output: content, warnings: [] };
  }

  // HTML conversions are disabled
  if (sourceFormat === 'html' || targetFormat === 'html') {
    return {
      success: false,
      warnings: [],
      error: 'HTML is a document layout format and cannot be converted to or from data configurations.'
    };
  }

  // 1. Parse source content to JS Object (IR)
  const parseResult = validateAndParse(content, sourceFormat);
  if (!parseResult.isValid) {
    return {
      success: false,
      warnings: [],
      error: `Parse error in source content: ${parseResult.error}`
    };
  }

  let ir = parseResult.parsed;

  // 2. Format specific pre-processing
  if (sourceFormat === 'properties') {
    // Unflatten Properties flat keys into a nested structure
    ir = unflattenObject(ir);
  }

  // 3. Target specific pre-processing & serialization
  try {
    let output = '';

    switch (targetFormat) {
      case 'json':
        output = JSON.stringify(ir, null, 2);
        break;

      case 'yaml':
        output = stringifyYaml(ir, { indent: 2 });
        break;

      case 'toml': {
        if (typeof ir !== 'object' || ir === null || Array.isArray(ir)) {
          warnings.push('TOML requires a root table/object. Root was wrapped in a default table.');
          ir = { root: ir };
        }
        const sanitized = sanitizeForTOML(ir, warnings);
        output = stringifyToml(sanitized);
        break;
      }

      case 'xml': {
        if (typeof ir !== 'object' || ir === null) {
          ir = { root: { '#text': String(ir) } };
          warnings.push('XML requires element structures. Primitive value was wrapped in a <root> element.');
        } else if (Array.isArray(ir)) {
          ir = { root: { item: ir } };
          warnings.push('XML root cannot be a list. Root array was wrapped in a <root> element.');
        } else {
          // If object has multiple keys, wrap in a single root element
          const keys = Object.keys(ir);
          if (keys.length !== 1) {
            ir = { root: ir };
            warnings.push('XML requires a single root element. Object properties were wrapped in a <root> element.');
          }
        }
        
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          textNodeName: '#text',
          format: true,
          indentBy: '  '
        });
        output = builder.build(ir).trim();
        break;
      }

      case 'properties': {
        const hasNestedData = typeof ir === 'object' && ir !== null && Object.values(ir).some(
          v => typeof v === 'object' && v !== null
        );
        const flattened = flattenObject(ir);
        if (hasNestedData) {
          warnings.push('Hierarchical structure was flattened into dot-notation properties.');
        }
        output = Object.keys(flattened)
          .sort()
          .map(k => `${k} = ${flattened[k]}`)
          .join('\n');
        break;
      }

      default:
        return { success: false, warnings: [], error: `Unsupported target format: ${targetFormat}` };
    }

    return { success: true, output, warnings };
  } catch (err: any) {
    return {
      success: false,
      warnings,
      error: `Conversion failed: ${err.message || err}`
    };
  }
}

/**
 * Sanitizes data for TOML, removing nulls and warning about heterogeneous arrays.
 */
function sanitizeForTOML(obj: any, warnings: string[]): any {
  if (obj === null || obj === undefined) {
    warnings.push('Dropped unsupported null value.');
    return undefined;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return obj;

    const firstType = typeof obj[0];
    const isFirstArray = Array.isArray(obj[0]);

    // TOML arrays must contain elements of the same data type
    const hasMixedTypes = obj.some(item => {
      if (item === null || item === undefined) return true;
      if (typeof item !== firstType) return true;
      if (Array.isArray(item) !== isFirstArray) return true;
      return false;
    });

    if (hasMixedTypes) {
      warnings.push('Mixed-type arrays are not supported by TOML. Array elements were cast to strings.');
      return obj.map(item => (item === null || item === undefined ? '' : String(item)));
    }

    return obj
      .map(item => sanitizeForTOML(item, warnings))
      .filter(item => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = sanitizeForTOML(obj[key], warnings);
      if (val !== undefined) {
        cleaned[key] = val;
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * Flattens nested object structures into dot-notation key-value pairs.
 */
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  function recurse(current: any, currentKey = '') {
    if (current === null || current === undefined) {
      result[currentKey] = '';
      return;
    }

    if (Array.isArray(current)) {
      if (current.length === 0) {
        result[currentKey] = '[]';
      } else {
        current.forEach((item, index) => {
          recurse(item, currentKey ? `${currentKey}.${index}` : `${index}`);
        });
      }
    } else if (typeof current === 'object' && !(current instanceof Date)) {
      const keys = Object.keys(current);
      if (keys.length === 0) {
        result[currentKey] = '{}';
      } else {
        keys.forEach(key => {
          recurse(current[key], currentKey ? `${currentKey}.${key}` : key);
        });
      }
    } else {
      result[currentKey] = String(current);
    }
  }

  recurse(obj, prefix);
  return result;
}

/**
 * Inflates flat dot-notation properties back into nested objects/arrays.
 */
function unflattenObject(flat: Record<string, string>): any {
  const result: any = {};

  for (const key of Object.keys(flat)) {
    const parts = key.split('.');
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const isNextIndex = nextPart !== undefined && /^\d+$/.test(nextPart);

      if (i === parts.length - 1) {
        // Last part: set the value
        if (Array.isArray(current)) {
          const index = parseInt(part, 10);
          current[index] = flat[key];
        } else {
          current[part] = flat[key];
        }
      } else {
        // Navigate or create next level
        if (Array.isArray(current)) {
          const index = parseInt(part, 10);
          if (!current[index]) {
            current[index] = isNextIndex ? [] : {};
          }
          current = current[index];
        } else {
          if (!current[part]) {
            current[part] = isNextIndex ? [] : {};
          }
          current = current[part];
        }
      }
    }
  }

  return result;
}
