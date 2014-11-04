/// <reference path="../../lib/snap.d.ts" />

class SnapCanvas {
    
    private currentX: number;
    private currentY: number;
    public paper: SnapPaper;
    
    private traces: Trace[] = [Trace.GetTrace(this), Trace.GetTrace(this)];
    
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
        //var traces: Trace[] = [Trace.GetTrace(this), Trace.GetTrace(this)];
    
        this.currentX = Trace.LineBorder;
        this.currentY = Trace.LineBorder;
        
        this.traces.forEach( (item) => {
            item.draw(this, this.currentX, this.currentY);
            this.currentY += item.height; // should be equal to one or more LineHeight
        });
    }
}

interface Drawable {
    width: number;
    height: number;
    draw(snapCanvas: SnapCanvas, x: number, y: number);
}

class Trace implements Drawable {
    static LineHeight: number = 40;
    static LineSpacing: number = 25;
    static LineBorder: number = 15;
    
    // save how much space the trace used in the canvas
    public width: number = 0;
    public height: number = Trace.LineHeight;
    
    constructor(public paper: SnapCanvas, private drawables: Drawable[]) { }
    
    static GetTrace(snapCanvas: SnapCanvas) : Trace {
        var drawables: Drawable[]  = [new Square(40, Trace.LineHeight, "a"), new Arrow(40, Trace.LineHeight, "abe")];
        for (var i: number = 1; i < 25; i++) {
            drawables.push(new Circle(40, Trace.LineHeight, "o"));
            drawables.push(new Arrow(40, Trace.LineHeight, "abe"));
        }
        drawables.push(new Square(40, Trace.LineHeight, "TTo"));
        var trace = new Trace(snapCanvas, drawables);
        // TODO: fix method structure
        
        return trace;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        this.height = Trace.LineHeight; 
        
        this.drawables.forEach( (item) => {
            if (x + item.width + Trace.LineBorder > snapCanvas.canvasWidth) {
                x = Trace.LineBorder;
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

class Circle implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
        this.width = this.height;
    }

    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        var radius = this.height/2;
        
        var filter: SnapElement = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var circle: SnapElement = snapCanvas.paper.circle(x + radius, y + radius, radius);
        circle.attr({"fill": "#f00", "stroke": "#000", "stroke-width": 0, "filter": filter});
    }
}

class Square implements Drawable {
    
    constructor(public width: number, public height: number, private text: string) {
    }

    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        var fontSize = this.height/2.5; // same as text height
        var margin = (this.height - fontSize) / 2;

        var text = snapCanvas.paper.text(x, y, this.text); // x and y doesnt matter here, move it below
        text.attr({"font-size": fontSize, "text-anchor":"middle"});

        var textWidth = text.getBBox().width;
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
        
        var filter = snapCanvas.paper.filter(Snap.filter.shadow(0, 0, 1));
        
        var rect: SnapElement = snapCanvas.paper.rect(x, y, this.width, this.height);
        rect.attr({"fill": "#f00", "stroke": "#000", "stroke-width": 0, "filter": filter});
        
        // group the elements to make text appear on top of the rectangle
        snapCanvas.paper.group(rect, text);
        
        // center text in the square
        text.attr({"x": x+this.width/2, "y": (y+this.height/2) + (fontSize/2/2)}); // no idea why /2/2 looks right?!?!
    }
}

class Arrow implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
    }

    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        var fontSize = this.height/2.5; // same as text height
        var margin: number = (this.height - fontSize) / 2;

        var text: SnapElement = snapCanvas.paper.text(x, y, this.text); // x and y doesnt matter here, move it below
        text.attr({"font-size": fontSize, "text-anchor":"middle"});

        var textWidth: number = text.getBBox().width;
        
        // set width of the line to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
        
        // draw line
        //var line: SnapElement = snapCanvas.paper.path("M"+x+","+(y+(this.height / 2))+"L"+(x+this.width)+","+(y+(this.height / 2)));
        var line: SnapElement = snapCanvas.paper.path("M"+x+","+(y+(this.height / 2))+"H"+(x+this.width));
        
        var strokeWidth: number = 2;
        line.attr({"stroke": "black", 
	               "stroke-width": strokeWidth});
        
        // center text right above the arrow
        var textPosition = (y + this.height/2) - strokeWidth - 2; // 2 units above the line
        text.attr({"x": x+this.width/2, "y": textPosition});
        
        // draw arrow head
        var headSize = 5;
        var offset = -1;
        var headX = x + this.width - headSize + offset;
        var headStartY = y + this.height/2 - headSize;
        var headEndY = y + this.height/2 + headSize;
        
        var head = snapCanvas.paper.path("M"+headX+","+headStartY+"L"+(x+this.width-offset)+","+(y+(this.height / 2))+"L"+headX+","+headEndY);
        head.attr({"stroke": "black", 
	               "stroke-width": strokeWidth,
                   "fill-opacity":0});
    }
    
    private drawStandardArrow() {
        
    }
    
    private drawLineBreakArrow() {
        
    }
}