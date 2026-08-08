(function () {
    var explicit = window.SMART_HIRE_API_BASE || localStorage.getItem("smarthire.apiBase") || "";
    // Centralized backend API base URL. The frontend and the Spring Boot backend
    // run on separate origins, so the base URL is never derived from the browser
    // origin. An explicit override (window.SMART_HIRE_API_BASE or localStorage
    // "smarthire.apiBase") is honored; otherwise the centralized backend URL is
    // used. JWT Authorization is preserved by request() below.
    var baseUrl = (explicit || "http://localhost:8080").replace(/\/$/, "");

    var getToken = function () {
        return localStorage.getItem("authToken") || "";
    };

    var clearSessionAndRedirect = function () {
        localStorage.removeItem("authToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");

        if (window.location.pathname.indexOf("/pages/") >= 0) {
            window.location.href = "../index.html";
        }
    };

    var buildUrl = function (path) {
        if (typeof path !== "string") {
            return baseUrl;
        }
        if (path.indexOf("http://") === 0 || path.indexOf("https://") === 0) {
            return path;
        }
        return baseUrl + (path.charAt(0) === "/" ? path : "/" + path);
    };

    var request = async function (path, options) {
        var opts = options || {};
        var headers = new Headers(opts.headers || {});
        if (!headers.has("Authorization") && getToken()) {
            headers.set("Authorization", "Bearer " + getToken());
        }

        var retries = Number.isFinite(opts.retries) ? opts.retries : 1;
        var attempt = 0;

        while (attempt <= retries) {
            try {
                var response = await fetch(buildUrl(path), {
                    method: opts.method || "GET",
                    headers: headers,
                    body: opts.body,
                    keepalive: Boolean(opts.keepalive)
                });

                if (response.status === 401) {
                    clearSessionAndRedirect();
                    throw new Error("Unauthorized");
                }

                if (!response.ok) {
                    var message = "HTTP " + response.status;
                    try {
                        var errorPayload = await response.clone().json();
                        if (errorPayload && errorPayload.message) {
                            message = errorPayload.message;
                        }
                    } catch (error) {
                    }

                    if (response.status >= 500 && attempt < retries) {
                        attempt += 1;
                        continue;
                    }

                    throw new Error(message);
                }

                return response;
            } catch (error) {
                if (attempt >= retries) {
                    throw error;
                }
                attempt += 1;
            }
        }

        throw new Error("Request failed");
    };

    var requestJson = async function (path, options) {
        var response = await request(path, options || {});
        var text = await response.text();
        if (!text) {
            return null;
        }
        try {
            return JSON.parse(text);
        } catch (error) {
            throw new Error("Invalid JSON response");
        }
    };

    window.smartHireApi = {
        baseUrl: baseUrl,
        buildUrl: buildUrl,
        request: request,
        requestJson: requestJson
    };
})();
