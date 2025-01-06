/** A node inside the prefix tree */
class TNode {
    constructor() {
        /** @type { Map<string, TNode> } */
        this.children = {};
        /** @type { boolean } */
        this.isEndOfWord = false;
    }
}

/** le' Prefix Tree */
class Trie {

    constructor() { this.root = new TNode(); }

    /** @param {string} word */
    insert(word) {
        let node = this.root;
        for (const char of word) {
            if (node.children[char] == undefined)
                node.children[char] = new TNode();
            node = node.children[char];
        }
        node.isEndOfWord = true;
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
            if (currentNode.isEndOfWord) results.push(currentPrefix);
            for (const char in currentNode.children) {
                dfs(currentNode.children[char], currentPrefix + char);
            }
        };

        dfs(node, filter);
        return results;
    }

}
