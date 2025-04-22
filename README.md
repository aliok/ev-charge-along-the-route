# Netlify Functions & Static Site: EPDK Proxy & Maps Redirect

This project demonstrates combining Netlify Serverless Functions with a static HTML frontend served from the same origin. It provides:

1.  **Static Frontend:** An `index.html` file (generated from `index.template.html` during build) that displays a Google Map and allows testing the API endpoints.
2.  **EPDK Station Proxy Function:** (`/api/station/:id/sockets`) Proxies requests to the EPDK SARJ API (`sarjtr.epdk.gov.tr`) to retrieve simplified EV charging station socket details (ID, price, availability).
3.  **Google Maps Redirect Resolver Function:** (`/api/maps/redirect`) Resolves Google Maps short links (`https://maps.app.goo.gl/...`) to their final destination URL.

The frontend and functions are served from the same domain, eliminating the need for complex CORS configuration. Environment variables (like the Google Maps API Key) are injected into the frontend HTML during the Netlify build process.

## Features

*   **Static HTML Frontend:**
    *   Uses a build script (`scripts/build-html.mjs`) to inject the `VITE_GOOGLE_MAPS_API_KEY` environment variable into `index.template.html`, outputting the final `index.html` to the `dist` directory.
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
*   Static HTML, CSS, JavaScript
*   `dotenv` (for local build environment variables)
*   Native `fetch` API (in Node.js functions)

## Project Structure

```
.
├── netlify.toml # Netlify config (build, redirects, functions)
├── package.json # Dependencies and build scripts
├── index.template.html # Source HTML template with placeholders
├── scripts/
│ └── build-html.mjs # Node.js script to build index.html from template
├── css/ # Example directory for static CSS
│ └── style.css
├── js/ # Example directory for static client-side JS
│ └── script.js
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
    VITE_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY_FOR_LOCALHOST"

    # Optional: Set to 0 ONLY if the EPDK API has TLS issues (read by utils/config.js)
    # NODE_TLS_REJECT_UNAUTHORIZED=0

    # Optional: Override function config defaults if needed locally
    # BASE_URL=http://localhost:9999/mock-epdk
    # FETCH_TIMEOUT=7000
    # MAPS_REDIRECT_TIMEOUT=12000
    ```

4.  **Run the local build:**
    This step generates the `dist/index.html` file with the local API key injected. You need to run this at least once before `netlify dev` or whenever you change the template/assets.
    ```bash
    npm run build
    ```

5.  **Run the development server:**
    `netlify dev` serves static files from the `dist` directory and runs your functions locally.
    ```bash
    netlify dev
    ```
    *   Open your browser to `http://localhost:8888` (or the port indicated by the CLI). You should see your `index.html` with the map (if the API key is correct and configured for localhost).
    *   The function endpoints are also available, e.g., `http://localhost:8888/api/station/123/sockets`. Requests from the served `index.html` to `/api/...` will work due to same-origin.

## Configuration

Configuration relies on environment variables set either locally via `.env` (for `npm run build`) or, crucially, via the Netlify UI for deployments.

**Key Environment Variables (Set in Netlify UI):**

*   `VITE_GOOGLE_MAPS_API_KEY` (**Required**): Your client-side Google Maps API Key. The `VITE_` prefix is a convention often used by build tools to indicate frontend-safe variables. **Set this in the Netlify UI, scoped appropriately for each deployment context (Production, `main` branch, etc.).** Remember to configure HTTP Referer restrictions in Google Cloud Console for this key.
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
3.  **Set Environment Variables in Netlify UI:** Go to `Site settings > Build & deploy > Environment`. Add **`VITE_GOOGLE_MAPS_API_KEY`** and any other necessary variables (like `NODE_TLS_REJECT_UNAUTHORIZED`). **Crucially, scope the variables correctly** to apply the right values to the right deployment contexts (e.g., Production context gets prod API key, `main` branch context gets dev API key).
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
