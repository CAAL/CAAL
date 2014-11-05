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
                Tip.tip.css("left", e.clientX+20).css("top", e.clientY+20);
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
    
    static GetTrace(snapCanvas: SnapCanvas) : Trace {
        var drawables: Drawable[]  = [new Square(Trace.DrawableWidth, Trace.LineHeight, "a"), new Arrow(Trace.DrawableWidth, Trace.LineHeight, "abe")];
        for (var i: number = 1; i < 25; i++) {
            drawables.push(new Circle(Trace.DrawableWidth, Trace.LineHeight, "o"));
            drawables.push(new Arrow(Trace.DrawableWidth, Trace.LineHeight, "abe"));
        }
        drawables.push(new Square(Trace.DrawableWidth, Trace.LineHeight, "TTo"));
        var trace = new Trace(snapCanvas, drawables);
        
        return trace;
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
        this.textElement.attr({"font-family": "Inconsolata", "font-size": fontSize, "text-anchor":"middle", "fill": "#FFF"});

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
    
    private initialWidth: number;
    private textElement: SnapElement;
    
    constructor(public width: number, public height: number, private text: string) {
        this.initialWidth = this.width;
    }

    public measureWidth(snapCanvas: SnapCanvas) {
        this.width = this.initialWidth;
        
        var fontSize = this.height/2.5; // same as text height
        var margin: number = (this.height - fontSize) / 2;

        this.textElement = snapCanvas.paper.text(0, 0, this.text); // x and y doesnt matter here, move it below
        this.textElement.attr({"font-family": "Inconsolata", "font-weight": "bold", "font-size": fontSize, "text-anchor":"middle"});

        var textWidth: number = this.textElement.getBBox().width;
        
        // set width of the line to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
    }
    
    public draw(snapCanvas: SnapCanvas, x: number, y: number) {
        //this.width = this.initialWidth;
        
        if (this.textElement == undefined) {
            this.measureWidth(snapCanvas);
        }
        
        this.drawStandardArrow(snapCanvas, x, y);
        // make sure there is room for another circle and a linebreak arrow
        /*if (x + Trace.LineBorder + this.width + Trace.DrawableWidth + Trace.DrawableWidth < snapCanvas.canvasWidth) {
            this.drawStandardArrow(snapCanvas, x, y, text);
        }
        else {
            this.drawLinebreakArrow(snapCanvas, x, y, text);
            this.width += Trace.DrawableWidth + Trace.DrawableWidth; // make Trace do a linebreak
        }*/
    }
    
    private drawStandardArrow(snapCanvas: SnapCanvas, x: number, y: number) {
        
        var line: SnapElement = snapCanvas.paper.path("M"+x+","+(y+(this.height / 2))+"H"+(x+this.width));
        
        var strokeWidth: number = 2;
        line.attr({"stroke": "black", 
	               "stroke-width": strokeWidth});
        
        // center text right above the arrow
        var textPosition = (y + this.height/2) - strokeWidth - 2; // 2 units above the line
        this.textElement.attr({"x": x+this.width/2, "y": textPosition});
        
        // draw arrow head
        var headSize = 5;
        var offset = -1;
        var headX = x + this.width - headSize + offset;
        var headStartY = y + this.height/2 - headSize;
        var headEndY = y + this.height/2 + headSize;
        
        var head = snapCanvas.paper.path("M"+headX+","+headStartY+"L"+(x+this.width+offset)+","+(y+(this.height / 2))+"L"+headX+","+headEndY);
        head.attr({"stroke": "black", 
	               "stroke-width": strokeWidth,
                   "fill-opacity":0});
    }
    
    /*private drawLinebreakArrow(snapCanvas: SnapCanvas, x: number, y: number, text: SnapElement) {
        this.width = Trace.DrawableWidth;
        
        var x1 = x,
            y1 = y + (this.height / 2),
            x2 = x1 + this.width,
            y2 = y1,
            x3 = x2,
            y3 = y2 + (Trace.LineHeight + Trace.LineSpacing) / 2,
            x4 = x1,
            y4 = y3;
        
        var line: SnapElement = snapCanvas.paper.path("M"+x+","+y1+
                                                      "C"+x2+","+y2+","+x3+","+y3+","+x4+","+y4+
                                                      "H"+Trace.LineBorder);
        
        var strokeWidth: number = 2;
        line.attr({"stroke": "black", 
	               "stroke-width": strokeWidth,
                   "fill-opacity": 0});
        
    }*/
}