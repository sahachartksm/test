const storage = {
    get(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch { /* Storage can be disabled. */ }
    },
};

const chapter = document.querySelector("[data-chapter]");
const start = document.getElementById("start-reading");
const lastChapter = Number(storage.get("songyun-chapter"));

if (start && Number.isInteger(lastChapter) && lastChapter > 1 && lastChapter <= 30) {
    start.href = `read/${String(lastChapter).padStart(2, "0")}.html`;
    start.textContent = `อ่านต่อ ตอนที่ ${lastChapter}`;
}

if (chapter) {
    const themeSwitch = document.getElementById("theme-switch");
    const smaller = document.getElementById("font-smaller");
    const larger = document.getElementById("font-larger");
    const progress = document.querySelector(".reading-progress");
    const minimumSize = 16;
    const maximumSize = 28;
    let fontSize = Number(storage.get("songyun-font")) || 20;
    let dark = storage.get("songyun-theme") === "dark";

    function applyFont() {
        fontSize = Math.min(maximumSize, Math.max(minimumSize, fontSize));
        document.body.style.setProperty("--prose-size", `${fontSize / 16}rem`);
        smaller.disabled = fontSize === minimumSize;
        larger.disabled = fontSize === maximumSize;
    }

    function applyTheme() {
        document.body.classList.toggle("dark", dark);
        themeSwitch.setAttribute("aria-pressed", String(dark));
        themeSwitch.textContent = dark ? "โหมดสว่าง" : "โหมดมืด";
    }

    function updateProgress() {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 1;
        progress.style.transform = `scaleX(${ratio})`;
    }

    function changeFont(amount) {
        fontSize += amount;
        applyFont();
        storage.set("songyun-font", String(fontSize));
        updateProgress();
    }

    smaller.addEventListener("click", () => changeFont(-2));
    larger.addEventListener("click", () => changeFont(2));
    themeSwitch.addEventListener("click", () => {
        dark = !dark;
        applyTheme();
        storage.set("songyun-theme", dark ? "dark" : "light");
    });
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    if ("ResizeObserver" in window) new ResizeObserver(updateProgress).observe(chapter);
    storage.set("songyun-chapter", chapter.dataset.chapter);
    applyFont();
    applyTheme();
    updateProgress();
}
