/// <reference path="map.ts" />

module SetUtil {

    export interface Set<T> {
        add(value: T) : void;
        forEach(f : (val : T, index : T) => void, thisObject?) : void;
        has(value : T): boolean;
        size(): number;
    }

    export declare var OrderedSet : {
        new <T>(compare : (a : T, b : T) => number): Set<T>;
    }

    class TreapSet<T> implements Set<T> {

        private map : MapUtil.Map<T,T>;

        constructor(private compare : (a : T, b : T) => number) {
            this.map = new MapUtil.OrderedMap<T, T>(compare);
        }

        add(value : T) : void {
            this.map.set(value, value);
        }

        has(value : T) : boolean {
            return this.map.has(value);
        }

        forEach(f : (val : T, index : T) => void, thisObject?) : void {
            return this.map.forEach(f, thisObject); 
        }

        size() : number {
            return this.map.size();
        }
    }

    class ArraySet<T> implements Set<T> {
        private elements : T[] = [];

        constructor(private compare : (a : T, b :T) => number) {
        }

        add(value : T) {
            if (this.indexOf(value) === -1) {
                this.elements.push(value);
            }
        }

        has(value : T) {
            return this.indexOf(value) !== -1;
        }

        forEach(f : (val : T, index : T) => void, thisObject?) : void {
            var elems = this.elements;
            for (var i=0, len = elems.length; i < len; ++i) {
                //Index is the same as value - it's a set not an array!
                f.call(thisObject, elems[i], elems[i]);
            }
        }

        size() {
            return this.elements.length;
        }

        private indexOf(value : T) : number {
            var cmp = this.compare,
                elems = this.elements;
            for (var i=0, len = elems.length; i < len; ++i) {
                if (cmp(value, elems[i]) === 0) return i;
            }
            return -1;
        }
    }

    OrderedSet = ArraySet;
}
