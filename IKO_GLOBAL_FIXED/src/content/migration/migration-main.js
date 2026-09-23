"use strict";

(function () {
    let migrationPanel = null;

    function getCurrentPlatform() {
        const host = location.hostname.toLowerCase();
        if (host === "claude.ai" || host.endsWith(".claude.ai")) return "claude";
        if (host === "chatgpt.com" || host.endsWith(".chatgpt.com") || host === "chat.openai.com" || host.endsWith(".chat.openai.com")) return "chatgpt";
        return null;
    }

    function getDirection() {
        const platform = getCurrentPlatform();
        if (platform === "claude") return { source: "claude", sourceName: "Claude — Current Session", destination: "chatgpt", destinationName: "ChatGPT" };
        if (platform === "chatgpt") return { source: "chatgpt", sourceName: "ChatGPT — Current Session", destination: "claude", destinationName: "Claude" };
        return null;
    }

    function createLauncher() {
        let launcher = document.getElementById("iko-migration-launcher");
        if (launcher) return launcher;
        launcher = document.createElement("button");
        launcher.id = "iko-migration-launcher";
        launcher.type = "button";
        launcher.innerHTML = `<span class="iko-migrate-icon">↗</span><span>IKO Migrate</span>`;
        launcher.addEventListener("click", openMigrationPanel);
        (document.body || document.documentElement).appendChild(launcher);
        return launcher;
    }

    function createSourceAdapter(id) {
        const core = window.IKOMigrationCore;
        if (id === "claude") return new core.ClaudeSourceAdapter();
        if (id === "chatgpt") return new core.ChatGPTSourceAdapter();
        throw new Error(`Unsupported source: ${id}`);
    }

    function createDestinationAdapter(id) {
        const core = window.IKOMigrationCore;
        if (id === "chatgpt") return new core.ChatGPTDestinationAdapter();
        if (id === "claude") return new core.ClaudeDestinationAdapter();
        throw new Error(`Unsupported destination: ${id}`);
    }

    function openMigrationPanel() {
        const existing = document.getElementById("iko-migration-panel");
        if (existing) existing.remove();
        migrationPanel = null;

        if (!window.IKOMigrationUI || !window.IKOMigrationCore) {
            console.error("[IKO Migration] Migration modules are not ready.");
            return;
        }

        const direction = getDirection();
        if (!direction) {
            console.warn("[IKO Migration] Unsupported page.");
            return;
        }

        const sourceAdapter = createSourceAdapter(direction.source);
        const destinationAdapter = createDestinationAdapter(direction.destination);
        const engine = new window.IKOMigrationCore.MigrationEngine({ sourceAdapter, destinationAdapter });
        let lastResult = null;

        migrationPanel = window.IKOMigrationUI.createMigrationUI({
            sourceId: direction.source,
            sourceName: direction.sourceName,
            destinationId: direction.destination,
            destinationName: direction.destinationName,
            directionLabel: `${direction.sourceName} → ${direction.destinationName}`,
            onPrepareMigration: async () => {
                const result = await engine.run();
                if (!result.success) throw result.error;
                lastResult = result;
                return { session: result.session, migrationPackage: result.migrationPackage };
            },
            onOpenDestination: async (_destination, migrationPackage) => {
                if (!lastResult?.migrationPackage) throw new Error("Migration package is not ready.");
                const result = await engine.prepareDestination(migrationPackage);
                if (!result.success) throw result.error;
                return result;
            },
            onClose: () => { migrationPanel = null; }
        });
    }

    function closeMigrationPanel() {
        const root = document.getElementById("iko-migration-panel");
        if (root) root.remove();
        migrationPanel = null;
    }

    function findComposer() {
        const selectors = [
            "#prompt-textarea",
            "form textarea",
            "form [contenteditable='true']",
            "form [role='textbox']",
            "textarea",
            "[contenteditable='true']",
            "[role='textbox']"
        ];
        const candidates = [];
        for (const selector of selectors) {
            document.querySelectorAll(selector).forEach(element => {
                const rect = element.getBoundingClientRect();
                if (rect.width > 250 && rect.height > 25 && rect.bottom > 0 && rect.top < innerHeight) {
                    candidates.push(element);
                }
            });
        }
        return candidates.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0] || null;
    }

    function sessionToPrompt(session) {
        const source = session?.source || {};
        const messages = Array.isArray(session?.messages) ? session.messages : [];
        const lines = [
            "IKO SESSION MIGRATION",
            `Source: ${source.platform || "AI"}`,
            `Conversation: ${source.title || "Untitled Session"}`,
            "",
            "The following is the preserved conversation context. Continue from it without losing the previous decisions, requirements, or code context.",
            "",
            "--- CONVERSATION ---"
        ];
        for (const message of messages) {
            const content = Array.isArray(message.content)
                ? message.content.map(block => block?.text || "").join("\n")
                : String(message.content || "");
            if (content.trim()) lines.push(`${String(message.role || "user").toUpperCase()}:\n${content}`);
        }
        lines.push("", "--- END CONVERSATION ---", "", "Continue from the conversation above.");
        return lines.join("\n");
    }

    function setComposerValue(element, value) {
        if (!element) return false;
        element.focus();
        if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
            const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
            setter?.call(element, value);
        } else {
            element.textContent = value;
        }
        element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
    }

    function showPendingMigration(packageData) {
        const direction = getDirection();
        if (!direction || !packageData?.session) return;
        if (packageData.source?.platform !== direction.source) return;
        if (document.getElementById("iko-pending-migration")) return;

        const bar = document.createElement("div");
        bar.id = "iko-pending-migration";
        bar.innerHTML = `
            <div>
                <strong>IKO migration ready</strong>
                <span>${packageData.session.source?.title || "Migrated session"}</span>
            </div>
            <button type="button">Insert session context</button>
            <button type="button" aria-label="Dismiss">×</button>
        `;
        document.body.appendChild(bar);

        bar.querySelector("button")?.addEventListener("click", () => {
            const composer = findComposer();
            if (!composer) {
                alert("IKO could not find the destination composer. Click the chat box and try again.");
                return;
            }
            setComposerValue(composer, sessionToPrompt(packageData.session));
            try {
                chrome.runtime.sendMessage(
                    { type: "IKO_CLEAR_MIGRATION" },
                    () => { void chrome.runtime?.lastError; }
                );
            } catch (error) {
                console.debug("[IKO Migration] Could not clear migration state:", error?.message || error);
            }
            bar.remove();
        });

        bar.querySelectorAll("button")[1]?.addEventListener("click", () => {
            bar.remove();
        });
    }

    function checkPendingMigration() {
        if (!globalThis.chrome?.runtime?.sendMessage) return;

        try {
            chrome.runtime.sendMessage(
                { type: "IKO_GET_MIGRATION" },
                response => {
                    if (chrome.runtime?.lastError) {
                        console.debug("[IKO Migration] Context unavailable:", chrome.runtime.lastError.message);
                        return;
                    }
                    if (!response?.success || !response.package) return;
                    showPendingMigration(response.package);
                }
            );
        } catch (error) {
            // A stale content script can survive an extension reload. Never let it throw.
            console.debug("[IKO Migration] Extension context unavailable:", error?.message || error);
        }
    }

    function initialize() {
        createLauncher();
        console.log("[IKO Migration] Ready:", getDirection());
        setTimeout(checkPendingMigration, 1200);
        setInterval(checkPendingMigration, 1500);
    }

    window.IKOMigrationMain = {
        start: initialize,
        open: openMigrationPanel,
        close: closeMigrationPanel,
        getDirection
    };

    window.IKO = window.IKO || {};
    window.IKO.migration = window.IKO.migration || {};
    Object.assign(window.IKO.migration, {
        start: initialize,
        open: openMigrationPanel,
        close: closeMigrationPanel,
        getDirection
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
