/// <reference path="../../lib/raphael.d.ts" />
class RaphaelCanvas {
    
    private currentX: number;
    private currentY: number;
    public paper: RaphaelPaper;
    
    constructor(htmlElement: string, public canvasWidth: number, public canvasHeight: number) {
        this.paper = Raphael(htmlElement, canvasWidth, canvasHeight);
    }
    
    public draw() {
        var traces: Trace[] = [Trace.GetTrace(this), Trace.GetTrace(this)];
        
        this.currentX = Trace.LineBorder;
        this.currentY = Trace.LineBorder;
        
        traces.forEach( (item) => {
            item.draw(this, this.currentX, this.currentY);
            this.currentY += item.height; // should be equal to one or more LineHeight
            this.currentY += Trace.LineSpacing * 2;
        });
    }
}

interface Drawable {
    width: number;
    height: number;
    draw(raphaelCanvas: RaphaelCanvas, x: number, y: number);
}

class Trace implements Drawable {
    static LineHeight = 40;
    static LineSpacing = 25;
    static LineBorder = 15;
    
    // save how much space the trace used in the canvas
    public width: number = 0;
    public height: number = Trace.LineHeight;
    
    constructor(public paper: RaphaelCanvas, private drawables: Drawable[]) { }

    static GetTrace(raphaelCanvas: RaphaelCanvas) : Trace {
        var drawables: Drawable[]  = [new Square(50, Trace.LineHeight, "o"), new Arrow(50, Trace.LineHeight, "a")];
        for (var i: number = 1; i < 25; i++) {
            drawables.push(new Circle(50, Trace.LineHeight, "o"));
            drawables.push(new Arrow(50, Trace.LineHeight, "a"));
        }
        drawables.push(new Square(50, Trace.LineHeight, "o"));
        var trace = new Trace(raphaelCanvas, drawables);
        // TODO: fix method structure
        
        return trace;
    }
    
    public draw(raphaelCanvas: RaphaelCanvas, x: number, y: number) {
        this.drawables.forEach( (item) => {
            if (x + item.width + Trace.LineBorder > raphaelCanvas.canvasWidth) {
                x = Trace.LineBorder;
                y += Trace.LineHeight + Trace.LineSpacing
                this.height += Trace.LineHeight + Trace.LineSpacing;
            }
            
            item.draw(raphaelCanvas, x, y);
            x += item.width;
        });
        
        this.width = x;
    }
}

class Circle implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
        this.width = this.height;
    }

    public draw(raphaelCanvas: RaphaelCanvas, x: number, y: number) {
        var radius = this.height/2;
    
        var circle = raphaelCanvas.paper.circle(x + radius, y + radius, radius);
        circle.attr({"fill": "#f00", "stroke": "#000"});
    }
}

class Square implements Drawable {
    
    constructor(public width: number, public height: number, private text: string) {
    }

    public draw(raphaelCanvas: RaphaelCanvas, x: number, y: number) {
        var margin = (this.height - (this.height / 2.5)) / 2;

        var text = raphaelCanvas.paper.text(x + margin, y + (this.height / 2), this.text);
        text.attr({"font-size": this.height / 2.5,
                   "text-anchor": "start"});

        var textWidth = text.getBBox().width;
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
        
        // Parameters: x, y, width, height
        var rect = raphaelCanvas.paper.rect(x, y,
                                   this.width,
                                   this.height);
        rect.attr({"fill": "#f00", "stroke": "#000"});

        text.toFront();
    }

}

class Arrow implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
    }

    public draw(raphaelCanvas: RaphaelCanvas, x: number, y: number) {
        var margin = (this.height - (this.height / 2.5)) / 2;

        var text = raphaelCanvas.paper.text(x + margin, y + (this.height / 2), this.text);
        text.attr({"font-size": this.height / 2.5,
                   "text-anchor": "start"});

        var textWidth = text.getBBox().width;
        
        
        var path = raphaelCanvas.paper.path("M"+x+","+(y+(this.height / 2))+"L"+(x+this.width)+","+(y+(this.height / 2)));

        path.attr({"stroke": "black", 
	               "stroke-width": 2, 
	               "arrow-end": "block-wide-long"});
    }
}