(function () {

    /** @type {Trie} */
    let trie;

    /** @type {HTMLUListElement} */
    let suggestions;

    function hide() { suggestions.style.display = "none"; }
    function show() {
        suggestions.firstChild.scrollIntoView({ behavior: 'instant', block: 'center' });
        suggestions.style.display = "block";
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

            /** @type {HTMLTextAreaElement} */
            const input = event.target;
            const currentValue = input.value;

            const cursorPosition = input.selectionStart;
            const prevComma = currentValue.slice(0, cursorPosition).lastIndexOf(",");

            const start = prevComma + 1;
            const end = cursorPosition;
            const currentWord = currentValue.slice(start, end).trim();

            const matches = trie.getMatches(currentWord);
            if (matches.length === 0) {
                hide();
                return;
            }

            while (suggestions.firstChild)
                suggestions.firstChild.remove();

            for (const tag of matches) {
                const li = document.createElement("li");
                suggestions.appendChild(li);

                li.textContent = tag;
                li.addEventListener("click", () => {
                    if (start === 0) {
                        input.value = `${tag}, ${currentValue.slice(end)}`;
                        input.setSelectionRange(tag.length + 1, tag.length + 1);
                    } else {
                        input.value = `${currentValue.slice(0, start)} ${tag}, ${currentValue.slice(end)}`;
                        input.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
                    }
                    updateInput(input);
                    hide();
                });
            }

            positionSuggestions(input);
            show();
            return;
        }

        hide();
    }

    /** @param {HTMLTextAreaElement} input */
    function positionSuggestions(input) {
        const rect = input.getBoundingClientRect();
        suggestions.style.top = `${rect.bottom + window.scrollY}px`;
        suggestions.style.left = `${rect.left + window.scrollX}px`;
    }

    /** @param {string} data */
    function setup(data) {
        trie = new Trie();

        console.time('[AutoComplete] Init')
        for (const tag of data.split("\n"))
            trie.insert(tag.replaceAll("_", " ").replaceAll("(", "\\(").replaceAll(")", "\\)").trim());
        console.timeEnd('[AutoComplete] Init')

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
                textArea.addEventListener("keydown", intelliSense);
        }
    }

    const delay = 100;
    const maxRetry = 10;
    let retry = 0;

    async function tryLoadCSV() {
        if (retry > maxRetry) {
            alert('[AutoComplete] Failed to Locate "selected_tags.csv"');
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
                setTimeout(async () => await tryLoadCSV(), delay);
                return;
            }

            data = await response.text();
        } catch (error) {
            console.error(error.message);
            retry++;
            setTimeout(async () => await tryLoadCSV(), delay);
            return;
        }

        setup(data.trim());
    }

    onUiLoaded(() => { setTimeout(async () => await tryLoadCSV(), delay); });
})();
