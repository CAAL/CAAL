/// <reference path="../../lib/snap.d.ts" />

enum TraceType {Single, Double, Collapsed};

class SnapCanvas {
    
    private currentX: number;
    private currentY: number;
    public paper: SnapPaper;
    
    private traces: Drawable[] = [new Game(Trace.GetTrace(this, TraceType.Single), Trace.GetTrace(this, TraceType.Single))];
    
    constructor(htmlElement: string, public canvasWidth: number, public canvasHeight: number) {
        this.paper = Snap(htmlElement);
        this.draw();
    }
    
    public setSize(width: number, height: number) {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.paper.clear();
        this.draw();
    }
    
    public draw() {
        this.currentX = Trace.LineBorder;
        this.currentY = Trace.LineBorder;
        
        this.traces.forEach( (item) => {
            item.draw(this, this.currentX, this.currentY);
            this.currentY += item.height; // should be equal to one or more LineHeight
        });
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
    draw(snapCanvas: SnapCanvas, x: number, y: number);
    measureWidth(snapCanvas: SnapCanvas);
}

class Game implements Drawable {
    public width: number = 0;
    public height: number = 0;

    constructor(private attacker: Trace, private defender: Trace) {
        
    }

    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        // Attacker
        var attackerText = snapCanvas.paper.text(x, y, "Attacker"); // x and y doesnt matter here, move it below
        attackerText.attr({"font-family": "monospace", "font-weight": "bold", "font-size": 12, "fill": "#000"});

        y += attackerText.getBBox().height;
        
        this.attacker.draw(snapCanvas, x, y);

        y += this.attacker.height;
        
        // Defender
        var defenderText = snapCanvas.paper.text(x, y, "Defender"); // x and y doesnt matter here, move it below
        defenderText.attr({"font-family": "monospace", "font-weight": "bold", "font-size": 12, "fill": "#000"});

        y += defenderText.getBBox().height;

        this.defender.draw(snapCanvas, x, y);

        this.height = attackerText.getBBox().height + defenderText.getBBox().height + this.attacker.height + this.defender.height;
        this.width = Math.max(attackerText.getBBox().width + defenderText.getBBox().width + this.attacker.width + this.defender.width);
    }

}

class Trace implements Drawable {
    static LineHeight: number = 40;
    static LineSpacing: number = 25;
    static LineBorder: number = 15;
    static DrawableWidth: number = 40;
    
    // save how much space the trace used in the canvas
    public width: number = 0;
    public height: number = Trace.LineHeight;
    
    constructor(public paper: SnapCanvas, private drawables: Drawable[]) { }
    
    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    static GetTrace(snapCanvas: SnapCanvas, traceType: TraceType) : Trace {
        var drawables: Drawable[] = [new Circle(Trace.DrawableWidth, Trace.LineHeight, "Process: P")];
        
        /* Examples of each type of trace representation */
        var elements: number = 6;
        var action: string = "act";
        var text: string = "Process: P";
        switch(traceType) {
            case TraceType.Single:
                drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
                drawables.push(new Circle(Trace.DrawableWidth, Trace.LineHeight, text));
                drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, "τ"));
                for (var i: number = 1; i < elements; i++) {
                    drawables.push(new Circle(Trace.DrawableWidth, Trace.LineHeight, text));
                    drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
                    
                    if (i != elements-1) {
                        drawables.push(new Circle(Trace.DrawableWidth, Trace.LineHeight, text));
                        drawables.push(new SingleArrow(Trace.DrawableWidth, Trace.LineHeight, "τ"));
                    }
                }
                break;
            case TraceType.Double:
                drawables.push(new DoubleArrow(Trace.DrawableWidth, Trace.LineHeight, action));
                for (var i: number = 1; i < elements; i++) {
                    drawables.push(new Circle(Trace.DrawableWidth, Trace.LineHeight, text));
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
        drawables.push(new Circle(Trace.DrawableWidth, Trace.LineHeight, text));
        return new Trace(snapCanvas, drawables);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        this.height = Trace.LineHeight; 
        
        this.drawables.forEach( (item) => {
            item.measureWidth(snapCanvas);
            
            if (item instanceof Arrow && x + item.width + Trace.LineBorder + Trace.DrawableWidth > snapCanvas.canvasWidth) {
                x = Trace.LineBorder + Trace.DrawableWidth;
                y += Trace.LineHeight + Trace.LineSpacing
                this.height += Trace.LineHeight + Trace.LineSpacing;
            }
            
            item.draw(snapCanvas, x, y);
            x += item.width;
        });
        
        this.width = x;
        this.height += Trace.LineSpacing * 2;
    }
}

class Circle extends Tip implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
        super(text);
        this.width = this.height;
    }
    
    public measureWidth(snapCanvas: SnapCanvas) { /* empty */ }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        var radius = this.height/2;
        
        var filter: SnapElement = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var circle: SnapElement = snapCanvas.paper.circle(x + radius, y + radius, radius);
        circle.attr({"fill": "#2a6496", "stroke": "#000", "stroke-width": 0});

        this.addTip(circle);
    }
}

class Square implements Drawable {
    
    private initialWidth: number;
    private textElement: SnapElement;
    
    constructor(public width: number, public height: number, private text: string) {
        this.initialWidth = this.width;
    }
    
    public measureWidth(snapCanvas: SnapCanvas) {
        this.width = this.initialWidth;
        
        var fontSize = this.height/2.5; // same as text height
        var margin = (this.height - fontSize) / 2;

        this.textElement = snapCanvas.paper.text(0, 0, this.text); // x and y doesnt matter here, move it below
        this.textElement.attr({"font-family": "monospace", "font-weight": "bold", "font-size": fontSize, "text-anchor":"middle", "fill": "#FFF"});

        var textWidth = this.textElement.getBBox().width;
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        if (this.textElement == undefined) {
            this.measureWidth(snapCanvas);
        }
        
        var filter = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var rect: SnapElement = snapCanvas.paper.rect(x, y, this.width, this.height);
        rect.attr({"fill": "#2a6496", "stroke": "#000", "stroke-width": 0});
        
        // group the elements to make text appear on top of the rectangle
        snapCanvas.paper.group(rect, this.textElement);
        
        // center text in the square
        this.textElement.attr({"x": x+this.width/2, "y": (y+this.height/2) + (this.height/2.5/2/2)}); // no idea why /2/2 looks right?!?!
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
        this.width = this.initialWidth;
        
        var fontSize = this.height/2.5; // same as text height
        var margin: number = (this.height - fontSize) / 2;

        this.textElement = snapCanvas.paper.text(0, 0, this.text); // x and y doesnt matter here, move it below
        this.textElement.attr({"font-family": "monospace", "font-weight": "bold", "font-size": fontSize, "text-anchor":"middle"});

        var textWidth: number = this.textElement.getBBox().width;
        
        // set width of the line to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        /* Arrow is meant as a super class, override draw in subclasses */
        throw "Arrow.Draw() not implemented";
    }
}

class SingleArrow extends Arrow {
    
    constructor(width: number, height: number, text: string) {
        super(width, height, text);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
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
    }
}

class DoubleArrow extends Arrow {
    
    constructor(width: number, height: number, text: string) {
        super(width, height, text);
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        
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
    }
}
