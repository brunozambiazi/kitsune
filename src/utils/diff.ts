import { diffLines } from 'diff';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'skipped';
  lineNumberOld?: number;
  lineNumberNew?: number;
  content: string;
  skippedCount?: number;
}

/**
 * Calculates a focused line-based diff between two text contents.
 * Returns only the changed lines and a 1-line context around changes,
 * inserting placeholder markers for skipped matching content.
 */
export function calculateDiff(oldText: string, newText: string): DiffLine[] {
  const diffs = diffLines(oldText, newText);
  const allLines: DiffLine[] = [];
  
  let lineOld = 1;
  let lineNew = 1;

  for (const part of diffs) {
    // Split by newline. Handle trailing empty string from trailing newlines.
    const partLines = part.value.split(/\r?\n/);
    if (partLines.length > 1 && partLines[partLines.length - 1] === '') {
      partLines.pop();
    }

    for (const val of partLines) {
      if (part.removed) {
        allLines.push({
          type: 'removed',
          lineNumberOld: lineOld++,
          content: val
        });
      } else if (part.added) {
        allLines.push({
          type: 'added',
          lineNumberNew: lineNew++,
          content: val
        });
      } else {
        allLines.push({
          type: 'unchanged',
          lineNumberOld: lineOld++,
          lineNumberNew: lineNew++,
          content: val
        });
      }
    }
  }

  // Identify lines to keep (changes + 1 line of context around them)
  const keptIndices = new Set<number>();
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (line.type === 'added' || line.type === 'removed') {
      keptIndices.add(i);
      if (i - 1 >= 0) keptIndices.add(i - 1);
      if (i + 1 < allLines.length) keptIndices.add(i + 1);
    }
  }

  // Construct final diff output with skipped nodes
  const result: DiffLine[] = [];
  let skipStart = -1;

  for (let i = 0; i < allLines.length; i++) {
    if (keptIndices.has(i)) {
      if (skipStart !== -1) {
        const skippedCount = i - skipStart;
        result.push({
          type: 'skipped',
          content: `... skipped ${skippedCount} identical line${skippedCount > 1 ? 's' : ''} ...`,
          skippedCount
        });
        skipStart = -1;
      }
      result.push(allLines[i]);
    } else {
      if (skipStart === -1) {
        skipStart = i;
      }
    }
  }

  if (skipStart !== -1) {
    const skippedCount = allLines.length - skipStart;
    result.push({
      type: 'skipped',
      content: `... skipped ${skippedCount} identical line${skippedCount > 1 ? 's' : ''} ...`,
      skippedCount
    });
  }

  return result;
}
