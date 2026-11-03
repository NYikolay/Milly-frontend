export const BOOT_WATCHDOG_TIMEOUT_MS = 5000;

declare global {
  interface Window {
    __millyBootWatchdog?: {
      clear: () => void;
    };
  }
}

export function getBootWatchdogScript(): string {
  return `(() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  var timer = window.setTimeout(show, ${BOOT_WATCHDOG_TIMEOUT_MS});

  function clear() {
    window.clearTimeout(timer);
    var node = document.getElementById("milly-boot-fallback");
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
    delete window.__millyBootWatchdog;
  }

  window.__millyBootWatchdog = { clear: clear };

  function show() {
    if (document.getElementById("milly-boot-fallback")) {
      return;
    }

    var root = document.documentElement;
    var theme = root.dataset
      ? root.dataset.appTheme
      : root.getAttribute("data-app-theme");
    var dark = theme
      ? theme === "dark"
      : Boolean(
          window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches,
        );
    var colors = dark
      ? {
          bg: "#171717",
          card: "#212121",
          text: "#ffffff",
          accent: "#007aff",
        }
      : {
          bg: "#f2f2f7",
          card: "#ffffff",
          text: "#303033",
          accent: "#007aff",
        };

    var overlay = document.createElement("div");
    overlay.id = "milly-boot-fallback";
    overlay.setAttribute("role", "alert");
    overlay.setAttribute("aria-live", "assertive");
    overlay.setAttribute("aria-atomic", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:calc(15px + env(safe-area-inset-top)) 15px calc(15px + env(safe-area-inset-bottom));box-sizing:border-box;background:" +
      colors.bg +
      ";color:" +
      colors.text +
      ";font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;";

    var card = document.createElement("div");
    card.style.cssText =
      "box-sizing:border-box;width:100%;max-width:28rem;padding:24px;display:flex;flex-direction:column;align-items:center;gap:15px;text-align:center;border-radius:25px;background:" +
      colors.card +
      ";";

    var title = document.createElement("h1");
    title.setAttribute("tabindex", "-1");
    title.textContent = "Нет соединения";
    title.style.cssText =
      "margin:0;font-size:24px;font-weight:700;line-height:29px;letter-spacing:-0.8px;color:" +
      colors.text +
      ";";

    var description = document.createElement("p");
    description.textContent =
      "Не удалось загрузить приложение. Проверьте подключение и попробуйте снова.";
    description.style.cssText =
      "margin:0;font-size:15px;font-weight:400;line-height:1.3;color:#7a7d83;";

    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "Повторить";
    button.style.cssText =
      "width:100%;height:50px;border-radius:25px;border:none;background:" +
      colors.accent +
      ";color:#ffffff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;";
    button.addEventListener("click", function () {
      window.location.reload();
    });

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(button);
    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);
    button.focus();
  }
})();`;
}

export function clearBootWatchdog(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.__millyBootWatchdog?.clear();
}
