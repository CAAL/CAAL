interface WebStorage {
    get(key: string): string;
    getJSON(key: string): any;
    set(key: string, value: string): void;
    isCompatible(): boolean;
}

class LocalStorage implements WebStorage {
    public get(key: string): string {
        if (this.isCompatible()) {
            return localStorage.getItem(key);
        }
    }

    public getJSON(key: string): any {
        var value = this.get(key);

        try {
            return JSON.parse(value);
        } catch(error) {
            console.log('Not valid JSON.');
        }
    }

    public set(key: string, value: string): void {
        if (this.isCompatible()) {
            localStorage.setItem(key, value);
        }
    }

    public isCompatible(): boolean {
        if (typeof(Storage) !== 'undefined') {
            return true;
        } else {
            alert('Your browser does not support Web Storage.');
            return false;
        }
    }
}

/*class SessionStorage implements WebStorage {
    
}*/
