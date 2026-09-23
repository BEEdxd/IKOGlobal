window.IKO = window.IKO || {};

window.IKO.platform = {
    detect() {
        const host = window.location.hostname;

        if (host.includes("chatgpt")) return "ChatGPT";
        if (host.includes("claude")) return "Claude";
        if (host.includes("gemini")) return "Gemini";
        if (host.includes("perplexity")) return "Perplexity";
        if (host.includes("copilot")) return "Copilot";
        if (host.includes("grok")) return "Grok";

        return "Unknown";
    }
};