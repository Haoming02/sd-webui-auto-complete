/** A node inside the prefix tree */
class TNode {
    constructor() {
        /** @type { Map<string, TNode> } */
        this.children = {};
        /** @type { number? } */
        this.weight = null;
    }
}

/** le' Prefix Tree */
class Trie {

    constructor() { this.root = new TNode(); }

    /** @param {string} word @param {number} order */
    insert(word, order) {
        let node = this.root;
        for (const char of word) {
            if (node.children[char] == undefined)
                node.children[char] = new TNode();
            node = node.children[char];
        }
        node.weight = order;
    }

    /** @param {string} filter @returns {TNode} */
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

        const dfs = (currentNode, currentPrefix) => {
            if (currentNode.weight != null)
                results.push({ word: currentPrefix, weight: currentNode.weight });
            for (const char in currentNode.children)
                dfs(currentNode.children[char], currentPrefix + char);
        };

        dfs(node, filter);
        const limit = document.getElementById("setting_ac_limit").querySelector("input").value;

        results.sort((a, b) => a.weight - b.weight);
        return results.slice(0, limit).map(result => result.word);
    }

}
