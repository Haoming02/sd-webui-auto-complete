(function () {

    /** @type {Trie} */
    let trie;

    /** @type {HTMLUListElement} */
    let suggestions;

    function clear() { while (suggestions.firstChild) suggestions.firstChild.remove(); }
    function hide() { suggestions.style.display = "none"; }
    function show() {
        suggestions.style.display = "block";
        suggestions.firstChild.scrollIntoView({ behavior: 'instant', block: 'center' });
    }

    /** @param {HTMLTextAreaElement} input */
    function main(input) {
        const currentValue = input.value;

        const cursorPosition = input.selectionStart;
        const prevComma = currentValue.slice(0, cursorPosition).lastIndexOf(",");
        const prevNewline = currentValue.slice(0, cursorPosition).lastIndexOf("\n");

        const start = Math.max(prevComma, prevNewline) + 1;
        const end = cursorPosition;
        const currentWord = currentValue.slice(start, end).trim();

        const matches = trie.getMatches(currentWord);
        if (matches.length === 0) {
            hide();
            return;
        }

        clear();
        for (const tag of matches) {
            const li = document.createElement("li");
            suggestions.appendChild(li);

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
                clear();
                hide();
            });
        }

        positionSuggestions(input);
        show();
    }

    /** @param {KeyboardEvent} event */
    function intelliSense(event) {
        if (event.code === "Enter") {
            if (getComputedStyle(suggestions).display == "none")
                return;

            let currentSelected = Array.from(suggestions.children).indexOf(suggestions.querySelector(".selected"));
            suggestions.children[Math.max(0, currentSelected)].click();

            event.preventDefault();
            return;
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
            return;
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
            return;
        }
        else if (event.ctrlKey && event.code === "Space") {
            event.preventDefault();
            main(event.target);
            return;
        }

        hide();
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

    const acOnEditTimers = {};

    /** @param {HTMLTextAreaElement} field @param {string} id @param {number} autoDelay */
    function acOnEdit(field, id, autoDelay) {
        field.addEventListener("keydown", (e) => {
            if (e.ctrlKey || e.shiftKey || e.altKey)
                return;
            if (e.key.match(/^[a-zA-Z]$/)) {
                const existingTimer = acOnEditTimers[id];
                if (existingTimer) clearTimeout(existingTimer);
                acOnEditTimers[id] = setTimeout(() => { main(field); }, autoDelay);
            }
        });
    }

    /** @param {string} data */
    function setup(data) {
        trie = new Trie();
        data.trim().split("\n").forEach((tag, order) => {
            trie.insert(tag.trim(), order);
        });

        suggestions = document.createElement("ul");
        suggestions.id = "suggestions";

        document.getElementById("quicksettings").appendChild(suggestions);
        const autoDelay = document.getElementById("setting_ac_delay").querySelector("input").value;

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
            if (textArea != null) {
                textArea.addEventListener("keydown", intelliSense);
                if (autoDelay > 0)
                    acOnEdit(textArea, id, autoDelay);
            }
        }

        document.addEventListener("mousedown", (event) => {
            if (!suggestions.contains(event.target))
                hide();
        });
    }

    const delay = 10;
    const maxRetry = 10;
    let retry = 1;

    async function tryLoadCSV() {
        if (retry > maxRetry) {
            alert('[AutoComplete] Failed to Locate "tags.csv"');
            console.timeEnd('[AutoComplete] Fetch')
            return;
        }

        const csv = document.getElementById("ac_url").querySelector("textarea").value;
        const url = `${window.location.href}file=${csv}`;
        let data = undefined;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(response);
                retry++;
                setTimeout(async () => await tryLoadCSV(), delay * retry);
                return;
            }

            data = await response.text();
        } catch (error) {
            console.error(error.message);
            retry++;
            setTimeout(async () => await tryLoadCSV(), delay * retry);
            return;
        }
        console.timeEnd('[AutoComplete] Fetch')

        console.time('[AutoComplete] Init')
        setup(data);
        console.timeEnd('[AutoComplete] Init')
    }

    onUiLoaded(() => {
        setTimeout(async () => {
            console.time('[AutoComplete] Fetch'); await tryLoadCSV();
        }, delay);
    });
})();
