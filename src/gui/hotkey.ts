/// <reference path="jquery.hotkeys.d.ts" />

class HotkeyHandler {

    public setGlobalHotkeys(activityHandler : Activity.ActivityHandler, save : Save) {

        jQuery.hotkeys.options.filterContentEditable = false;
        jQuery.hotkeys.options.filterTextInputs = false;
        jQuery.hotkeys.options.filterInputAcceptingElements = false;

        $(document).bind('keydown', 'ctrl+1', () => {
            activityHandler.selectActivity("editor");
            return false;
        });

        $(document).bind('keydown', 'ctrl+2', () => {
            activityHandler.selectActivity("explorer");
            return false;
        });

        $(document).bind('keydown', 'ctrl+3', () => {
            activityHandler.selectActivity("verifier");
            return false;
        });

        $(document).bind('keydown', 'ctrl+4', () => {
            activityHandler.selectActivity("game");
            return false;
        });

        $(document).bind('keydown', 'ctrl+s', () => {
            save.saveToStorage();
            return false;
        });

    }
    
}
