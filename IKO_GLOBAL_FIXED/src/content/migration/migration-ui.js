"use strict";

(function () {
    const UI_ID = "iko-migration-panel";

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function showStatus(node, text, type = "info") {
        node.textContent = text;
        node.className = `iko-migration-status iko-status-${type}`;
    }

    function showError(node, error) {
        console.error("[IKO Migration]", error);
        showStatus(node, error?.message || String(error), "error");
    }

    function renderReview(container, session) {
        const safe = session || {};
        const source = safe.source || {};
        const messages = Array.isArray(safe.messages) ? safe.messages : [];
        container.innerHTML = "";

        container.appendChild(el("div", "iko-review-title", "Migration Preview"));
        for (const [label, value] of [
            ["Conversation", source.title || "Untitled Session"],
            ["Messages", String(messages.length)],
            ["Source", source.platform || "Unknown"],
            ["Conversation ID", source.conversationId || "Unknown"]
        ]) {
            const row = el("div", "iko-review-row");
            row.appendChild(el("span", "iko-review-label", label));
            row.appendChild(el("strong", "iko-review-value", value));
            container.appendChild(row);
        }

        const integrity = el("div", "iko-review-integrity", "✓ Session validated and packaged");
        container.appendChild(integrity);
        container.hidden = false;
    }

    function createMigrationUI(options = {}) {
        document.getElementById(UI_ID)?.remove();

        const root = el("div", "iko-migration-root");
        root.id = UI_ID;
        const panel = el("section", "iko-migration-panel");
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");

        const header = el("header", "iko-migration-header");
        const headerText = el("div", "iko-migration-header-text");
        headerText.appendChild(el("div", "iko-migration-title", "IKO Session Migration"));
        headerText.appendChild(el("div", "iko-migration-subtitle", "One-click session transfer"));
        const close = el("button", "iko-migration-close", "×");
        close.type = "button";
        close.addEventListener("click", closeMigrationPanel);
        header.append(headerText, close);

        const body = el("div", "iko-migration-body");
        const direction = el("div", "iko-migration-direction");
        direction.appendChild(el("span", "iko-direction-source", options.sourceName || "Current AI Session"));
        direction.appendChild(el("span", "iko-direction-arrow", "→"));
        direction.appendChild(el("span", "iko-direction-destination", options.destinationName || "Destination AI"));
        body.appendChild(direction);

        const sourceCard = el("div", "iko-migration-card");
        sourceCard.appendChild(el("div", "iko-card-label", "SOURCE"));
        sourceCard.appendChild(el("div", "iko-card-title", options.sourceName || "Current AI Session"));
        sourceCard.appendChild(el("div", "iko-card-description", "Detected automatically from this tab."));
        body.appendChild(sourceCard);

        const destinationCard = el("div", "iko-migration-card");
        destinationCard.appendChild(el("div", "iko-card-label", "DESTINATION"));
        destinationCard.appendChild(el("div", "iko-card-title", options.destinationName || "Destination AI"));
        destinationCard.appendChild(el("div", "iko-card-description", "Selected automatically by IKO."));
        body.appendChild(destinationCard);

        const status = el("div", "iko-migration-status iko-status-info", "Ready to prepare migration.");
        body.appendChild(status);

        const review = el("div", "iko-migration-review");
        review.hidden = true;
        body.appendChild(review);

        const actions = el("div", "iko-migration-actions");
        const cancel = el("button", "iko-migration-button secondary", "Cancel");
        cancel.type = "button";
        cancel.addEventListener("click", closeMigrationPanel);
        const prepare = el("button", "iko-migration-button primary", "Prepare Migration");
        prepare.type = "button";
        actions.append(cancel, prepare);
        body.appendChild(actions);

        const openDestination = el("button", "iko-migration-button destination", `Open ${options.destinationName || "Destination"}`);
        openDestination.type = "button";
        openDestination.disabled = true;
        body.appendChild(openDestination);

        panel.append(header, body);
        root.appendChild(panel);
        document.body.appendChild(root);

        let migrationPackage = null;

        prepare.addEventListener("click", async () => {
            prepare.disabled = true;
            openDestination.disabled = true;
            showStatus(status, "Preparing migration…", "loading");
            review.hidden = true;

            try {
                const result = await options.onPrepareMigration?.(options.destinationId, {
                    sourceId: options.sourceId,
                    destinationId: options.destinationId
                });
                if (!result) throw new Error("Migration returned no package.");
                migrationPackage = result.migrationPackage || result.package || result;
                renderReview(review, result.session || migrationPackage.session || result);
                showStatus(status, "Migration package ready.", "success");
                openDestination.disabled = false;
                prepare.textContent = "Migration Ready";
            } catch (error) {
                showError(status, error);
                prepare.disabled = false;
                prepare.textContent = "Prepare Migration";
            }
        });

        openDestination.addEventListener("click", async () => {
            openDestination.disabled = true;
            showStatus(status, `Opening ${options.destinationName || "destination"}…`, "loading");
            try {
                await options.onOpenDestination?.(options.destinationId, migrationPackage);
                showStatus(status, "Destination opened.", "success");
            } catch (error) {
                openDestination.disabled = false;
                showError(status, error);
            }
        });

        root.addEventListener("click", event => {
            if (event.target === root) closeMigrationPanel();
        });

        const escape = event => {
            if (event.key === "Escape") closeMigrationPanel();
        };
        document.addEventListener("keydown", escape, { once: true });

        requestAnimationFrame(() => root.classList.add("iko-migration-visible"));

        function closeMigrationPanel() {
            document.removeEventListener("keydown", escape);
            root.remove();
            options.onClose?.();
        }

        return {
            root,
            close: closeMigrationPanel
        };
    }

    window.IKOMigrationUI = {
        createMigrationUI,
        open: () => window.IKOMigrationMain?.open?.(),
        close: () => window.IKOMigrationMain?.close?.(),
        showError: error => console.error("[IKO Migration]", error)
    };
})();
