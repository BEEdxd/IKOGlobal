const { SourceAdapter, AdapterError } = require("./adapter-interface.js");

class ChatGPTSourceAdapter extends SourceAdapter {
    constructor() {
        super("ChatGPT");
    }

    async extractSession() {
        const elements = Array.from(document.querySelectorAll("[data-message-author-role]"));
        const messages = [];
        for (const element of elements) {
            const roleValue = element.getAttribute("data-message-author-role");
            const content = element.innerText?.trim() || "";
            if (!content) continue;
            const role = roleValue === "assistant" ? "assistant" : roleValue === "system" ? "system" : "user";
            const id = `chatgpt-${messages.length + 1}`;
            messages.push({
                id,
                role,
                sourceRole: roleValue || role,
                content,
                parentId: messages.length ? messages[messages.length - 1].id : null,
                timestamp: null,
                model: null,
                raw: { text: content }
            });
        }

        if (!messages.length) {
            throw new AdapterError("No visible ChatGPT messages were found.");
        }

        return {
            platform: "chatgpt",
            conversationId: location.pathname.split("/").filter(Boolean).pop() || `chatgpt-${Date.now()}`,
            title: document.title || "ChatGPT Conversation",
            model: null,
            createdAt: null,
            updatedAt: null,
            extractorVersion: "iko-chatgpt-dom-1",
            messages,
            activeLeafId: messages[messages.length - 1].id,
            instructions: []
        };
    }
}

module.exports = { ChatGPTSourceAdapter };
