/// <reference path="map.ts" />

module SetUtil {

    export interface Set<T> {
        add(value: T) : void;
        forEach(f : (val : T, index : T) => void, thisObject?) : void;
        has(value : T): boolean;
        size(): number;
    }

    export var OrderedSet : {
        new <T>(compare : (a : T, b : T) => number): Set<T>;
    } = TreapSet;

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
}
