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
    }
    
    static setTextAttr(textElement: SnapElement) {
        textElement.attr({"font-family": "monospace", "font-weight": "bold", "font-size": Trace.FontSize, "text-anchor":"middle", "fill": "#000"});
        return textElement;
    }
}

class Tip {

    static tip;
    static over;
    static tipText;

    constructor(private elementText) {
        Tip.tip = $("#tip").hide();
        Tip.over = false;

        $(document).mousemove(function(e){
            if(Tip.over) {
                Tip.tip.css("left", e.clientX+10).css("top", e.clientY+50);
                Tip.tip.text(Tip.tipText);
            }
        });
    }

    private hoverIn(element) {
        Tip.tipText = this.elementText;
        Tip.tip.show();
        Tip.over = true;
    }

    private hoverOut(element) {
        Tip.tip.hide();
        Tip.over = false;
    }

    public addTip(element: SnapElement) {
        element.hover( () => this.hoverIn(element), () => this.hoverOut(element));
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
    
    static AttackerColor: string = "#FF0000";
    static DefenderColor: string = "#2600FF";

    constructor(private leftProcessName: string, private rightProcessName: string) {
        this.leftLts = new Trace([], false);
        this.rightLts = new Trace([], false);
    }

    public playLeft(action: string, destination: string, isAttacker: boolean, startState?: string) {
        if (startState) {
            this.leftLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, startState, 
                (isAttacker ? SnapGame.AttackerColor : SnapGame.DefenderColor) ));
        }

        this.leftLts.addDrawable(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
        this.leftLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, destination,
            (isAttacker ? SnapGame.AttackerColor : SnapGame.DefenderColor) ));
    }
    
    public playRight(action: string, destination: string, isAttacker: boolean, startState?: string) {
        if (startState) {
            this.rightLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, startState, 
                (isAttacker ? SnapGame.AttackerColor : SnapGame.DefenderColor) ));
        }

        this.rightLts.addDrawable(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, "action name"));
        this.rightLts.addDrawable(new Square(Trace.DrawableWidth, Trace.LineHeight, "process destination name",
            (isAttacker ? SnapGame.AttackerColor : SnapGame.DefenderColor) ));
    }
    
    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        var group = snapCanvas.paper.group();
        
        // Attacker
        var attackerText = snapCanvas.paper.text(x, y, this.leftProcessName); // x and y doesnt matter here, move it below
        SnapCanvas.setTextAttr(attackerText).attr({"text-anchor": "start"});
        group.add(attackerText);
        
        y += attackerText.getBBox().height;
        
        attackerText.attr({"x": x, "y": y});

        y += attackerText.getBBox().height;

        group.add(this.leftLts.draw(snapCanvas, x, y));

        y += this.leftLts.height;
        
        // Defender
        var defenderText = snapCanvas.paper.text(x, y, this.rightProcessName); // x and y doesnt matter here, move it below
        SnapCanvas.setTextAttr(defenderText).attr({"text-anchor": "start"});
        group.add(defenderText);

        y += defenderText.getBBox().height;

        group.add(this.rightLts.draw(snapCanvas, x, y));

        this.height = attackerText.getBBox().height + defenderText.getBBox().height + this.leftLts.height + this.rightLts.height;
        this.width = Math.max(attackerText.getBBox().width, defenderText.getBBox().width, this.leftLts.width, this.rightLts.width);
        
        return group;
    }
}

class Trace implements Drawable {
    static LineHeight: number = 40;
    static FontSize: number = 16;
    static LineSpacing: number = 25;
    static LineBorder: number = 0;
    static DrawableWidth: number = 40;
    
    // save how much space the trace used in the canvas
    public width: number = 0;
    public height: number = Trace.LineHeight;
    
    constructor(private drawables: Drawable[], private breakLines: boolean) { }
    
    public addDrawable(drawable: Drawable) {
        this.drawables.push(drawable);
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

            for (var i = this.drawables.length - 1; i >= 0; i--) {
                var item = this.drawables[i];
                item.measureWidth(snapCanvas);
                
                var roomNeeded: number = Trace.DrawableWidth + item.width; // DrawableWidth for drawing 3 dots (...), and room for the item
                if (item instanceof Arrow) {
                    // if it's an arrow, there should always be room for a square before it
                    this.drawables[i-1].measureWidth(snapCanvas);
                    roomNeeded += this.drawables[i-1].width;
                }
                
                if (x - roomNeeded > Trace.LineBorder) {
                    x -= item.width;
                    group.add(item.draw(snapCanvas, x, y));
                } else {
                    var text = snapCanvas.paper.text(x - Trace.DrawableWidth / 2, y + Trace.LineHeight / 2, "...");
                    SnapCanvas.setTextAttr(text);
                    x -= Trace.DrawableWidth;
                    group.add(text);
                    
                    group.transform("t"+(-x+Trace.LineBorder)+","+0);
                    
                    // save height and return
                    this.height += Trace.LineSpacing * 2;
                    return group;
                }
            }

            group.transform("t"+(-x+Trace.LineBorder)+","+0);
        }
        
        this.height += Trace.LineSpacing * 2;
        return group;
    }
}

class Circle implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
        //super(text);
        this.width = this.height;
    }
    
    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        var radius = this.height/2;
        
        var filter: SnapElement = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var circle: SnapElement = snapCanvas.paper.circle(x + radius, y + radius, radius);
        circle.attr({"fill": "#2a6496", "stroke": "#000", "stroke-width": 0});

        //this.addTip(circle);
        
        return circle;
    }
}

class Square implements Drawable {
    
    private initialWidth: number;
    private textElement: SnapElement;
    
    constructor(public width: number, public height: number, private text: string, private color?: string) {
        this.initialWidth = this.width;
    }
    
    public measureWidth(snapCanvas: SnapCanvas) {
        if (this.textElement != undefined)
            return;
        
        this.width = this.initialWidth;
        
        var margin = (this.height - Trace.FontSize) / 4;

        this.textElement = snapCanvas.paper.text(0, 0, this.text); // x and y doesnt matter here, move it below
        SnapCanvas.setTextAttr(this.textElement).attr({"fill": "#FFF"});

        var textWidth = this.textElement.getBBox().width;
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        if (this.textElement == undefined) {
            this.measureWidth(snapCanvas);
        }
        
        var filter = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var cornerRadius = 10;
        
        var rect: SnapElement = snapCanvas.paper.rect(x, y, this.width, this.height, cornerRadius, cornerRadius);
        rect.attr({"fill": (this.color ? this.color : "#2a6496"), "stroke": "#000", "stroke-width": 0});
        
        // center text in the square
        this.textElement.attr({"x": x+this.width/2, "y": (y+this.height/2) + (this.height/2.5/2/2)}); // no idea why /2/2 looks right?!?!
        
        // group the elements to make text appear on top of the rectangle
        return snapCanvas.paper.group(rect, this.textElement);
    }
}

class Arrow implements Drawable {
    
    static StrokeWidth: number = 2;
    
    private initialWidth: number;
    public textElement: SnapElement;
    
    constructor(public width: number, public height: number, public text: string) {
        this.initialWidth = this.width;
    }

    public measureWidth(snapCanvas: SnapCanvas) {
        if (this.textElement != undefined)
            return;
        
        this.width = this.initialWidth;
        
        var margin: number = (this.height - Trace.FontSize) / 4;

        this.textElement = snapCanvas.paper.text(0, 0, this.text); // x and y doesnt matter here, move it below
        SnapCanvas.setTextAttr(this.textElement);
        
        var textWidth: number = this.textElement.getBBox().width;
        
        // set width of the line to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        /* Arrow is meant as a super class, override draw in subclasses */
        throw "Arrow.Draw() not implemented";
        return undefined;
    }
}

class SingleArrow extends Arrow {
    
    constructor(width: number, height: number, text: string) {
        super(width, height, text);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        if (this.textElement == undefined) {
            this.measureWidth(snapCanvas);
        }
        
        var line: SnapElement = snapCanvas.paper.path("M"+x+","+(y+(this.height / 2))+"H"+(x+this.width));
        
        line.attr({"stroke": "black", 
	               "stroke-width": Arrow.StrokeWidth});
        
        // center text right above the arrow
        var textPosition = (y + this.height/2) - Arrow.StrokeWidth - 2; // 2 units above the line
        this.textElement.attr({"x": x+this.width/2, "y": textPosition});
        
        // draw arrow head
        var headSize = 5;
        var offset = -(Arrow.StrokeWidth/2);
        var headX = x + this.width - headSize + offset;
        var headStartY = y + this.height/2 - headSize;
        var headEndY = y + this.height/2 + headSize;
        
        var head = snapCanvas.paper.path("M"+headX+","+headStartY+"L"+(x+this.width+offset)+","+(y+(this.height / 2))+"L"+headX+","+headEndY);
        head.attr({"stroke": "black", 
	               "stroke-width": Arrow.StrokeWidth,
                   "fill-opacity":0});
        
        return snapCanvas.paper.group(this.textElement, head, line);
    }
}

class DoubleArrow extends Arrow {
    
    constructor(width: number, height: number, text: string) {
        super(width, height, text);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number): SnapElement {
        
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
        this.textElement.attr({"x": x+this.width/2, "y": textPosition});
        
        // draw arrow head
        var headSize = 6;
        var offset = -(Arrow.StrokeWidth/2);
        var headX = x + this.width - headSize + offset;
        var headStartY = y + this.height/2 - headSize;
        var headEndY = y + this.height/2 + headSize;
        
        var head = snapCanvas.paper.path("M"+headX+","+headStartY+"L"+(x+this.width+offset)+","+(y+(this.height / 2))+"L"+headX+","+headEndY);
        head.attr({"stroke": "black", 
	               "stroke-width": Arrow.StrokeWidth,
                   "fill-opacity":0});
        
        return snapCanvas.paper.group(this.textElement, head, line1, line2);
    }
}
