const { SourceAdapter, AdapterError } = require("./adapter-interface.js");

class ClaudeSourceAdapter extends SourceAdapter {
    constructor() {
        super("Claude");
    }

    async extractSession() {
        const bridge = globalThis.window?.IKO?.claudeBridge;
        if (!bridge) {
            throw new AdapterError("Claude bridge is not available. Reload Claude and try again.");
        }

        if (!bridge.latestConversation) {
            bridge.requestConversationRefresh?.();
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new AdapterError("Claude conversation data was not received. Make sure a Claude conversation is open."));
                }, 10000);
                const handler = () => {
                    if (globalThis.window?.IKO?.claudeBridge?.latestConversation) {
                        cleanup();
                        resolve();
                    }
                };
                const cleanup = () => {
                    clearTimeout(timeout);
                    window.removeEventListener("iko-claude-conversation-updated", handler);
                };
                window.addEventListener("iko-claude-conversation-updated", handler);
                handler();
            });
        }

        const conversation = bridge.latestConversation;
        const rawMessages = conversation?.chat_messages || conversation?.messages || conversation?.conversation_messages || [];
        if (!Array.isArray(rawMessages) || !rawMessages.length) {
            throw new AdapterError("No Claude messages were found in the current conversation.");
        }

        const messages = [];
        for (const raw of rawMessages) {
            const role = raw?.sender === "human" || raw?.sender === "user" || raw?.role === "user"
                ? "user"
                : raw?.sender === "assistant" || raw?.role === "assistant"
                    ? "assistant"
                    : null;
            if (!role) continue;

            const content = this.extractText(raw).trim();
            if (!content) continue;

            const id = String(raw.uuid || raw.id || `claude-${messages.length + 1}`);
            const parentId = raw.parent_message_uuid || raw.parentId || (messages.length ? messages[messages.length - 1].id : null);
            messages.push({
                id,
                role,
                sourceRole: raw.sender || raw.role || role,
                content,
                parentId,
                timestamp: raw.created_at || raw.timestamp || null,
                model: raw.model || null,
                raw
            });
        }

        if (!messages.length) {
            throw new AdapterError("Claude conversation contains no usable user/assistant messages.");
        }

        // Repair parent references so the normalized active branch is always valid.
        const ids = new Set(messages.map(message => message.id));
        for (let i = 0; i < messages.length; i += 1) {
            if (i === 0) {
                messages[i].parentId = null;
            } else if (!ids.has(messages[i].parentId)) {
                messages[i].parentId = messages[i - 1].id;
            }
        }

        return {
            platform: "claude",
            conversationId: String(conversation.uuid || conversation.id || location.pathname || `claude-${Date.now()}`),
            title: conversation.name || conversation.title || document.title.replace(/\s*[—|-]\s*Claude.*$/i, "") || "Claude Conversation",
            model: conversation.model || null,
            createdAt: conversation.created_at || null,
            updatedAt: conversation.updated_at || null,
            extractorVersion: "iko-claude-1",
            messages,
            activeLeafId: messages[messages.length - 1].id,
            instructions: []
        };
    }

    extractText(message) {
        if (typeof message?.text === "string") return message.text;
        if (typeof message?.content === "string") return message.content;
        if (Array.isArray(message?.content)) {
            return message.content
                .filter(block => block && block.type === "text")
                .map(block => block.text || "")
                .join("\n");
        }
        if (typeof message?.message?.content === "string") return message.message.content;
        return "";
    }
}

module.exports = { ClaudeSourceAdapter };
