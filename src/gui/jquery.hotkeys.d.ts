interface JQueryHotkeysOptions {
    filterInputAcceptingElements : boolean;
    filterTextInputs : boolean;
    filterContentEditable : boolean;
}

interface JQueryHotkeys {
    options : JQueryHotkeysOptions;
}

interface JQueryStatic {
    hotkeys : JQueryHotkeys;
}
