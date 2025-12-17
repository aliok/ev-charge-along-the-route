# Netlify Functions & Static Site: EPDK Proxy & Maps Redirect

This project demonstrates combining Netlify Serverless Functions with a static HTML frontend served from the same origin. It provides:

1.  **Static Frontend:** An `index.html` file (generated from `index.template.html` during build) that displays a Google Map and allows testing the API endpoints.
2.  **EPDK Station Proxy Function:** (`/api/station/:id/sockets`) Proxies requests to the EPDK SARJ API (`sarjtr.epdk.gov.tr`) to retrieve simplified EV charging station socket details (ID, price, availability).
3.  **Google Maps Redirect Resolver Function:** (`/api/maps/redirect`) Resolves Google Maps short links (`https://maps.app.goo.gl/...`) to their final destination URL.

The frontend and functions are served from the same domain, eliminating the need for complex CORS configuration. Environment variables (like the Google Maps API Key) are injected into the frontend HTML during the Netlify build process.

## Features

*   **Static HTML Frontend:**
    *   Uses a build script (`scripts/build-html.mjs`) to inject the `GOOGLE_MAPS_API_KEY` environment variable into `index.template.html`, outputting the final `index.html` to the `dist` directory.
    *   Displays a Google Map using the injected API key.
    *   Provides simple UI elements to test the backend function endpoints.
*   **Station Socket Proxy (`/api/station/:id/sockets`):**
    *   Fetches detailed station data from the EPDK API based on a station ID (extracted manually from the path).
    *   Calculates the required timestamp for the API request.
    *   Parses the response and returns a simplified array of sockets with their ID, current price, and calculated availability status (`FREE`, `IN_USE`, `UNKNOWN`).
    *   Handles fetch timeouts and upstream API errors gracefully.
*   **Google Maps Redirect Resolver (`/api/maps/redirect`):**
    *   Accepts a Google Maps short URL (`maps.app.goo.gl`) via a `url` query parameter.
    *   Follows HTTP redirects to find the final destination URL.
    *   Handles fetch timeouts and network errors.
*   **Same-Origin:** Frontend and backend functions served from the same Netlify domain, simplifying requests.
*   **Environment Variable Management:** Uses Netlify build environment variables for configuration (API keys, etc.), keeping secrets out of the repository. Uses `.env` file and `dotenv` package for local development builds.

## Technology Stack

*   [Node.js](https://nodejs.org/) (v18+ recommended for native fetch)
*   [Netlify](https://www.netlify.com/) (Platform for Hosting, Build, Functions)
*   Netlify Functions
*   Static HTML, CSS, TypeScript (compiled to JavaScript)
*   [TypeScript](https://www.typescriptlang.org/) (for type-safe JavaScript)
*   [ESLint](https://eslint.org/) (for code linting and quality checks)
*   [Prettier](https://prettier.io/) (for code formatting)
*   [Knip](https://knip.dev/) (for unused code detection)
*   [jscpd](https://github.com/kucherenko/jscpd) (for duplicate code detection)
*   [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) (for security vulnerability detection)
*   `dotenv` (for local build environment variables)
*   Native `fetch` API (in Node.js functions)

## Project Structure

```
.
├── netlify.toml # Netlify config (build, redirects, functions)
├── package.json # Dependencies and build scripts
├── index.template.html # Source HTML template with placeholders
├── .prettierrc # Prettier configuration
├── .prettierignore # Files ignored by Prettier
├── eslint.config.mjs # ESLint configuration
├── knip.json # Knip configuration for unused code detection
├── .jscpd.json # jscpd configuration for duplicate code detection
├── scripts/
│ └── build-html.mjs # Node.js script to build index.html from template
├── css/ # Example directory for static CSS
│ └── style.css
├── js/ # TypeScript source files for client-side code
│ ├── *.ts # TypeScript source files
│ ├── *.js # Compiled JavaScript files (generated)
│ └── global.d.ts # Global type declarations
├── tsconfig.json # TypeScript configuration
├── netlify/
│ └── functions/ # Directory for Netlify Function source code
│ ├── station-sockets.js
│ └── maps-redirect.js
├── utils/ # Shared utility code for functions
│ ├── config.js # Exports getConfig() function (reads env vars)
│ └── helpers.js # Helper functions (formatting, etc.)
├── .env # Example environment file (for contributors)
└── .gitignore # Specifies intentionally untracked files
```


## Setup and Local Development

**Prerequisites:**

*   Node.js (v18 or later recommended)
*   npm or yarn
*   [Netlify CLI](https://docs.netlify.com/cli/get-started/): `npm install netlify-cli -g`

**Steps:**

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up local environment variables:**
    *   Create a `.env` file in the project root by copying `.env.example` or creating it manually.
    *   **Crucially, add `.env` to your `.gitignore` file!**
    *   Define the necessary variables for local testing, matching the names expected by `scripts/build-html.mjs` and `utils/config.js`.
    ```.env
    # .env - LOCAL DEVELOPMENT ONLY! Add to .gitignore!

    # Required by build script for Google Maps in index.html
    GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY_FOR_LOCALHOST"

    # Optional: Set to 0 ONLY if the EPDK API has TLS issues (read by utils/config.js)
    # NODE_TLS_REJECT_UNAUTHORIZED=0

    # Optional: Override function config defaults if needed locally
    # BASE_URL=http://localhost:9999/mock-epdk
    # FETCH_TIMEOUT=7000
    # MAPS_REDIRECT_TIMEOUT=12000
    ```

4.  **Run the local build:**
    This step compiles TypeScript to JavaScript and generates the `dist/index.html` file with the local API key injected. You need to run this at least once before `netlify dev` or whenever you change the template/assets or TypeScript files.
    ```bash
    npm run build
    ```
    The build process:
    1. Compiles TypeScript files from `js/*.ts` to `js/*.js`
    2. Processes the HTML template and copies assets to `dist/`

5.  **Run the development server:**
    `netlify dev` serves static files from the `dist` directory and runs your functions locally.
    ```bash
    netlify dev
    ```
    *   Open your browser to `http://localhost:8888` (or the port indicated by the CLI). You should see your `index.html` with the map (if the API key is correct and configured for localhost).
    *   The function endpoints are also available, e.g., `http://localhost:8888/api/station/123/sockets`. Requests from the served `index.html` to `/api/...` will work due to same-origin.

## Code Quality

This project uses ESLint and Prettier to maintain code quality and consistent formatting across the codebase.

**Available Scripts:**

*   **`npm run lint`** - Run ESLint to check for code quality issues
    ```bash
    npm run lint
    ```
*   **`npm run lint:fix`** - Automatically fix ESLint issues where possible
    ```bash
    npm run lint:fix
    ```
*   **`npm run format`** - Format all TypeScript files with Prettier
    ```bash
    npm run format
    ```
*   **`npm run format:check`** - Check if files are formatted correctly (without modifying them)
    ```bash
    npm run format:check
    ```
*   **`npm run check`** - Run all quality checks (lint + format + type check)
    ```bash
    npm run check
    ```

**Configuration Files:**

*   **`.prettierrc`** - Prettier configuration (code formatting rules)
*   **`.prettierignore`** - Files and directories ignored by Prettier
*   **`eslint.config.mjs`** - ESLint configuration (linting rules)
*   **`tsconfig.json`** - TypeScript compiler configuration

**Recommended Workflow:**

Before committing code, run `npm run check` to ensure all quality checks pass. You can also run `npm run lint:fix && npm run format` to automatically fix most issues.

## Unused Code Detection

This project uses automated tools to detect unused code, exports, and dependencies.

**Available Scripts:**

*   **`npm run knip`** - Find unused files, exports, and dependencies (comprehensive)
    ```bash
    npm run knip
    ```
*   **`npm run knip:production`** - Check for unused production dependencies only
    ```bash
    npm run knip:production
    ```
*   **`npm run ts-prune`** - Find unused TypeScript exports (lightweight alternative)
    ```bash
    npm run ts-prune
    ```
*   **`npm run find:unused`** - Alias for `npm run knip`
    ```bash
    npm run find:unused
    ```

**Configuration Files:**

*   **`knip.json`** - Knip configuration (defines entry points, ignored files, and exceptions)

**What These Tools Find:**

- Unused exported functions, classes, and variables
- Unused files (not imported anywhere)
- Unused npm dependencies
- Dead code and unreachable code

**Recommended Usage:**

Run `npm run knip` periodically (e.g., before major releases) to identify and remove unused code. This helps:
- Reduce bundle size
- Improve build performance
- Keep the codebase maintainable
- Identify refactoring opportunities

## Duplicate Code Detection

This project uses jscpd (Copy/Paste Detector) to identify duplicated code blocks that could be refactored.

**Available Scripts:**

*   **`npm run jscpd`** - Find duplicate code blocks
    ```bash
    npm run jscpd
    ```
*   **`npm run find:duplicates`** - Alias for `npm run jscpd`
    ```bash
    npm run find:duplicates
    ```

**Configuration Files:**

*   **`.jscpd.json`** - jscpd configuration (thresholds, output format, ignored files)

**What This Tool Finds:**

- Duplicated code blocks (5+ lines by default)
- Copy-pasted code that could be refactored into functions
- Similar code patterns across files
- Generates HTML report in `reports/jscpd/html/`

**Current Status:**

The codebase currently has **0.09% duplication** (1 small clone), which is excellent! The threshold is set to 1%, so builds will fail if duplication exceeds that.

**Recommended Usage:**

Run `npm run jscpd` before major releases to identify refactoring opportunities. Consider extracting duplicated code into shared utility functions when:
- The duplicate is used in multiple files
- The logic is complex and likely to change
- It improves code readability

## Complexity and Security Analysis

This project includes automated complexity analysis and security scanning to maintain code quality and identify potential vulnerabilities.

**Available Scripts:**

*   **`npm run audit`** - Check for security vulnerabilities in dependencies
    ```bash
    npm run audit
    ```
*   **`npm run audit:fix`** - Automatically fix security vulnerabilities
    ```bash
    npm run audit:fix
    ```
*   **`npm run security`** - Run full security check (audit + lint with security rules)
    ```bash
    npm run security
    ```

**Complexity Rules (ESLint):**

The following complexity metrics are enforced as warnings:
- **Cyclomatic Complexity**: Maximum 15 per function
- **Max Function Parameters**: 5 parameters
- **Max Function Length**: 150 lines (excluding blanks/comments)
- **Max Nesting Depth**: 4 levels
- **Max Statements**: 30 per function
- **Max Nested Callbacks**: 3 levels

**Security Rules (eslint-plugin-security):**

The following security patterns are detected:
- Unsafe regular expressions (DoS vulnerability)
- `eval()` usage with expressions
- Object injection vulnerabilities
- Timing attacks in comparisons
- Non-cryptographic random number generation
- Buffer operations without assertions

**Current Status:**

- **Dependencies**: 0 vulnerabilities ✅
- **Complexity**: 3 functions exceed thresholds (warnings)
- **Security**: 2 potential object injection warnings (false positives in array access)

**Recommended Usage:**

- Run `npm run audit` regularly (weekly or before releases)
- Address complexity warnings when refactoring
- Review security warnings carefully - some may be false positives
- Use `npm audit fix` to auto-update vulnerable dependencies

## Testing

This project uses Vitest for fast, modern unit testing of TypeScript utility functions.

**Available Scripts:**

*   **`npm test`** - Run all tests once
    ```bash
    npm test
    ```
*   **`npm run test:watch`** - Run tests in watch mode (re-run on file changes)
    ```bash
    npm run test:watch
    ```
*   **`npm run test:ui`** - Open Vitest UI for interactive test exploration
    ```bash
    npm run test:ui
    ```
*   **`npm run test:coverage`** - Generate test coverage report
    ```bash
    npm run test:coverage
    ```

**Configuration Files:**

*   **`vitest.config.ts`** - Vitest configuration (test environment, coverage settings)

**Test Structure:**

All test files follow the pattern `*.test.ts` and are located alongside their corresponding source files in the `js/` directory:
- `js/validation-utils.test.ts` - Tests for number validation functions
- `js/storage-utils.test.ts` - Tests for localStorage utilities
- `js/async-utils.test.ts` - Tests for async/retry utilities with mocking
- `js/geo-utils.test.ts` - Tests for geographic utilities

**Current Status:**

- **Test Files**: 4
- **Total Tests**: 40
- **Status**: All passing ✅

**Coverage Reporting:**

Coverage reports are generated using V8 provider and output in multiple formats:
- Text output to console
- HTML report in `coverage/` directory
- LCOV format for CI integration

**Recommended Usage:**

- Run `npm test` before committing changes
- Use `npm run test:watch` during development for instant feedback
- Review coverage reports periodically to identify untested code paths
- Add tests when fixing bugs to prevent regression

## Configuration

Configuration relies on environment variables set either locally via `.env` (for `npm run build`) or, crucially, via the Netlify UI for deployments.

**Key Environment Variables (Set in Netlify UI):**

*   `GOOGLE_MAPS_API_KEY` (**Required**): Your client-side Google Maps API Key. **Set this in the Netlify UI, scoped appropriately for each deployment context (Production, `main` branch, etc.).** Remember to configure HTTP Referer restrictions in Google Cloud Console for this key.
*   `NODE_TLS_REJECT_UNAUTHORIZED` (Optional): Set to `0` only if absolutely necessary due to upstream API certificate issues. Affects functions runtime. Set in Netlify UI if needed (Scope: All Scopes or specific contexts).

**Optional Environment Variables (Set in Netlify UI to override defaults in `utils/config.js`):**

*   `BASE_URL`: Override the default EPDK API base URL for functions.
*   `FETCH_TIMEOUT`: Override the default timeout (ms) for EPDK API calls for functions.
*   `MAPS_REDIRECT_TIMEOUT`: Override the default timeout (ms) for Google Maps redirects for functions.

## Deployment

1.  **Connect Git Repository:** Link your Git repository to a new or existing site on Netlify.
2.  **Configure Build Settings:** Ensure Netlify is configured to:
    *   Use the correct **Production branch** (e.g., `prod`).
    *   Track other branches for deploys (e.g., `main` for dev).
    *   Use the **Build command:** `npm run build`.
    *   Use the **Publish directory:** `dist`.
    *   Use the correct **Functions directory:** `netlify/functions`. (Often auto-detected from `netlify.toml`).
3.  **Set Environment Variables in Netlify UI:** Go to `Site settings > Build & deploy > Environment`. Add **`GOOGLE_MAPS_API_KEY`** and any other necessary variables (like `NODE_TLS_REJECT_UNAUTHORIZED`). **Crucially, scope the variables correctly** to apply the right values to the right deployment contexts (e.g., Production context gets prod API key, `main` branch context gets dev API key).
4.  **Trigger Deploy:** Push changes to your connected Git branches (`main`, `prod`). Netlify will:
    *   Inject the scoped environment variables for that branch/context.
    *   Run `npm run build`.
    *   Deploy the contents of the `dist` directory.
    *   Deploy the functions from `netlify/functions`.

## API Endpoints / Usage

*(These are called from the client-side JavaScript `js/script.js`)*

### 1. Get Station Sockets

*   **Path:** `/api/station/:id/sockets`
*   **Method:** `GET`
*   **Path Parameters:**
    *   `:id` (Required): The numerical ID of the charging station (extracted from path).
*   **Success Response (200 OK):** Array of simplified socket objects.
    ```json
    [ { "id": 501, "price": 7.5, "availability": "FREE" }, /* ... */ ]
    ```
*   **Error Responses:** `400`, `405`, `500`, `502`, `504`.

### 2. Resolve Google Maps Redirect

*   **Path:** `/api/maps/redirect`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `url` (Required): The encoded Google Maps short URL (`maps.app.goo.gl`).
*   **Success Response (200 OK):**
    ```json
    { "redirectedUrl": "https://www.google.com/maps/place/..." }
    ```
*   **Error Responses:** `400`, `405`, `500`, `502`, `504`.

## Security Considerations

*   **Google Maps API Key:** The client-side key injected into the HTML is inherently public. Rely on **HTTP Referer restrictions** configured in your Google Cloud Console as the primary security mechanism for this key.
*   **TLS Verification:** Disabling TLS verification (`NODE_TLS_REJECT_UNAUTHORIZED=0`) for function outbound requests is a security risk. Only use if the target API has certificate issues you cannot control.
*   **Function Access:** Since CORS is not needed/used, the function endpoints are technically callable by any client that knows the URL. Access isn't restricted beyond standard Netlify infrastructure protections. If sensitive operations were involved, authentication/authorization would be required.

## License

MIT
