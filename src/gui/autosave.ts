/// <reference path="storage.ts" />
/// <reference path="project.ts" />

class AutoSave {
    private project : Project;
    private storage : WebStorage;
    private timer : any;
    private DELAY = 1000;

    public constructor() {
        this.project = Project.getInstance();
        this.storage = new WebStorage(localStorage);

        window.onbeforeunload = () => {
            if (this.checkAutosave()) {
                // Alert user.
                return 'You have unsaved data!';
            }
            else {
                // Reset alert.
                window.onbeforeunload = undefined;
            }
        };

        window.onunload = () => {
            this.setAutosave(null);
        };
    }

    public autoSaveToStorage() : void {
        var id = this.project.getId();

        this.storage.setObj("autosave", this.project.toJSON());

        $(document).trigger("save");
    }

    public resetTimer() : void {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.autoSaveToStorage(), this.DELAY);
    }

    public checkAutosave() : boolean {
        if(this.storage.getObj("autosave")) {
            return true;
        } else {
            return false;
        }
    }

    public getAutosave() : any {
        return this.storage.getObj("autosave");
    }

    public setAutosave(value : any) : void {
        this.storage.setObj("autosave", value);
    }
}
