interface WebStorage {
	set(key: string, value: string): void;
    get(key: string): string;
    append(key: string, value: string): void;
    isCompatible(): boolean;
}

class LocalStorage implements WebStorage {
    public set(key: string, value: string): void {
        if (this.isCompatible()) {
            localStorage[key] = value;
        }
    }

	public get(key: string): string {
        if (this.isCompatible()) {
            return localStorage[key];
        }
    }

    public append(key: string, value: string): void {
        if (this.isCompatible()) {
            localStorage[key] = this.get(key) 
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
