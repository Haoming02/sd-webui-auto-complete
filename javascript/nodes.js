/** A node inside the prefix tree */
class TNode {
    constructor() {
        /** @type { Map<string, TNode> } */
        this.children = {};
        /** @type { Array<{weight: number, original: string}> } */
        this.terminals = [];
    }
}

/** le' Prefix Tree */
class Trie {
    constructor() {
        this.root = new TNode();
    }

    /** @param {string} word @param {number} order @param {string} weight */
    insert(word, order, weight) {
        if (!word) return;

        const is_lora = word.startsWith("<l>");
        const raw_tag = is_lora ? word.substring(3) : word;
        const final_text = is_lora ? `<lora:${raw_tag}:${weight}>` : raw_tag;

        const insert_str = (str, first) => {
            const lowered = str.toLowerCase();
            let node = this.root;
            for (const char of lowered) {
                if (node.children[char] == undefined) node.children[char] = new TNode();
                node = node.children[char];
            }
            node.terminals.push({ weight: order + (first ? 0 : 8192), original: final_text });
        };

        insert_str(raw_tag, true);

        if (raw_tag.includes(" ")) {
            const parts = raw_tag.split(" ");
            for (const part of parts) {
                insert_str(part, false);
            }
        }
    }

    /** @param {string} filter @returns {TNode?} */
    #searchPrefix(filter) {
        let node = this.root;
        for (const char of filter) {
            if (node.children[char] == undefined) return null;
            node = node.children[char];
        }
        return node;
    }

    /** @param {string} filter @returns {string[]} */
    getMatches(filter) {
        const results = [];
        if (!filter) return results;

        const node = this.#searchPrefix(filter.toLowerCase());
        if (node == null) return results;

        const seen = new Set();

        const dfs = (currentNode) => {
            if (currentNode.terminals.length > 0) {
                for (const terminal of currentNode.terminals) {
                    if (!seen.has(terminal.original)) {
                        results.push({
                            word: terminal.original,
                            weight: terminal.weight,
                        });
                        seen.add(terminal.original);
                    }
                }
            }

            for (const char in currentNode.children) {
                dfs(currentNode.children[char]);
            }
        };

        dfs(node);

        const limit = document.getElementById("setting_ac_limit").querySelector("input").value;
        return results
            .sort((a, b) => a.weight - b.weight)
            .map((result) => result.word)
            .slice(0, limit);
    }
}
