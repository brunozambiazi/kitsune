# 🦊 Kitsune — Config & Markup Developer Suite

Kitsune is a clean, simple, privacy-first, and visually stunning developer utility web application designed to validate, format, minify, strip comments, convert, and compare configuration, markup, and data files. 

All processing runs **entirely in the browser** (client-side) with zero server-side storage, guaranteeing absolute privacy for configuration keys, database connection strings, and sensitive schemas.

---

## 🚀 Key Features

*   **Paste-Only Workflow:** Designed strictly for copy-paste operations to keep your local workspace clean. No drag-and-drop or file selector prompts.
*   **Format Auto-detection:** Paste content and let the heuristic auto-detection engine identify the file format, with manual override available if needed.
*   **Fully Supported Formats:**
    *   **JSON** (including non-standard JSON-with-comments syntax)
    *   **YAML / YML**
    *   **TOML**
    *   **XML**
    *   **Java Properties** (including multi-line continuations and escape validation)
    *   **HTML** (including tag-balancing validation stack)
*   **Syntax tools:**
    *   **Validate:** Real-time syntax checking with line-specific errors.
    *   **Format:** Pretty-print structures with customizable indentation sizes (2, 4, or 8 spaces).
    *   **Minify:** Compresses content to its most compact spacing form.
    *   **Strip Comments:** Intelligently removes comments (`//` & `/* */` for JSON, `<!-- -->` for HTML/XML, and `#` for YAML/TOML/Properties) while preserving symbols inside quoted strings.
*   **Bidirectional Conversion:** Convert data cleanly between compatible formats. The UI warns you with helpful alert messages if a conversion could result in lossy transformations (e.g., flattening/unflattening nesting for Properties, or TOML's null/mixed-type limitations).
*   **Focused Diff Comparison:** A dedicated side-by-side comparison tab that isolates changes (additions/removals) and **collapses matching lines** (with a skipped line counter) to keep your focus strictly on what changed.

---

## 🛠️ Technology Stack

*   **Vite + React + TypeScript**
*   **CodeMirror 6:** Lightweight, extensible code editor wrapper supporting line wrapping by default.
*   **Vanilla CSS:** Custom HSL dark-theme styling, glassmorphic accents, and micro-animations.
*   **Parsers/Libraries:** `yaml`, `fast-xml-parser`, `smol-toml`, and `diff`.

---

## 💻 Local Development

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/your-username/kitsune.git
cd kitsune
npm install --legacy-peer-deps
```

### 2. Run the Dev Server
Launch Vite's development server locally:
```bash
npm run dev
```
Open your browser and navigate to the local address displayed in the terminal (usually `http://localhost:5173`).

### 3. Run Automated Tests
Kitsune uses **Vitest** to verify parsing, comment stripping, conversions, and line-level diff computations. Run the test suite:
```bash
npm run test
```

### 4. Build for Production
Generate the compiled and minified static assets in the `dist/` directory:
```bash
npm run build
```

---

## 🐳 Docker Deployment

You can containerize Kitsune and serve it locally or in production using the provided multi-stage `Dockerfile`:

1.  **Build the Docker Image:**
    ```bash
    docker build -t kitsune-app .
    ```

2.  **Run the Container:**
    ```bash
    docker run -d -p 8080:80 --name kitsune kitsune-app
    ```

3.  **Access the Application:**
    Open your browser and go to `http://localhost:8080`.

---

## 🔒 Privacy & Security

Kitsune is **100% serverless**. All data formatting, minifying, converting, and diff calculations happen in your local browser sandbox. No analytics track your payloads, and no data is ever transmitted over network requests.
