/** A node inside the prefix tree */
class TNode {
    constructor() {
        /** @type { Map<string, TNode> } */
        this.children = new Map();
        /** @type { Array<[number, string]> } */
        this.terminals = [];
    }
}

class SizedHeap {
    /** @param {number} size */
    constructor(size) {
        this.maxItems = size;
        this.data = [];
    }

    /** @param {string} text @param {number} weight */
    push(text, weight) {
        if (this.data.length < this.maxItems) {
            this.data.push([text, weight]);
            return;
        }

        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i][1] > weight) {
                this.data[i] = [text, weight];
                break;
            }
        }
    }

    array() {
        return this.data.sort((a, b) => a[1] - b[1]).map((data) => data[0]);
    }
}

/** le' Prefix Tree */
class Trie {
    /** @param {number} lora_weight */
    constructor(lora_weight) {
        this.root = new TNode();
        this.lora_weight = lora_weight;
    }

    /** @param {string} word @param {number} order */
    insert(word, order) {
        if (!word) return;

        const is_lora = word.startsWith("<l>");
        const raw_tag = is_lora ? word.substring(3) : word;
        const final_text = is_lora ? `<lora:${raw_tag}:${this.lora_weight}>` : raw_tag;

        const insert_str = (str, first) => {
            let node = this.root;
            for (const char of str) {
                if (node.children.get(char) == undefined) node.children.set(char, new TNode());
                node = node.children.get(char);
            }
            node.terminals.push([order * (first ? 1.0 : 2.0), final_text]);
        };

        const lowered = raw_tag.toLowerCase();
        insert_str(lowered, true);

        if (lowered.includes(" ")) {
            const [_, ...parts] = lowered.split(" ");
            for (const part of parts) {
                insert_str(part, false);
            }
        }
    }

    /** @param {string} filter @returns {TNode?} */
    #searchPrefix(filter) {
        let node = this.root;
        for (const char of filter) {
            if (node.children.get(char) == undefined) return null;
            node = node.children.get(char);
        }
        return node;
    }

    /** @param {string} filter @returns {string[]} */
    getMatches(filter) {
        if (!filter) return [];

        const node = this.#searchPrefix(filter.toLowerCase());
        if (node == null) return [];

        const limit = document.getElementById("setting_ac_limit").querySelector("input").value;
        const results = new SizedHeap(limit);
        const seen = new Set();

        const dfs = (currentNode) => {
            if (currentNode.terminals.length > 0) {
                for (const [weight, original] of currentNode.terminals) {
                    if (seen.has(original)) continue;
                    results.push(original, weight);
                    seen.add(original);
                }
            }

            for (const [_, child] of currentNode.children) dfs(child);
        };

        dfs(node);

        return results.array();
    }
}
