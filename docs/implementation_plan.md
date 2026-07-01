# Implementation Plan - Kitsune

Kitsune is a clean, simple, easy-to-use, and visually stunning web application for developers to format, validate, convert, clean, and compare config, markup, and data files (XML, JSON, Properties, YAML, TOML, and HTML).

The application focuses on an elegant, premium user experience with a sleek dark mode theme, featuring warm orange/gold accents, soft glassmorphism, responsive controls, and visual feedback.

---

## User Review Required

> [!IMPORTANT]
> **No File Upload Policy:** The user can paste and edit file content but never upload it directly. The UI will explicitly present large paste areas (or code editor panes) and omit any drag-and-drop or file selector prompts.
>
> **Tech Stack Choice:** We propose using **Vite + React + TypeScript** with **Vanilla CSS** (for custom glassmorphic styling, responsive layout, and transitions). We will leverage client-side parsing libraries to handle formatting, validation, and conversion directly in the browser with zero server-side storage, ensuring maximum privacy.

---

## Proposed Technical Architecture

### 1. Technology Stack
- **Build System**: Vite (fast, light, and optimized production builds)
- **Frontend Library**: React (for component state management, dynamic inputs, and panels)
- **Styling**: Vanilla CSS (custom properties for theme colors, glassmorphism, and smooth transitions)
- **Code Editor**: CodeMirror 6 — good balance of features (~150KB), syntax highlighting, and extensibility without the heavyweight Monaco bundle
- **Libraries**:
  - `yaml` for YAML parsing and serialization.
  - `fast-xml-parser` for XML parsing, formatting, and conversion.
  - `smol-toml` for TOML parsing and serialization.
  - Custom parser helper for Java `.properties` files.
  - `diff` (npm) for computing line-level differences.

### 2. Feature Specification

#### Feature A: Clipboard/Paste Centric Editor Pane
- A prominent CodeMirror 6 editor area initialized with a placeholder and a quick "Paste from Clipboard" button.
- **Auto-detection on paste**: When the user pastes content, the app will attempt to detect the format automatically using heuristics (e.g., starts with `{`/`[` → JSON, starts with `<` → XML/HTML, contains `[section]` headers → TOML, dot-notation key-values → Properties, otherwise → YAML). A manual format selector dropdown is always visible for the user to override.

#### Feature B: Action & Tool Panel
- **Validate**: Checks syntax. Displays a clear badge ("Valid" in green, "Invalid" in red) and line-specific error messages if parsing fails.
- **Format / Prettify**: Prettifies the content with custom indentation (2 spaces, 4 spaces, tab).
- **Minify**: Collapses the content to its most compact form, removing unnecessary whitespace and newlines.
- **Remove Comments**: Strips comments specific to the file format:
  - **JSON**: Strips `//` and `/* */` comments (non-standard but common).
  - **XML / HTML**: Strips `<!-- -->` comment blocks.
  - **YAML / TOML / Properties**: Strips lines starting with `#` or in-line comments (preserving values with `#` in strings).
- **Convert**: Converts current content to another compatible format (subject to the compatibility matrix below). Incompatible targets are disabled/greyed out.

#### Feature C: Compare (Dedicated Tab)
- The app has two main tabs: **Editor** (default) and **Compare**.
- The Compare tab presents **two side-by-side paste areas** (both CodeMirror instances).
- After pasting content in both, the diff result shows **only the lines with differences**, collapsing identical sections (with an optional "show N hidden lines" expander). Additions, deletions, and modifications are color-coded (green/red/yellow).

---

## Conversion & Parsing Strategies

The application will use a central JavaScript object model as the intermediate representation (IR) to perform conversions:

```
[Format A] ──(Parse)──> [JS Object (IR)] ──(Serialize)──> [Format B]
```

Since not all formats are mutually compatible, Kitsune enforces the following conversion compatibility matrix. The UI will **disable/grey out** incompatible target formats.

### Conversion Compatibility Matrix

| Source / Target | JSON | YAML | TOML | XML | Properties | HTML |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **JSON** | — | ✅ | ⚠️ (1) | ⚠️ (2) | ⚠️ (3) | ❌ (4) |
| **YAML** | ✅ | — | ⚠️ (1) | ⚠️ (2) | ⚠️ (3) | ❌ (4) |
| **TOML** | ✅ | ✅ | — | ⚠️ (2) | ⚠️ (3) | ❌ (4) |
| **XML** | ✅ | ✅ | ⚠️ (1) | — | ⚠️ (3) | ❌ (4) |
| **Properties**| ✅ | ✅ | ✅ | ✅ | — | ❌ (4) |
| **HTML** | ❌ (4) | ❌ (4) | ❌ (4) | ❌ (4) | ❌ (4) | — |

> [!NOTE]
> **(1) TOML Limitations (⚠️):** TOML does not support `null` values or heterogeneous arrays (e.g., mixing strings and objects). If the source data contains these, a **warning toast** is shown explaining what was dropped or transformed.
>
> **(2) XML Caveats (⚠️):** XML uses attributes (`<el attr="val">`) and mixed content (text + child elements), which don't map cleanly to key-value structures. The conversion will use a convention (e.g., `@attr` prefix for attributes, `#text` for text content) and show a warning when lossy transformations occur.
>
> **(3) Properties Flattening (⚠️):** Hierarchical structures are flattened using dot notation (e.g., `database.host = localhost`). Arrays become indexed keys (e.g., `items.0 = foo`). A warning is shown since the conversion is lossy for complex nested data.
>
> **(4) HTML Incompatible (❌):** HTML is a markup/presentation format, not a data interchange format. Conversion to/from other formats is not possible. HTML supports Validation, Formatting, Comment Removal, and Diffing only.

---

### 3. Parsing & Validation Libraries

| Format | Parse / Validation Library | Target Format Specifics |
| :--- | :--- | :--- |
| **JSON** | Native `JSON.parse` | Straightforward IR extraction. Supports JSON-with-comments stripping. |
| **XML** | `fast-xml-parser` | DOM parsing or XML-to-JSON serialization. Attributes are mapped to properties. |
| **YAML** | `yaml` | Supports multi-document parsing. Outputs clean nested structures. |
| **TOML** | `smol-toml` | Handles typed key-values, tables, and arrays. |
| **Properties** | Custom key-value regex parser | Flattens/unflattens objects using dot notation. |
| **HTML** | `DOMParser` & regex checks | Parsed natively in-browser. Validates tag matching. |

---

## Proposed Directory Structure

We will initialize the project in the workspace root `./` using Vite's React + TypeScript template.

```
kitsune/
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── index.css              <-- Design tokens, theme, glassmorphism, global CSS
│   ├── App.tsx                <-- Root layout: tab navigation (Editor | Compare) + state
│   ├── components/
│   │   ├── Header.tsx          <-- App header with logo, tab switcher
│   │   ├── EditorTab.tsx       <-- Editor tab: CodeMirror editor + action panel
│   │   ├── CompareTab.tsx      <-- Compare tab: two editors + diff result
│   │   ├── CodeEditor.tsx      <-- Reusable CodeMirror 6 wrapper component
│   │   ├── ActionPanel.tsx     <-- Validate, Format, Minify, Remove Comments, Convert
│   │   ├── DiffResult.tsx      <-- Focused diff output (only changed lines)
│   │   ├── FormatSelector.tsx  <-- Format dropdown with auto-detect indicator
│   │   └── Toast.tsx           <-- Success/Warning/Error notification overlays
│   └── utils/
│       ├── parsers.ts          <-- Parsing & validation for all 6 formats
│       ├── formatters.ts       <-- Prettify & minify logic per format
│       ├── converters.ts       <-- Cross-format conversion with compatibility checks
│       ├── comments.ts         <-- Comment stripping logic per format
│       ├── detect.ts           <-- Auto-detection heuristics
│       └── diff.ts             <-- Line-based diff calculator
```

---

## Verification Plan

### Automated Tests
We will install Vitest to verify all conversions, formatters, and comment strippers:
- Run `npm run test` (Vitest) to check:
  - Properties <=> JSON conversions (with nested structures).
  - XML & HTML formatters and comment stripping.
  - TOML validator and converters.
  - Focused line-diffing algorithm correctness (only showing difference lines).

### Manual Verification
- Visual inspection of validation errors (e.g., mismatched brackets in JSON, unclosed tags in XML).
- User paste performance check with larger files (1MB+).
- Responsiveness on mobile and tablet viewport widths.
- Dark mode aesthetics check against the generated design mockup.
