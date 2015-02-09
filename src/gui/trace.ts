/// <reference path="../../lib/snap.d.ts" />

enum TraceType {Single, Double, Collapsed};

class SnapCanvas {
    
    private currentX: number;
    private currentY: number;
    public paper: SnapPaper;
    
    private drawables: Drawable[] = [];
    
    constructor(htmlElement: string, public canvasWidth: number, public canvasHeight: number) {
        this.paper = Snap(htmlElement);
        this.draw();
    }
    
    public addDrawable(drawable: Drawable) {
        this.drawables.push(drawable);
    }
    
    public setSize(width: number, height: number) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.draw();
    }
    
    public draw() {
        this.paper.clear();

        this.currentX = Trace.LineBorder;
        this.currentY = Trace.LineBorder;
        
        this.drawables.forEach( (item) => {
            item.draw(this, this.currentX, this.currentY);
            this.currentY += item.height; // should be equal to one or more LineHeight
        });
        
        /* draw a centered line for debugging */
        //this.paper.rect(this.canvasWidth/2, 0, 1, this.canvasHeight);
    }
    
    static setTextAttr(textElement: SnapElement) {
        textElement.attr({"font-family": "monospace", "font-weight": "bold", "font-size": Trace.FontSize, "text-anchor":"middle", "fill": "#000"});
        return textElement;
    }
}

class Tip {

    static tip;
    static over: boolean;
    static tipText: string;

    private static constructed: boolean = false;
    
    constructor(private elementText: string) {
        if (!Tip.constructed) {
            Tip.constructed = true;
            
            Tip.tip = $("#tip").hide();
            Tip.over = false;
            
            var timer;
            var lock: boolean = true;
            $(document).mousemove(function(e){
                if (lock) {
                    //lock = false;
                    if(Tip.over) {
                        Tip.tip.css("left", e.clientX).css("top", e.clientY); // dont add a value to clientX or clientY here, it's not relative to how the user has zoomed
                        Tip.tip.text(Tip.tipText);
                    }
                    //setTimeout(() => lock = true, 35);
                }
            });
        }
    }
    
    private hoverIn() {
        Tip.tipText = this.elementText;
        Tip.tip.show();
        Tip.over = true;
    }

    private hoverOut() {
        Tip.tip.hide();
        Tip.over = false;
    }
    
    public addTip(element: SnapElement): void {
        if (this.elementText.length > 0)
            element.hover( () => this.hoverIn(), () => this.hoverOut());
    }
}

interface Drawable {
    width: number;
    height: number;
    draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement;
    measureWidth(snapCanvas: SnapCanvas);
}

class SnapGame implements Drawable {
    public width: number = 0;
    public height: number = 0;

    private leftLts: Trace;
    private rightLts: Trace;
    
    static StartStateColor: string = "#2c3e50";
    static ComputerColor: string = "#e74c3c";
    static PlayerColor: string = "#2980b9";
    
    static StepCounter: number = 0;
    
    constructor(private leftProcessName: string, private rightProcessName: string, private traceType: TraceType) {
        this.leftLts = new Trace([], false);
        this.rightLts = new Trace([], false);

        // start states
        this.leftLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, this.leftProcessName, SnapGame.StartStateColor));
        this.rightLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, this.rightProcessName, SnapGame.StartStateColor));
        
        SnapGame.StepCounter = 0;
    }

    public playLeft(action: string, destination: string, isComputer: boolean) {
        this.leftLts.setPreviousColor(isComputer ? SnapGame.ComputerColor : SnapGame.PlayerColor);
        
        if (this.traceType == TraceType.Single /*|| isAttacker */)
            this.leftLts.addDrawable(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
        else
            this.leftLts.addDrawable(new DoubleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
        
        this.leftLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, destination, SnapGame.StartStateColor));
        
        this.leftLts.setFlashColor(isComputer ? SnapGame.ComputerColor : SnapGame.PlayerColor);
        
        SnapGame.StepCounter++;
    }
    
    public playRight(action: string, destination: string, isComputer: boolean) {
        this.rightLts.setPreviousColor(isComputer ? SnapGame.ComputerColor : SnapGame.PlayerColor);
        
        if (this.traceType == TraceType.Single /*|| isAttacker */)
            this.rightLts.addDrawable(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
        else
            this.rightLts.addDrawable(new DoubleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
            
        this.rightLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, destination, SnapGame.StartStateColor));
        
        this.rightLts.setFlashColor(isComputer ? SnapGame.ComputerColor : SnapGame.PlayerColor);
        
        SnapGame.StepCounter++;
    }
    
    static IsRoundEnd(): boolean {
        return SnapGame.StepCounter%2 == 0;
    }
    
    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        var group = snapCanvas.paper.group();
        
        /* Legend: start */
        var legendX = x;
        
        var startTextLegend = snapCanvas.paper.text(legendX, y, "Current:");
        SnapCanvas.setTextAttr(startTextLegend).attr({"text-anchor":"start"});
        startTextLegend.attr({"y": y+startTextLegend.getBBox().height});
        
        legendX += startTextLegend.getBBox().width + 3;
        
        var startLegend: Square = new Square(Trace.DrawableWidth, Trace.LineHeight, "", SnapGame.StartStateColor);
        startLegend.draw(snapCanvas, legendX, y);
        
        legendX += startLegend.width + Trace.DrawableWidth*2;
        
        /* Legend: attacker */
        var attackerTextLegend = snapCanvas.paper.text(legendX, y, "Computer:");
        SnapCanvas.setTextAttr(attackerTextLegend).attr({"text-anchor":"start"});
        attackerTextLegend.attr({"y": y+attackerTextLegend.getBBox().height});
        
        legendX += attackerTextLegend.getBBox().width + 3;
        
        var attackerLegend: Square = new Square(Trace.DrawableWidth, Trace.LineHeight, "", SnapGame.ComputerColor);
        attackerLegend.draw(snapCanvas, legendX, y);
        
        legendX += attackerLegend.width + Trace.DrawableWidth*2;
        
        /* Legend: defender */
        var defenderTextLegend = snapCanvas.paper.text(legendX, y, "Player:");
        SnapCanvas.setTextAttr(defenderTextLegend).attr({"text-anchor":"start"});
        defenderTextLegend.attr({"y": y+defenderTextLegend.getBBox().height});
        
        legendX += attackerTextLegend.getBBox().width + 3;
        
        var defenderLegend: Square = new Square(Trace.DrawableWidth, Trace.LineHeight, "", SnapGame.PlayerColor);
        defenderLegend.draw(snapCanvas, legendX, y);
        
        y += Trace.LineHeight*3;
        
        /* Left LTS */
        var attackerText = snapCanvas.paper.text(x, y, this.leftProcessName + " trace"); // x and y doesnt matter here, move it below
        attackerText.attr({"font-family": "monospace", "font-weight": "bold", "font-size": Trace.FontSize + 6, "text-anchor":"start", "fill": "#000"});
        
        attackerText.attr({/*"x": x, */"y": y});

        y += attackerText.getBBox().height;

        group.add(this.leftLts.draw(snapCanvas, x, y));
        this.leftLts.flashLastElement(snapCanvas, group);
        
        y += this.leftLts.height;
        
        /* Right LTS */
        var defenderText = snapCanvas.paper.text(x, y, this.rightProcessName + " trace"); // x and y doesnt matter here, move it below
        defenderText.attr({"font-family": "monospace", "font-weight": "bold", "font-size": Trace.FontSize + 6, "text-anchor":"start", "fill": "#000"});

        y += defenderText.getBBox().height;

        group.add(this.rightLts.draw(snapCanvas, x, y));
        this.rightLts.flashLastElement(snapCanvas, group);
        
        this.height = attackerText.getBBox().height + defenderText.getBBox().height + this.leftLts.height + this.rightLts.height;
        this.width = Math.max(attackerText.getBBox().width, defenderText.getBBox().width, this.leftLts.width, this.rightLts.width);
        
        return group;
    }
}

class Trace implements Drawable {
    static LineHeight: number = 30;
    static FontSize: number = 14;
    static LineSpacing: number = 25;
    static LineBorder: number = 0;
    static DrawableWidth: number = 30;
    
    // save how much space the trace used in the canvas
    public width: number = 0;
    public height: number = Trace.LineHeight;
    
    private lastSquare: Square;
    
    private flashColor: string = undefined;
    private animatedElements: number = 0;
    
    constructor(private drawables: Drawable[], private breakLines: boolean) { }
    
    public setFlashColor(color: string) {
        // set color for which o flash the last element
        this.flashColor = color;
    }
    
    public addDrawable(drawable: Drawable) {
        if (drawable instanceof Square) {
            this.lastSquare = <Square>drawable;
        }
        this.drawables.push(drawable);
    }
    
    public setPreviousColor(color: string) {
        this.lastSquare.setColor(color);
    }
    
    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    static GetTrace(snapCanvas: SnapCanvas, traceType: TraceType) : Trace {
        var drawables: Drawable[] = [new Square(Trace.DrawableWidth, Trace.LineHeight, "Process")];
        
        /* Examples of each type of trace representation */
        var elements: number = 6;
        var action: string = "act";
        var text: string = "Process";
        switch(traceType) {
            case TraceType.Single:
                drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
                drawables.push(new Square(Trace.DrawableWidth, Trace.LineHeight, text));
                drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, "τ"));
                for (var i: number = 1; i < elements; i++) {
                    drawables.push(new Square(Trace.DrawableWidth, Trace.LineHeight, text));
                    drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
                    
                    if (i != elements-1) {
                        drawables.push(new Square(Trace.DrawableWidth, Trace.LineHeight, text));
                        drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, "τ"));
                    }
                }
                break;
            case TraceType.Double:
                drawables.push(new DoubleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
                for (var i: number = 1; i < elements; i++) {
                    drawables.push(new Square(Trace.DrawableWidth, Trace.LineHeight, text));
                    drawables.push(new DoubleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
                }
                break;
            case TraceType.Collapsed:
                var t: string = "";
                for (var i: number = 0; i < elements; i++) {
                    t += action;
                    if (i != elements-1) t += ".";
                }
                drawables.push(new DoubleArrow(Trace.DrawableWidth, Trace.LineHeight, t));
                break;
        }
        drawables.push(new Square(Trace.DrawableWidth, Trace.LineHeight, text));
        return new Trace(drawables, true);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        this.height = Trace.LineHeight; 
        
        var group: SnapElement = snapCanvas.paper.group();
        
        if (this.breakLines) {
            this.drawables.forEach( (item) => {
                item.measureWidth(snapCanvas);
            
                if (item instanceof Arrow && x + item.width + Trace.LineBorder + Trace.DrawableWidth > snapCanvas.canvasWidth) {
                    x = Trace.LineBorder + Trace.DrawableWidth;
                    y += Trace.LineHeight + Trace.LineSpacing
                    this.height += Trace.LineHeight + Trace.LineSpacing;
                }
                
                group.add(item.draw(snapCanvas, x, y));
                x += item.width;
            });
            this.width = x;
            
        } else {
            
            x = snapCanvas.canvasWidth - Trace.LineBorder;

            var maxTraceLength = (snapCanvas.canvasWidth - Trace.LineBorder*2)/2;
            var currentLength = 0;
            var firstElementLength: number = 0;
            
            var roomNeeded: number;
            
            for (var i = this.drawables.length - 1; i >= 0; i--) {
                var item = this.drawables[i];
                item.measureWidth(snapCanvas);
                
                // save the length of the right-most square and arrow combined
                if (i >= (this.drawables.length-1)-1) {
                    firstElementLength += item.width;
                }
                
                x -= item.width;
                group.add(item.draw(snapCanvas, x, y));
                currentLength += item.width;
            }
            
            var transformation: number = 0;
            
            // move the trace
            if (currentLength - firstElementLength <= maxTraceLength && this.animatedElements == 0) {
                // left adjust
                transformation = -x + Trace.LineBorder;
                group.transform("t" + transformation + ",0");
            } else if(this.animatedElements == this.drawables.length) {
                // if the number of elements hasnt changed since last animation, make the illusion that it doenst move again
                transformation = -maxTraceLength;
                group.transform("t" + transformation + ",0");
            } else {
                transformation = -maxTraceLength + firstElementLength;
                group.transform("t" + transformation + ",0");
            }
            
            if (this.flashColor != undefined) {
                this.tempFlashParameters = {x: x + transformation + currentLength - firstElementLength, y: y, firstElementLength: firstElementLength}; // hax :/
            }
            
            if (SnapGame.IsRoundEnd()) {
                if (currentLength >= maxTraceLength) {
                    group.animate({transform: "t" + (-maxTraceLength) + ",0"}, 1000, mina.easeinout);
                    this.animatedElements = this.drawables.length;
                }
            }
        }
        
        this.height += Trace.LineSpacing * 2;
        
        return group;
    }
    
    private tempFlashParameters;
    
    public flashLastElement(snapCanvas: SnapCanvas, group: SnapElement) {
        if (this.flashColor != undefined && this.tempFlashParameters != undefined) {
            Square.FlashSquare(snapCanvas, group, this.flashColor, this.tempFlashParameters.x, this.tempFlashParameters.y, this.tempFlashParameters.firstElementLength);
            
            this.flashColor = undefined;
            this.tempFlashParameters = undefined;
        }
    }
}

class Circle extends Tip implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
        super(text);
        this.width = this.height;
    }
    
    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        var radius = this.height/2;
        
        var filter: SnapElement = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var circle: SnapElement = snapCanvas.paper.circle(x + radius, y + radius, radius);
        circle.attr({"fill": "#2a6496", "stroke": "#000", "stroke-width": 0});

        this.addTip(circle);
        
        return circle;
    }
}

class Square extends Tip implements Drawable {
    
    static MaxTextLength: number = 27;
    
    private initialWidth: number;
    private textElement: SnapElement;
    
    constructor(public width: number, public height: number, private text: string, private color?: string) {
        super(text);
        this.initialWidth = this.width;
    }
    
    public measureWidth(snapCanvas: SnapCanvas) {
        if (this.textElement != undefined) {
            return;
        }
        
        this.width = this.initialWidth;
        
        var margin = (this.height - Trace.FontSize) / 4;

        this.textElement = snapCanvas.paper.text(snapCanvas.canvasWidth/2, snapCanvas.canvasHeight/2, this.getText()); // x and y doesnt matter here, move it below
        SnapCanvas.setTextAttr(this.textElement).attr({"fill": "#FFF"});
        
        var textWidth = this.textElement.getBBox().width;
        
        this.textElement.remove(); // cleanup, when you move its position, it will be redrawn by snap
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
    }
    
    public setColor(newColor: string) {
        this.color = newColor;
    }
    
    private getText(): string {
        if (this.text.length > Square.MaxTextLength)
            return this.text.substring(0, Square.MaxTextLength - 3) + "...";
        else
            return this.text;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        this.measureWidth(snapCanvas);
        
        var filter = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var cornerRadius = 10;
        
        var rect: SnapElement = snapCanvas.paper.rect(x, y, this.width, this.height, cornerRadius, cornerRadius);
        rect.attr({"fill": (this.color ? this.color : "#2a6496"), "stroke": "#000", "stroke-width": 0});
        
        // center text in the square
        this.textElement.attr({"x": x+this.width/2, "y": (y+this.height/2) + (this.height/2.5/2/2)}); // no idea why /2/2 looks right?!?!
        
        // group the elements to make text appear on top of the rectangle
        var group: SnapElement = snapCanvas.paper.group(rect, this.textElement);
        //this.textElement = undefined; // redraw it next time
        
        this.addTip(group);
        return group;
    }
    
    static AnimateSquareToColor(square: SnapElement, toColor: string) {
        square.animate({"fill": toColor}, 250);
    }
    
    static FlashSquare(snapCanvas: SnapCanvas, group: SnapElement, color: string, x: number, y:number , length: number): SnapElement {
        // add some extra flashing pixels
        var flashSquare: Square = new Square(length+1, Trace.LineHeight+2, "", color);
        var squareGroup = flashSquare.draw(snapCanvas, x, y-1);
        
        group.before(squareGroup);
        
        var snapSquare: SnapElement = squareGroup[0]; // first element in group is square
        Square.AnimateSquareToColor(snapSquare, "#FFFFFF"); // to white
        
        return squareGroup;
    }
}

class Arrow implements Drawable {
    
    static StrokeWidth: number = 2;
    
    private initialWidth: number;
    public textElement: SnapElement;
    
    constructor(public width: number, public height: number, public text: string, public headSize: number) {
        this.initialWidth = this.width;
    }

    public measureWidth(snapCanvas: SnapCanvas) {
        if (this.textElement != undefined)
            return;
        
        this.width = this.initialWidth;
        
        var margin: number = (this.height - Trace.FontSize) / 4;

        this.textElement = snapCanvas.paper.text(snapCanvas.canvasWidth/2, snapCanvas.canvasHeight/2, this.text); // x and y doesnt matter here, move it below
        SnapCanvas.setTextAttr(this.textElement);
        
        var textWidth: number = this.textElement.getBBox().width;
        
        this.textElement.remove(); // cleanup, when you move its position, it will be redrawn by snap
        
        // set width of the line to make room for the text
        this.width = (textWidth + margin*2 + this.headSize > this.width) ? textWidth + margin*2 + this.headSize : this.width;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        /* Arrow is meant as a super class, override draw in subclasses */
        throw "Arrow.Draw() not implemented";
        return undefined;
    }
}

class SingleArrow extends Arrow {
    
    constructor(width: number, height: number, text: string) {
        super(width, height, text, 5);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        this.measureWidth(snapCanvas);
        
        var line: SnapElement = snapCanvas.paper.path("M"+x+","+(y+(this.height / 2))+"H"+(x+this.width));
        
        line.attr({"stroke": "black", 
                   "stroke-width": Arrow.StrokeWidth});
        
        // center text right above the arrow
        var textPosition = (y + this.height/2) - Arrow.StrokeWidth - 2; // 2 units above the line
        this.textElement.attr({"x": x+(this.width-this.headSize)/2, "y": textPosition});
        
        // draw arrow head
        var offset = -(Arrow.StrokeWidth/2);
        var headX = x + this.width - this.headSize + offset;
        var headStartY = y + this.height/2 - this.headSize;
        var headEndY = y + this.height/2 + this.headSize;
        
        var head = snapCanvas.paper.path("M"+headX+","+headStartY+"L"+(x+this.width+offset)+","+(y+(this.height / 2))+"L"+headX+","+headEndY);
        head.attr({"stroke": "black", 
                   "stroke-width": Arrow.StrokeWidth,
                   "fill-opacity":0});
        
        var group: SnapElement = snapCanvas.paper.group(this.textElement, head, line);
        //this.textElement = undefined; // redraw it next time
        return group;
    }
}

class DoubleArrow extends Arrow {
    
    constructor(width: number, height: number, text: string) {
        super(width, height, text, 6);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        this.measureWidth(snapCanvas);
        
        var arrowWidth = 4;
        var y1 = y + (this.height/2) - (arrowWidth/2);
        var y2 = y + (this.height/2) + (arrowWidth/2);
        
        var lineEndOffset = -(arrowWidth / 2 + 1);
        
        // TODO: adjust width
        var line1: SnapElement = snapCanvas.paper.path("M"+x+","+y1+"H"+(x+this.width+lineEndOffset));
        var line2: SnapElement = snapCanvas.paper.path("M"+x+","+y2+"H"+(x+this.width+lineEndOffset));
        
        line1.attr({"stroke": "black", 
                   "stroke-width": Arrow.StrokeWidth});
        line2.attr({"stroke": "black", 
                   "stroke-width": Arrow.StrokeWidth});
        
        // center text right above the arrow
        var textPosition = y1 - Arrow.StrokeWidth - 2; // 2 units above the line
        this.textElement.attr({"x": x+(this.width-this.headSize)/2, "y": textPosition});
        
        // draw arrow head
        var offset = -(Arrow.StrokeWidth/2);
        var headX = x + this.width - this.headSize + offset;
        var headStartY = y + this.height/2 - this.headSize;
        var headEndY = y + this.height/2 + this.headSize;
        
        var head = snapCanvas.paper.path("M"+headX+","+headStartY+"L"+(x+this.width+offset)+","+(y+(this.height / 2))+"L"+headX+","+headEndY);
        head.attr({"stroke": "black", 
                   "stroke-width": Arrow.StrokeWidth,
                   "fill-opacity":0});
        
        var group: SnapElement = snapCanvas.paper.group(this.textElement, head, line1, line2);
        //this.textElement = undefined; // redraw it next time
        return group;
    }
}
