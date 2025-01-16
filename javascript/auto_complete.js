(function () {

    /** @type {Trie} */
    let trie;

    /** @type {HTMLUListElement} */
    let suggestions;

    function clear() {
        while (suggestions.firstChild)
            suggestions.firstChild.remove();
    }
    function hide() {
        suggestions.style.display = "none";
        clear();
    }
    function show() {
        suggestions.style.display = "block";
        suggestions.firstChild.scrollIntoView({ behavior: 'instant', block: 'center' });
    }

    const opening = new Set(["(", "[", "{", " "]);

    /** @param {HTMLTextAreaElement} input */
    function main(input) {
        const currentValue = input.value;

        const cursorPosition = input.selectionStart;
        const prev = currentValue.slice(0, cursorPosition);

        const end = cursorPosition;
        let start = Math.max(
            prev.lastIndexOf("\n"),
            prev.lastIndexOf(","),
            prev.lastIndexOf(":"),
            prev.lastIndexOf("|")
        ) + 1;

        let currentWord = currentValue.slice(start, end);
        while (opening.has(currentWord.charAt(0))) {
            currentWord = currentWord.slice(1);
            start++;
        }

        const matches = trie.getMatches(currentWord);
        if (matches.length === 0) {
            hide();
            return;
        }

        clear();
        for (const tag of matches) {
            const li = document.createElement("li");
            suggestions.appendChild(li);

            if (tag.includes("lora:"))
                li.textContent = `lora:${tag.split(":")[1]}`;
            else
                li.textContent = tag;

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
            if (getComputedStyle(suggestions).display == "none")
                return;

            let currentSelected = Array.from(suggestions.children).indexOf(suggestions.querySelector(".selected"));
            suggestions.children[Math.max(0, currentSelected)].click();

            event.preventDefault();
        }
        else if (event.code === "ArrowUp") {
            if (getComputedStyle(suggestions).display == "none")
                return;

            let currentSelected = Array.from(suggestions.children).indexOf(suggestions.querySelector(".selected"));
            if (currentSelected >= 0)
                suggestions.children[currentSelected].classList.remove("selected");

            currentSelected = (Math.max(0, currentSelected) - 1 + suggestions.children.length) % suggestions.children.length;
            suggestions.children[currentSelected].classList.add("selected");
            suggestions.children[currentSelected].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });

            event.preventDefault();
        }
        else if (event.code === "ArrowDown") {
            if (getComputedStyle(suggestions).display == "none")
                return;

            let currentSelected = Array.from(suggestions.children).indexOf(suggestions.querySelector(".selected"));
            if (currentSelected >= 0)
                suggestions.children[currentSelected].classList.remove("selected");

            currentSelected = (currentSelected + 1 + suggestions.children.length) % suggestions.children.length;
            suggestions.children[currentSelected].classList.add("selected");
            suggestions.children[currentSelected].scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });

            event.preventDefault();
        }
        else if (event.ctrlKey && event.code === "Space") {
            main(event.target);
            event.preventDefault();
        }
        else {
            if ((autoDelay <= 0) || (event.ctrlKey || event.shiftKey || event.altKey)) {
                hide();
                return;
            }

            if (event.key === "Backspace" || event.key.match(/^[a-zA-Z\-\ ]$/)) {
                const existingTimer = acOnEditTimers[event.target.id];
                if (existingTimer) clearTimeout(existingTimer);
                acOnEditTimers[event.target.id] = setTimeout(() => { main(event.target); }, autoDelay);
                return;
            }

            hide();
        }
    }

    /** @param {string} text @returns {number} */
    function getTextWidth(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = "bold 12px sans-serif";
        return context.measureText(text).width;
    }

    /** @param {HTMLTextAreaElement} input */
    function positionSuggestions(input) {
        const currentValue = input.value;
        const caret = input.selectionStart;
        const prevNewline = currentValue.slice(0, caret).lastIndexOf("\n");
        const rect = input.getBoundingClientRect();

        const line = currentValue.slice(Math.max(0, prevNewline), caret);
        const lineCount = currentValue.slice(0, caret).split("\n").length + 1;

        const w = rect.left + window.scrollX + getTextWidth(line);
        const t = rect.top + window.scrollY + lineCount * 16;

        if (w < rect.width) {
            suggestions.style.left = `${w}px`;
            suggestions.style.top = `${t}px`;
        }
        else {
            suggestions.style.left = `${rect.left + window.scrollX}px`;
            suggestions.style.top = `${rect.bottom - 8}px`;
        }
    }

    /** @param {string} data */
    function setup(data) {
        const autoDelay = parseInt(document.getElementById("setting_ac_delay").querySelector("input").value);
        const loraWeight = document.getElementById("setting_extra_networks_default_multiplier")
            .querySelector("input").value.toString();

        trie = new Trie();
        data.trim().split("\n").forEach((tag, order) => {
            trie.insert(tag.trim(), order, loraWeight);
        });

        suggestions = document.createElement("ul");
        suggestions.id = "suggestions";

        document.getElementById("quicksettings").appendChild(suggestions);

        /** Expandable List of IDs in 1 place */
        const IDs = [
            'txt2img_prompt',
            'txt2img_neg_prompt',
            'img2img_prompt',
            'img2img_neg_prompt',
            'hires_prompt',
            'hires_neg_prompt'
        ];

        for (const id of IDs) {
            const textArea = document.getElementById(id)?.querySelector('textarea');
            if (textArea != null)
                textArea.addEventListener("keydown", (e) => { intelliSense(e, autoDelay); });
        }

        document.addEventListener("mousedown", (event) => {
            if (!suggestions.contains(event.target))
                hide();
        });
    }

    function loadCSV() {
        try {
            console.time('[AutoComplete] Init')
            const textbox = document.getElementById("ac_data");
            const data = textbox.querySelector("textarea").value;
            setup(data);
            textbox.remove();
            console.timeEnd('[AutoComplete] Init')
        } catch {
            alert('[AutoComplete] Failed to Load "tags.csv"');
        }
    }

    onUiLoaded(() => { loadCSV(); });
})();
