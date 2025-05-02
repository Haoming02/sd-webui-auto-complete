/** A node inside the prefix tree */
class TNode {
    constructor() {
        /** @type { Map<string, TNode> } */
        this.children = {};
        /** @type { number? } */
        this.ordering = null;
        /** @type { string? } */
        this.original = null;
    }
}

/** le' Prefix Tree */
class Trie {

    constructor() { this.root = new TNode(); }

    /** @param {string} word @param {number} order @param {string} weight */
    insert(word, order, weight) {
        if (!word) return;

        const isLora = word.startsWith("<l>");
        const original = isLora ? word.substring(3) : word;
        const lowered = original.toLowerCase();

        let node = this.root;
        for (const char of lowered) {
            if (node.children[char] == undefined)
                node.children[char] = new TNode();
            node = node.children[char];
        }

        node.ordering = order;

        if (isLora)
            node.original = `<lora:${original}:${weight}>`;
        else
            node.original = original;
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

        const node = this.#searchPrefix(filter);
        if (node == null) return results;

        const limit = document.getElementById("setting_ac_limit").querySelector("input").value;

        const dfs = (currentNode, currentPrefix) => {
            if (results.length >= limit)
                return;

            if (currentNode.ordering != null) {
                results.push({
                    word: currentNode.original,
                    weight: currentNode.ordering
                });
                if (results.length >= limit)
                    return;
            }

            for (const char in currentNode.children)
                dfs(currentNode.children[char], currentPrefix + char);
        };

        dfs(node, filter);

        return results
            .sort((a, b) => a.weight - b.weight)
            .map(result => result.word);
    }

}
