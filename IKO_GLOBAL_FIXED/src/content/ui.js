"use strict";

window.IKO = window.IKO || {};

window.IKO.ui = {
  hud: null,
  repositionTimer: null,

  /*
   * ==========================================
   * FIXED HUD POSITION
   * ==========================================
   *
   * The HUD is intentionally NOT attached to
   * the AI composer.
   *
   * This prevents it from appearing in the
   * middle of the chat box.
   */

  position() {
    const hud =
      this.hud ||
      document.getElementById(
        "iko-context-hud"
      );

    if (!hud) {
      return;
    }

    /*
     * Fixed bottom-right position.
     *
     * Increase bottom if you want it
     * further away from the composer.
     */
    hud.style.position = "fixed";

    hud.style.right = "24px";
    hud.style.bottom = "105px";

    hud.style.left = "auto";
    hud.style.top = "auto";

    hud.style.zIndex =
      "2147483640";
  },

  /*
   * ==========================================
   * POSITION TRACKING
   * ==========================================
   */

  startPositionTracking() {
    this.position();

    window.addEventListener(
      "resize",
      () => this.position()
    );

    /*
     * Re-apply position occasionally because
     * ChatGPT/Claude can dynamically modify
     * their page layout.
     */
    if (this.repositionTimer) {
      clearInterval(
        this.repositionTimer
      );
    }

    this.repositionTimer =
      setInterval(
        () => this.position(),
        2000
      );
  },

  /*
   * ==========================================
   * CREATE HUD
   * ==========================================
   */

  create() {
    /*
     * Prevent duplicate HUDs.
     */
    const existing =
      document.getElementById(
        "iko-context-hud"
      );

    if (existing) {
      this.hud = existing;
      this.position();
      return;
    }

    const hud =
      document.createElement("div");

    hud.id =
      "iko-context-hud";

    hud.innerHTML = `
            <div class="iko-hud-main">

                <!-- HEADER -->
                <div class="iko-hud-top">

                    <div class="iko-hud-brand">
                        <span
                            class="iko-hud-dot"
                        ></span>

                        <span>IKO</span>
                    </div>

                    <span
                        id="iko-hud-platform"
                        class="iko-hud-platform"
                    >
                        AI
                    </span>

                </div>


                <!-- STATS -->
                <div class="iko-hud-stats">

                    <div
                        class="iko-hud-stat"
                    >
                        <span>
                            Context
                        </span>

                        <strong
                            id="iko-hud-tokens"
                        >
                            0
                        </strong>
                    </div>


                    <div
                        class="iko-hud-stat"
                    >
                        <span>
                            Usage
                        </span>

                        <strong
                            id="iko-hud-usage"
                        >
                            0%
                        </strong>
                    </div>

                </div>


                <!-- LOADING -->
                <div
                    class="iko-hud-loading"
                    id="iko-hud-loading"
                    hidden
                >

                    <div
                        class="iko-hud-loading-track"
                    >
                        <div
                            id="iko-hud-loading-bar"
                        ></div>
                    </div>

                    <span
                        id="iko-hud-loading-text"
                    >
                        Counting context…
                    </span>

                </div>


                <!-- MAIN PROGRESS -->
                <div
                    class="iko-hud-progress"
                >
                    <div
                        id="iko-hud-progress-bar"
                    ></div>
                </div>


                <!-- STATUS -->
                <div
                    id="iko-hud-status"
                    class="iko-hud-status"
                >
                    Ready
                </div>

            </div>
        `;

    /*
     * Put it directly on documentElement
     * so ChatGPT/Claude containers don't
     * affect its position.
     */
    document.documentElement.appendChild(
      hud
    );

    this.hud = hud;

    /*
     * Detect current platform.
     */
    const platform =
      window.IKO?.platform
        ?.detect?.();

    const platformElement =
      document.getElementById(
        "iko-hud-platform"
      );

    if (platformElement) {
      platformElement.textContent =
        platform || "AI";
    }

    /*
     * Position after DOM paint.
     */
    requestAnimationFrame(
      () => this.position()
    );

    this.startPositionTracking();
  },

  /*
   * ==========================================
   * LOADING STATE
   * ==========================================
   */

  setLoading(
    loading,
    message = "Counting context…"
  ) {
    const loadingElement =
      document.getElementById(
        "iko-hud-loading"
      );

    const statusElement =
      document.getElementById(
        "iko-hud-status"
      );

    const loadingBar =
      document.getElementById(
        "iko-hud-loading-bar"
      );

    const loadingText =
      document.getElementById(
        "iko-hud-loading-text"
      );

    if (!loadingElement) {
      return;
    }

    if (loading) {

      /*
       * Show loading row.
       */
      loadingElement.hidden =
        false;

      if (loadingText) {
        loadingText.textContent =
          message;
      }

      if (statusElement) {
        statusElement.textContent =
          message;
      }

      if (loadingBar) {

        loadingBar.style.width =
          "35%";

        loadingBar.classList.add(
          "iko-indeterminate"
        );
      }

      this.position();

      return;
    }

    /*
     * Stop loading.
     */
    loadingElement.hidden =
      true;

    if (loadingBar) {

      loadingBar.style.width =
        "0%";

      loadingBar.classList.remove(
        "iko-indeterminate"
      );
    }
  },

  /*
   * ==========================================
   * UPDATE DATA
   * ==========================================
   */

  update(data) {

    const tokens =
      Number(
        data?.tokens || 0
      );

    const percentage =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            data?.usagePercentage ??
            0
          )
        )
      );


    const tokenElement =
      document.getElementById(
        "iko-hud-tokens"
      );

    const usageElement =
      document.getElementById(
        "iko-hud-usage"
      );

    const progress =
      document.getElementById(
        "iko-hud-progress-bar"
      );

    const status =
      document.getElementById(
        "iko-hud-status"
      );

    const platformElement =
      document.getElementById(
        "iko-hud-platform"
      );


    /*
     * Token count
     */
    if (tokenElement) {
      tokenElement.textContent =
        tokens.toLocaleString();
    }


    /*
     * Usage percentage
     */
    if (usageElement) {

      if (
        data?.usagePercentage ==
        null
      ) {
        usageElement.textContent =
          "—";
      } else {
        usageElement.textContent =
          `${percentage}%`;
      }
    }


    /*
     * Platform
     */
    if (
      platformElement &&
      data?.platform
    ) {
      platformElement.textContent =
        data.platform;
    }


    /*
     * Progress bar
     */
    if (progress) {
      progress.style.width =
        `${percentage}%`;
    }


    /*
     * Status
     */
    if (status) {

      status.textContent =
        data?.status ||
        data?.measurement ||
        "Context measured";
    }


    /*
     * Stop loading animation.
     */
    this.setLoading(false);


    /*
     * Make sure it stays in the
     * bottom-right position.
     */
    requestAnimationFrame(
      () => this.position()
    );
  }
};