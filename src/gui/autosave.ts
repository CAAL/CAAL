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
            if ( this.checkAutosave() ) {
                //this will alert user
                this.setAutosave(null);
                return 'You have unsaved data!';
            }
            else {
                //this wont
                window.onbeforeunload = undefined;
            }
        };
    }
    
    public autoSaveToStorage() : void {
        var id = this.project.getId();
                
        this.storage.setObj("autosave", this.project.toJSON());

        $(document).trigger("save");
    }

    public resetTimer() {
        clearTimeout(this.timer);
        this.timer = setTimeout( () => this.autoSaveToStorage(), this.DELAY );
    }

    public checkAutosave() : boolean {
        if(this.storage.getObj("autosave")) {
            return true;
        } else {
            return false;
        }
    }

    public getAutosave() {
        return (this.storage.getObj("autosave"));
    }

    public setAutosave(value) : void {
        this.storage.setObj("autosave", value);
    }

    
}
