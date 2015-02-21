
module GUI {

    export interface ProcessGraphUI {

        clearAll() : void;

        showProcess(identifier, data : any) : void;
        getProcessDataObject(identifier) : any;
        getNode(name : string) : Node;
        getPosition(name : string) : Point;

        showTransitions(fromId, toId, datas : any[]);
        getTransitionDataObjects(fromId, toId) : any[];

        setOnSelectListener(f : (identifier) => void) : void;
        clearOnSelectListener() : void;

        setHoverOnListener(f : (identifier) => void ) : void;
        clearHoverOnListener() : void;

        setHoverOutListener(f : (identifier) => void ) : void;
        clearHoverOutListener() : void;

        setSelected(name : string) : void;
        setHover(name: string) : void;
        clearHover() : void;

        freeze() : void;
        unfreeze() : void;
    }


}