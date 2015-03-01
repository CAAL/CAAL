module MapUtil {

    export interface Map<K,V> {
        set(key : K, val : V) : void;
        get(key : K) : V;
        has(key : K) : boolean;
        size() : number;
        forEach(f : (val : V, index: K) => void, thisArg? : any) : void;
    }

    export var OrderedMap : {
        new <K, V>(compare : (a : K, b : K) => number): Map<K, V>;
    } = TreapMap;

    class TreapNode<K, V> {
        private left : TreapNode<K, V> = null;
        private right : TreapNode<K, V> = null;
        private priority : number;

        constructor(private key, private value) {
            this.priority = treapPriority();
        }

        has(key : K, compare) {
            return this.get(key, compare) !== undefined;
        }

        get(key : K, compare) : V {
            var compareResult = compare(key, this.key);
            if (compareResult === 0) return this.value;
            else if (compareResult < 0 && this.left) return this.left.get(key, compare);
            else if (this.right) return this.right.get(key, compare);
            return undefined; //Case for no child 
        }

        //Returns whether a new key was added
        set(key : K, val : V, compare) : TreapNode<K,V> {
            var compareResult = compare(key, this.key);
            if (compareResult === 0) {
                this.value = val;
                return this;
            }   
            var parent = this;
            if (compareResult < 0) {
                if (!parent.left) {
                    parent.left = new TreapNode<K, V>(key, val);
                } else {
                    parent.left = parent.left.set(key, val, compare);
                }
                //Rotate right
                if (parent.left.priority > parent.priority) {
                    var tempChild = parent.left;
                    parent.left = tempChild.right;
                    tempChild.right = parent;
                    parent = tempChild;
                }
            } else {
                if (!parent.right) {
                    parent.right = new TreapNode<K, V>(key, val);
                } else {
                    parent.right = parent.right.set(key, val, compare);
                }
                //Rotate left
                if (parent.right.priority > parent.priority) {
                    var tempChild = parent.right;
                    parent.right = tempChild.left;
                    tempChild.left = parent;
                    parent = tempChild;
                }
            }
            return parent;
        }

        forEach(f, thisObject?) {
            if (this.left) this.left.forEach(f, thisObject);
            f.call(thisObject, this.value, this.key);
            if (this.right) this.right.forEach(f, thisObject);
        }
    }

    function treapPriority() {
        return Math.random();
    }

    class TreapMap<K, V> implements Map<K, V> {
        private root : TreapNode<K, V> = null;
        private numKeys : number = 0;
        constructor(private compare : (a : K, b : K) => number) {
        }

        has(key : K) : boolean {
            return this.root && this.root.has(key, this.compare);
        }

        set(key : K, val : V) : void {
            if (!this.root) {
                this.root = new TreapNode<K, V>(key, val);
                this.numKeys = 1;
            } else {
                this.root = this.root.set(key, val, this.compare);
            }
        }

        get(key : K) {
            if (!this.root) return undefined;
            return this.root.get(key, this.compare);
        }

        size() : number {
            //Several options.
            //1. Do the has check to check whether set will add a key. - this will mean two traversals
            //2. Return a composite value in TreapNode.set - might also hurt performance
            //3. Rewrite such that rotation start from the very bottom - requires parent pointer, since no implicit parent hierarchy like the stack had.
            throw "Not implemented yet";
            // return this.numKeys;
        }

        forEach(f, thisObject?) {
            if (this.root) this.root.forEach(f, thisObject);
        }
    }
}
