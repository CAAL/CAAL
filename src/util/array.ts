
module ArrayUtil {
    
    export function removeConsecutiveDuplicates<T>(array : Array<T>, byKeyFn? : (val : T) => any) : Array<T> {
        byKeyFn = byKeyFn || (x => x);
        if (array.length === 0) return [];
        var result = [array[0]];
        for (var fI=1, rI=0, len = array.length; fI < len; fI++) {
            var arrayElem = array[fI];
            if (byKeyFn(arrayElem) !== byKeyFn(result[rI])) {
                result.push(arrayElem);
                ++rI;
            }
        }
        return result;
    }

    export function sortAndRemoveDuplicates<T>(array : Array<T>, byKeyFn? : (val : T) => any) {
        var sorted = array.slice();
        if (byKeyFn) {
        	sorted.sort(keyFnToComparerFn(byKeyFn));
        } else {
        	sorted.sort();
        }
        return removeConsecutiveDuplicates(sorted, byKeyFn);
    }

    export function keyFnToComparerFn<T>(keyFn : (val : T) => any) : (a : T, b : T) => number {
    	return function (a, b) {
    		var valA = keyFn(a),
    			valB = keyFn(b);
    		if (valA < valB) return -1;
    		if (valB < valA) return 1;
    		return 0;
    	}
    }

    export function selectBest<T>(array : Array<T>, isBetter: (a : T, b :T) => boolean) {
        return array.reduce((cur, check) => {
            return isBetter(check, cur) ? check : cur;
        });
    }
}