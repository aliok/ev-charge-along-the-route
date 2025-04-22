## Setup and Local Development

**Prerequisites:**

*   Node.js (LTS version recommended)
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
    Create a `.env` file in the project root (this file should be added to `.gitignore`). Define the necessary variables for local testing:
    ```.env
    # .env file for local development

    # Required: Origin of your local frontend development server
    ALLOWED_CORS_ORIGIN=http://localhost:63342

    # Optional: Set to 0 ONLY if the EPDK API has TLS issues and you accept the risk
    # NODE_TLS_REJECT_UNAUTHORIZED=0

    # Optional: Override defaults from utils/config.js if needed
    # BASE_URL=https://alternative-api.example.com
    # FETCH_TIMEOUT=7000
    # MAPS_REDIRECT_TIMEOUT=12000
    ```
    Alternatively, you can export these variables in your terminal before running `netlify dev`.
    
4.  **Run the development server:**
    The Netlify CLI will emulate the Netlify environment locally, including running your functions.
    ```bash
    netlify dev
    ```
    Your functions will typically be available at `http://localhost:8888` (the port may vary, check the CLI output). For example:
    *   `http://localhost:8888/api/station/123/sockets`
    *   `http://localhost:8888/api/maps/redirect?url=https://maps.app.goo.gl/abc`

## Configuration

Configuration is managed centrally in `utils/config.js`, which reads values from environment variables. Defaults are provided for some settings.

**Key Environment Variables:**

*   `ALLOWED_CORS_ORIGIN` (**Required for Deployment**): The specific origin (e.g., `https://your-app.com`) that is allowed to make requests to these functions. Set this in the Netlify UI **per deployment context** (e.g., different values for Production vs. Staging branches). This is critical for security. Defaults to `http://localhost:63342` for local use.
*   `NODE_TLS_REJECT_UNAUTHORIZED` (Optional): Set to `0` to disable Node.js's TLS certificate verification. **Use with extreme caution and only if absolutely necessary** due to upstream API certificate issues. Disabling this is a security risk. Defaults to `1` (enabled). Set in Netlify UI if needed.

**Optional Environment Variables (to override defaults in `utils/config.js`):**

*   `BASE_URL`: Override the default EPDK API base URL.
*   `FETCH_TIMEOUT`: Override the default timeout (ms) for EPDK API calls.
*   `MAPS_REDIRECT_TIMEOUT`: Override the default timeout (ms) for Google Maps redirects.

## Deployment

This project is designed for easy deployment on Netlify:

1.  **Connect Git Repository:** Link your Git repository (GitHub, GitLab, Bitbucket) to a new or existing site on Netlify.
2.  **Configure Build Settings:** Netlify typically auto-detects settings from `netlify.toml` and `package.json`. Ensure the "Functions directory" is set to `netlify/functions`.
3.  **Set Environment Variables:** In your Netlify site dashboard, go to `Site settings > Build & deploy > Environment`. Add the required environment variables (`ALLOWED_CORS_ORIGIN`, potentially `NODE_TLS_REJECT_UNAUTHORIZED`) and ensure they are scoped correctly for each deployment context (e.g., Production, Deploy Previews, specific branches).
4.  **Trigger Deploy:** Push changes to your connected Git branch. Netlify will automatically build and deploy your functions.

Your API endpoints will be available at your Netlify site URL (e.g., `https://your-site-name.netlify.app/api/...`).

## API Endpoints / Usage

### 1. Get Station Sockets

*   **Path:** `/api/station/:id/sockets`
*   **Method:** `GET`
*   **Path Parameters:**
    *   `:id` (Required): The numerical ID of the charging station.
*   **Success Response (200 OK):**
    ```json
    [
        {
            "id": 501,
            "price": 7.5,
            "availability": "FREE" // or "IN_USE", "UNKNOWN"
        },
        {
            "id": 502,
            "price": null,
            "availability": "IN_USE"
        }
        // ... more sockets
    ]
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing station ID.
    *   `405 Method Not Allowed`: If not a GET request.
    *   `500 Internal Server Error`: General processing error within the function.
    *   `502 Bad Gateway`: Error communicating with or invalid response from the upstream EPDK API.
    *   `504 Gateway Timeout`: Request to the upstream EPDK API timed out.
*   **Example (`curl`):**
    ```bash
    curl https://your-site-name.netlify.app/api/station/123/sockets
    ```

### 2. Resolve Google Maps Redirect

*   **Path:** `/api/maps/redirect`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `url` (Required): The encoded Google Maps short URL (e.g., `https%3A%2F%2Fmaps.app.goo.gl%2F...`).
*   **Security:** Access is restricted based on the request's `Origin` header matching the configured `ALLOWED_CORS_ORIGIN`. Browsers enforce `Access-Control-Allow-Origin`.
*   **Success Response (200 OK):**
    ```json
    {
        "redirectedUrl": "https://www.google.com/maps/place/..." // The final long URL
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Missing `url` query parameter, invalid URL format, or URL is not a `maps.app.goo.gl` link.
    *   `403 Forbidden`: Request `Origin` header does not match `ALLOWED_CORS_ORIGIN` or is missing when expected.
    *   `405 Method Not Allowed`: If not a GET request.
    *   `500 Internal Server Error`: General processing error within the function.
    *   `502 Bad Gateway`: Network error trying to resolve the redirect.
    *   `504 Gateway Timeout`: Resolving the redirect timed out.
*   **Example (`curl` - Note: `curl` can bypass browser Origin checks):**
    ```bash
    # URL must be properly encoded if spaces/special chars exist
    curl 'https://your-site-name.netlify.app/api/maps/redirect?url=https://maps.app.goo.gl/oBBA2mANUTiVkk96A' \
         -H 'Origin: <YOUR_ALLOWED_CORS_ORIGIN>' # Need to manually add Origin for curl if testing the check
    ```
*   **Example (Browser JavaScript):**
    ```javascript
    const shortUrl = 'https://maps.app.goo.gl/oBBA2mANUTiVkk96A';
    const apiUrl = `/api/maps/redirect?url=${encodeURIComponent(shortUrl)}`;

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Redirected URL:', data.redirectedUrl);
        // Use the final URL
      })
      .catch(error => {
        console.error('Error fetching redirect:', error);
      });
    ```

## Security Considerations

*   **CORS Origin:** The `ALLOWED_CORS_ORIGIN` environment variable is the primary mechanism for restricting browser-based access to these functions, especially the maps redirect endpoint. **Set it to the specific origin of your frontend application.** Do not use `*` unless you intend the API to be fully public.
*   **Origin Header Check:** The `/api/maps/redirect` function includes a server-side check of the `Origin` request header for an additional layer of validation against the `ALLOWED_CORS_ORIGIN`. This helps mitigate some misuse but **can be spoofed** by non-browser clients.
*   **TLS Verification:** Disabling TLS verification (`NODE_TLS_REJECT_UNAUTHORIZED=0`) significantly weakens security by allowing connections to servers with invalid or untrusted SSL/TLS certificates. Avoid this unless absolutely unavoidable and you fully understand the risks.
*   **Rate Limiting:** Netlify has built-in rate limiting, but for high-traffic APIs, consider implementing more granular rate limiting if needed (though more complex in a standard serverless function setup).

## License

MIT
