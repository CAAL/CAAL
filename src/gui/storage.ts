class WebStorage {
    private storageObj: Storage;

    public constructor(storageObj: Storage) {
        this.storageObj = storageObj;
    }

    public getStorageObj(): Storage {
        return this.storageObj;
    }

    public get(key: string): string {
        if (!this.isCompatible()) {return;}

        return this.storageObj.getItem(key);
    }

    public getObj(key: string): any {
        if (!this.isCompatible()) {return;}

        try {
            return JSON.parse(this.get(key));
        } catch (e) {
            console.log('Invalid JSON: ' + e.message);
        }
    }

    public set(key: string, value: string): void {
        if (!this.isCompatible()) {return;}

        this.storageObj.setItem(key, value);
    }

    public setObj(key: string, value: Object): void {
        if (!this.isCompatible()) {return;}

        try {
            this.set(key, JSON.stringify(value));
        } catch (e) {
            console.log('Invalid JSON: ' + e.message);
        }
    }

    public delete(key: string): void {
        if (!this.isCompatible()) {return;}

        this.storageObj.removeItem(key);
    }

    private isCompatible(): boolean {
        if (typeof(Storage) !== 'undefined') {
            return true;
        } else {
            console.log('Your browser does not support Web Storage.');
            return false;
        }
    }
}
