(function () {
    /** @type {Trie} */
    let trie;

    let lorasFirst = false;

    /** @type {HTMLUListElement} */
    let suggestions;

    function clear() {
        suggestions.replaceChildren();
    }

    function hide() {
        suggestions.style.display = "none";
        clear();
    }

    function show() {
        suggestions.style.display = "block";
        suggestions.firstChild.scrollIntoView({
            behavior: "instant",
            block: "center",
        });
    }

    const opening = new Set(["(", "[", "{", " "]);

    /** @param {HTMLTextAreaElement} input */
    function main(input) {
        const currentValue = input.value;

        const cursorPosition = input.selectionStart;
        const prev = currentValue.slice(0, cursorPosition);

        const end = cursorPosition;
        let start =
            Math.max(
                prev.lastIndexOf("\n"),
                prev.lastIndexOf(","),
                prev.lastIndexOf("."),
                prev.lastIndexOf(":"),
                prev.lastIndexOf("|"),
            ) + 1;

        let currentWord = currentValue.slice(start, end);
        while (opening.has(currentWord.charAt(0))) {
            currentWord = currentWord.slice(1);
            start++;
        }

        const allMatches = trie.getMatches(currentWord);

        const limit = parseInt(document.getElementById("setting_ac_limit").querySelector("input").value);
        const loras = allMatches.filter((tag) => tag.startsWith("<lora:"));
        const tags = allMatches.filter((tag) => !tag.startsWith("<lora:")).slice(0, limit);

        const matches = lorasFirst ? [...loras, ...tags] : [...tags, ...loras];
        if (matches.length === 0) {
            hide();
            return;
        }

        clear();
        for (const tag of matches) {
            const li = document.createElement("li");
            suggestions.appendChild(li);

            if (tag.includes("lora:")) li.textContent = `lora:${tag.split(":")[1]}`;
            else li.textContent = tag;

            li.addEventListener("click", () => {
                if (start === 0) {
                    input.value = `${tag}, ${currentValue.slice(end)}`;
                    input.setSelectionRange(tag.length + 1, tag.length + 1);
                } else if (currentValue.charAt(start - 1) === ",") {
                    input.value = `${currentValue.slice(0, start)} ${tag}, ${currentValue.slice(end)}`;
                    input.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
                } else {
                    input.value = `${currentValue.slice(0, start)}${tag}, ${currentValue.slice(end)}`;
                    input.setSelectionRange(start + tag.length + 1, start + tag.length + 1);
                }

                updateInput(input);
                hide();
            });
        }

        positionSuggestions(input);
        show();
    }

    /** @type {Object<string, Function>} */
    const acOnEditTimers = {};

    /** @param {KeyboardEvent} event @param {number} autoDelay */
    function intelliSense(event, autoDelay) {
        if (event.code === "Enter") {
            if (getComputedStyle(suggestions).display === "none") return;

            const currentSelected = Array.from(suggestions.children).indexOf(suggestions.querySelector(".selected"));
            suggestions.children[Math.max(0, currentSelected)].click();

            event.preventDefault();
        } else if (event.code === "ArrowUp") {
            if (getComputedStyle(suggestions).display === "none") return;

            let currentSelected = Array.from(suggestions.children).indexOf(suggestions.querySelector(".selected"));
            if (currentSelected >= 0) suggestions.children[currentSelected].classList.remove("selected");

            currentSelected = (Math.max(0, currentSelected) - 1 + suggestions.children.length) % suggestions.children.length;
            suggestions.children[currentSelected].classList.add("selected");
            suggestions.children[currentSelected].scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            event.preventDefault();
        } else if (event.code === "ArrowDown") {
            if (getComputedStyle(suggestions).display === "none") return;

            let currentSelected = Array.from(suggestions.children).indexOf(suggestions.querySelector(".selected"));
            if (currentSelected >= 0) suggestions.children[currentSelected].classList.remove("selected");

            currentSelected = (currentSelected + 1 + suggestions.children.length) % suggestions.children.length;
            suggestions.children[currentSelected].classList.add("selected");
            suggestions.children[currentSelected].scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

            event.preventDefault();
        } else if (event.ctrlKey && event.code === "Space") {
            main(event.target);
            event.preventDefault();
        } else {
            if (event.ctrlKey || event.shiftKey || event.altKey) {
                hide();
                return;
            }

            if (event.key === "Backspace" || event.key.match(/^[a-zA-Z\-\ ]$/)) {
                const existingTimer = acOnEditTimers[event.target.id];
                if (existingTimer) clearTimeout(existingTimer);
                acOnEditTimers[event.target.id] = setTimeout(() => {
                    main(event.target);
                }, autoDelay);
                return;
            }

            hide();
        }
    }

    const MIRROR_PROPS = [
        "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
        "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
        "wordBreak", "tabSize",
    ];

    const mirror = document.createElement("div");

    /** @param {HTMLTextAreaElement} input */
    function positionSuggestions(input) {
        const cs = getComputedStyle(input);
        for (const prop of MIRROR_PROPS) mirror.style[prop] = cs[prop];

        mirror.style.position = "absolute";
        mirror.style.visibility = "hidden";
        mirror.style.overflow = "hidden";
        mirror.style.boxSizing = "border-box";
        mirror.style.whiteSpace = "pre-wrap";
        mirror.style.width = `${input.offsetWidth}px`;
        mirror.style.height = "auto";

        mirror.textContent = input.value.slice(0, input.selectionStart);

        const marker = document.createElement("span");
        marker.textContent = "X";
        mirror.appendChild(marker);

        const rect = input.getBoundingClientRect();
        const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;

        const w = rect.left + window.scrollX + marker.offsetLeft - input.scrollLeft;
        const t = rect.top + window.scrollY + marker.offsetTop - input.scrollTop + lineHeight;

        if (w < rect.right + window.scrollX) {
            suggestions.style.left = `${w}px`;
            suggestions.style.top = `${t}px`;
        } else {
            suggestions.style.left = `${rect.left + window.scrollX}px`;
            suggestions.style.top = `${rect.bottom + window.scrollY - 8}px`;
        }
    }

    /** @param {string} data */
    function setup(data) {
        const extrasEl = document.getElementById("setting_ac_extras");
        lorasFirst = extrasEl
            ? Array.from(extrasEl.querySelectorAll("input")).some((i) => i.checked && i.value === "Prepend")
            : false;

        const loraID = "setting_extra_networks_default_multiplier";
        const loraWeight = document.getElementById(loraID).querySelector("input").value;
        const autoDelay = parseInt(document.getElementById("setting_ac_delay").querySelector("input").value);

        trie = new Trie(loraWeight);
        data.split("\n").forEach((tag, order) => {
            trie.insert(tag.trim(), order);
        });

        suggestions = document.createElement("ul");
        suggestions.id = "suggestions";

        document.body.appendChild(mirror);
        document.getElementById("quicksettings").appendChild(suggestions);

        /** Expandable List of IDs in 1 place */
        const IDs = [
            "txt2img_prompt",
            "txt2img_neg_prompt",
            "img2img_prompt",
            "img2img_neg_prompt",
            "hires_prompt",
            "hires_neg_prompt",
        ];

        for (const id of IDs) {
            const textArea = document.getElementById(id)?.querySelector("textarea");
            if (textArea == null) continue;
            textArea.addEventListener("keydown", (e) => {
                intelliSense(e, autoDelay);
            });
        }

        document.addEventListener("mousedown", (event) => {
            if (!suggestions.contains(event.target)) hide();
        });
    }

    function loadCSV() {
        try {
            console.time("[AutoComplete] Init");
            const textbox = document.getElementById("ac_data");
            const data = textbox.querySelector("textarea").value;
            setup(data);
            textbox.remove();
            console.timeEnd("[AutoComplete] Init");
        } catch {
            alert("[AutoComplete] Failed to Initialize...");
        }
    }

    onUiLoaded(() => {
        loadCSV();
    });
})();
