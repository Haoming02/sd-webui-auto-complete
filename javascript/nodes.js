/** A node inside the prefix tree */
class TNode {
    constructor() {
        /** @type { Map<string, TNode> } */
        this.children = new Map();
        /** @type { Array<[number, string]> } */
        this.terminals = [];
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
                if (node.children.get(char) === undefined) node.children.set(char, new TNode());
                node = node.children.get(char);
            }
            node.terminals.push([order * (first ? 1.0 : 2.0), final_text]);
        };

        const lowered = raw_tag.toLowerCase();
        insert_str(lowered, true);

        const tokens = raw_tag
            .split(/[\s\-_]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[a-zA-Z])(?<![vV])(?=[0-9])|(?<=[0-9])(?=[a-zA-Z])|(?=[vV][0-9])/)
            .map((t) => t.toLowerCase())
            .filter((t) => t.length > 0)
            .slice(1);

        for (const part of tokens) {
            insert_str(part, false);
        }
    }

    /** @param {string} filter @returns {TNode?} */
    #searchPrefix(filter) {
        let node = this.root;
        for (const char of filter) {
            if (node.children.get(char) === undefined) return null;
            node = node.children.get(char);
        }
        return node;
    }

    /** @param {string} filter @returns {string[]} sorted by relevance (best first) */
    getMatches(filter) {
        if (!filter) return [];

        const node = this.#searchPrefix(filter.toLowerCase());
        if (node == null) return [];

        const results = [];
        const seen = new Set();

        const dfs = (currentNode) => {
            for (const [weight, original] of currentNode.terminals) {
                if (seen.has(original)) continue;
                results.push([original, weight]);
                seen.add(original);
            }

            for (const [_, child] of currentNode.children) dfs(child);
        };

        dfs(node);
        results.sort((a, b) => a[1] - b[1]);

        return results.map(([text]) => text);
    }
}
