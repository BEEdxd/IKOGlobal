"use strict";

const { MigrationEngine } = require("../../migration/core/migration-engine.js");
const { ClaudeSourceAdapter } = require("../../migration/adapters/claude-source-adapter.js");
const { ChatGPTSourceAdapter } = require("../../migration/adapters/chatgpt-source-adapter.js");
const { ChatGPTDestinationAdapter } = require("../../migration/adapters/chatgpt-destination-adapter.js");
const { ClaudeDestinationAdapter } = require("../../migration/adapters/claude-destination-adapter.js");

require("./migration-ui.js");
require("./migration-main.js");

window.IKOMigrationCore = {
    MigrationEngine,
    ClaudeSourceAdapter,
    ChatGPTSourceAdapter,
    ChatGPTDestinationAdapter,
    ClaudeDestinationAdapter
};

function start() {
    window.IKOMigrationMain?.start?.();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
    start();
}
