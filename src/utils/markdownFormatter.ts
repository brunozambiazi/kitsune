/**
 * Custom formatter for Markdown content.
 * Standardizes headers, lists, blockquotes, spacing, and collapses multiple consecutive blank lines.
 * Safely ignores content inside code blocks (``` or ~~~).
 */
export function formatMarkdown(content: string): string {
  // Replace literal "\n" (backslash and 'n') with actual line breaks
  const unescapedContent = content.replace(/\\n/g, '\n');
  const lines = unescapedContent.split(/\r?\n/);
  const formattedLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockChar = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Detect code blocks
    if (trimmedLine.startsWith('```') || trimmedLine.startsWith('~~~')) {
      const char = trimmedLine.startsWith('```') ? '```' : '~~~';
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockChar = char;
        // Ensure one blank line before code block if not first line
        if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
          formattedLines.push('');
        }
        formattedLines.push(line.trimEnd());
      } else if (trimmedLine.startsWith(codeBlockChar)) {
        inCodeBlock = false;
        formattedLines.push(line.trimEnd());
      } else {
        formattedLines.push(line);
      }
      continue;
    }

    if (inCodeBlock) {
      formattedLines.push(line);
      continue;
    }

    // Process line outside code block
    // 1. Handle headings (e.g., # Heading, ## Heading)
    const headingMatch = line.match(/^(\s*)(#{1,6})(\s*)(.*)$/);
    if (headingMatch) {
      const [_, _indent, hashes, _spaces, text] = headingMatch;
      const cleanText = text.trim();
      const formattedHeading = `${hashes} ${cleanText}`;
      
      // Ensure one blank line before heading if not the first line
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      formattedLines.push(formattedHeading);
      continue;
    }

    // 2. Handle blockquotes (e.g., > Quote, >> Nested)
    const blockquoteMatch = line.match(/^(\s*)(>+)(\s*)(.*)$/);
    if (blockquoteMatch) {
      const [_, _indent, arrows, _spaces, text] = blockquoteMatch;
      const formattedBlockquote = `${arrows} ${text.trim()}`;
      formattedLines.push(formattedBlockquote);
      continue;
    }

    // 3. Handle list items (e.g., - Item, 1. Item, • Item)
    const listItemMatch = line.match(/^(\s*)([-*+•]|\d+\.)(\s*)(.*)$/);
    if (listItemMatch) {
      let [_, indent, bullet, _spaces, text] = listItemMatch;
      // Treat • bullet points exactly the same as - hyphens
      if (bullet === '•') {
        bullet = '-';
      }
      // Preserve original list indentation, but ensure exactly one space after bullet
      const formattedListItem = `${indent}${bullet} ${text.trim()}`;
      formattedLines.push(formattedListItem);
      continue;
    }

    // 4. Handle regular lines
    let formattedLine = line.trimEnd();
    if (trimmedLine === '') {
      formattedLine = '';
    } else if (line.endsWith('  ')) {
      // Preserve double-space hard line breaks in markdown
      formattedLine = trimmedLine + '  ';
    } else {
      formattedLine = trimmedLine;
    }

    formattedLines.push(formattedLine);
  }

  // Post-processing: clean up multiple consecutive empty lines
  const resultLines: string[] = [];
  let prevIsEmpty = false;
  inCodeBlock = false;

  for (let i = 0; i < formattedLines.length; i++) {
    const line = formattedLines[i];
    
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      resultLines.push(line);
      prevIsEmpty = false;
      continue;
    }

    if (inCodeBlock) {
      resultLines.push(line);
      continue;
    }

    if (line === '') {
      if (!prevIsEmpty && resultLines.length > 0) {
        resultLines.push('');
        prevIsEmpty = true;
      }
    } else {
      resultLines.push(line);
      prevIsEmpty = false;
    }
  }

  // Trim trailing empty lines
  while (resultLines.length > 0 && resultLines[resultLines.length - 1] === '') {
    resultLines.pop();
  }

  return resultLines.join('\n');
}
