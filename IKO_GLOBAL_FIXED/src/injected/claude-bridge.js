(function () {
    "use strict";

    if (window.__IKO_CLAUDE_BRIDGE_INSTALLED__) {
        return;
    }

    window.__IKO_CLAUDE_BRIDGE_INSTALLED__ = true;

    const BRIDGE_SOURCE = "IKO_CLAUDE_BRIDGE";

    function publish(type, payload) {
        window.postMessage(
            {
                source: BRIDGE_SOURCE,
                type,
                payload
            },
            "*"
        );
    }

    function inspectUrl(input) {
        try {
            if (typeof input === "string") {
                return input;
            }

            if (input instanceof URL) {
                return input.href;
            }

            if (input && typeof input.url === "string") {
                return input.url;
            }

            return String(input || "");
        } catch {
            return "";
        }
    }

    function isConversationUrl(url) {
        return (
            url.includes("/chat_conversations/") &&
            (
                url.includes("tree=true") ||
                url.includes("tree%3Dtrue") ||
                url.includes("chat_conversations")
            )
        );
    }

    function isUsageUrl(url) {
        return url.includes("/usage");
    }

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const url = inspectUrl(args[0]);

        try {
            if (isConversationUrl(url)) {
                const clone = response.clone();

                clone
                    .json()
                    .then(data => {
                        publish("CONVERSATION_DATA", {
                            url,
                            data
                        });
                    })
                    .catch(() => {
                        // Not JSON or response unavailable.
                    });
            }

            if (isUsageUrl(url)) {
                const clone = response.clone();

                clone
                    .json()
                    .then(data => {
                        publish("USAGE_DATA", {
                            url,
                            data
                        });
                    })
                    .catch(() => { });
            }
        } catch (error) {
            console.debug("[IKO Claude] Fetch inspection failed:", error);
        }

        return response;
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__ikoUrl = String(url || "");
        return originalOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        const xhr = this;
        const url = xhr.__ikoUrl || "";

        if (isConversationUrl(url) || isUsageUrl(url)) {
            xhr.addEventListener("load", function () {
                try {
                    const data = JSON.parse(xhr.responseText);

                    publish(
                        isUsageUrl(url) ? "USAGE_DATA" : "CONVERSATION_DATA",
                        {
                            url,
                            data
                        }
                    );
                } catch {
                    // Ignore non-JSON responses.
                }
            });
        }

        return originalSend.apply(this, args);
    };

    publish("BRIDGE_READY", {
        href: location.href
    });
})();