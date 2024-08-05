interface LRUNode<Key, Value> {
    fresh: LRUNode<Key, Value> | undefined;
    stale: LRUNode<Key, Value> | undefined;
    key: Key;
    value: Value;
}

export class LRUCache<Key, Value, UpdateInfo> {
    fresh: LRUNode<Key, Value> | undefined = undefined;
    stale: LRUNode<Key, Value> | undefined = undefined;

    index = new Map<Key, LRUNode<Key, Value>>();
    empty_space: number;

    constructor(private capacity: number, private create: () => Value, private reuse: (value: Value, update_info: UpdateInfo) => void) {
        console.assert(capacity >= 1);
        this.empty_space = capacity;
    }

    get(key: Key, update_info: UpdateInfo): Value {
        let node = this.index.get(key);
        if (node !== undefined) {
            // cache hit
            this.mtt(node);
        } else if (this.empty_space > 0) {
            // cache miss, full capacity is not reached yet
            this.empty_space--;
            node = {
                fresh: undefined,
                stale: undefined,
                key,
                value: this.create()
            };
            if (this.fresh === undefined) {
                this.stale = this.fresh = node;
            } else {
                this.fresh.fresh = node;
                node.stale = this.fresh;
                this.fresh = node;
            }
            this.reuse(node.value, update_info);
            this.index.set(key, node);
        } else {
            // cache hit
            // cache miss, evict the most stale
            node = this.stale as LRUNode<Key, Value>;
            this.mtt(node);
            this.reuse(node.value, update_info);
            this.index.delete(node.key);
            this.index.set(key, node);
            node.key = key;
        }

        return node.value;
    }

    private mtt(node: LRUNode<Key, Value>) {
        if (node === this.fresh) return;
        const next = node.fresh as LRUNode<Key, Value>;// can assert because node is not the most fresh
        if (node === this.stale) {
            this.stale = next;
        } else {
            const prev = node.stale as LRUNode<Key, Value>;// can assert because node is not the most stale
            prev.fresh = node.fresh;
        }
        next.stale = node.stale;
        // at this point node is not a part of the list, need to move it to the fresh end

        node.stale = this.fresh
        node.fresh = undefined
        //can assert because mtt is never called with empty cache
        this.fresh!.fresh = node
        this.fresh = node
    }
}
