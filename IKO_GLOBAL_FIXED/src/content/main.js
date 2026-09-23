"use strict";

import { countTokens } from "gpt-tokenizer";
import "./ui.js";

window.IKO = window.IKO || {};

let timer = null;
let counting = false;

function extractMessages() {
    return Array.from(
        document.querySelectorAll("[data-message-author-role]")
    )
        .map((element) => {
            const role = element.getAttribute("data-message-author-role");
            const content = element.innerText?.trim() || "";
            if (!content) return null;
            return {
                role: role === "assistant" ? "assistant" : "user",
                content
            };
        })
        .filter(Boolean);
}

function update() {
    if (counting || !window.IKO.ui) return;

    const messages = extractMessages();

    if (!messages.length) {
        window.IKO.ui.update({
            platform: "ChatGPT",
            tokens: 0,
            messageCount: 0,
            usagePercentage: 0,
            tokenizer: "o200k_base",
            status: "Waiting for messages"
        });
        return;
    }

    counting = true;
    window.IKO.ui.setLoading(true, "Counting context…");

    try {
        const tokens = messages.reduce(
            (total, message) => total + countTokens(message.content),
            0
        );

        const budget = Number(window.IKO.config?.contextBudget || 200000);

        window.IKO.latestData = {
            platform: "ChatGPT",
            tokens,
            messageCount: messages.length,
            usagePercentage: Math.min(100, Math.round((tokens / budget) * 100)),
            tokenizer: "o200k_base",
            status: "Local tokenizer estimate"
        };

        window.IKO.ui.update(window.IKO.latestData);
    } catch (error) {
        console.error("[IKO ChatGPT] Tokenizer failed:", error);
        window.IKO.ui.update({
            platform: "ChatGPT",
            tokens: 0,
            messageCount: messages.length,
            usagePercentage: 0,
            tokenizer: "o200k_base",
            status: "Tokenizer error"
        });
    } finally {
        window.IKO.ui.setLoading(false);
        counting = false;
    }
}

function initialize() {
    console.log("[IKO ChatGPT] Context HUD initializing");
    window.IKO.ui.create();
    update();
    clearInterval(timer);
    timer = setInterval(update, 2000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
    initialize();
}
