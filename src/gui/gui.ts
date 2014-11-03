
module GUI {
    
    export interface ProcessGraphUI {

        clearAll() : void;

        showProcess(identifier, data : any) : void;
        getProcessDataObject(identifier) : any;

        showTransitions(fromId, toId, datas : any[]);
        getTransitionDataObjects(fromId, toId) : any[];

        setOnSelectListener(f : (identifier) => void) : void;
        clearOnSelectListener() : void;
    }


}