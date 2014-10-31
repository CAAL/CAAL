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
        var drawables: Drawable[]  = [new Square(40, Trace.LineHeight, "o"), new Arrow(40, Trace.LineHeight, "a")];
        for (var i: number = 1; i < 25; i++) {
            drawables.push(new Circle(40, Trace.LineHeight, "o"));
            drawables.push(new Arrow(40, Trace.LineHeight, "a"));
        }
        drawables.push(new Square(40, Trace.LineHeight, "TTo"));
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
    
        var circle: RaphaelElement = raphaelCanvas.paper.circle(x + radius, y + radius, radius);
        circle.attr({"fill": "#f00", "stroke": "#000"});
    }
}

class Square implements Drawable {
    
    constructor(public width: number, public height: number, private text: string) {
    }

    public draw(raphaelCanvas: RaphaelCanvas, x: number, y: number) {
        var margin = (this.height - (this.height / 2.5)) / 2;

        var text: RaphaelElement = raphaelCanvas.paper.text(x, y, this.text); // x and y doesnt matter here, move it below
        text.attr({"font-size": this.height / 2.5});

        var textWidth = text.getBBox().width;
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
        
        // Parameters: x, y, width, height
        var rect: RaphaelElement = raphaelCanvas.paper.rect(x, y,
                                   this.width,
                                   this.height);
        rect.attr({"fill": "#f00", "stroke": "#000"});
        
        text.toFront();
        
        // center text
        text.attr({"x": x+this.width/2, "y": y+this.height/2});
    }

}

class Arrow implements Drawable {

    constructor(public width: number, public height: number, private text: string) {
    }

    public draw(raphaelCanvas: RaphaelCanvas, x: number, y: number) {
        var margin: number = (this.height - (this.height / 2.5)) / 2;

        var text: RaphaelElement = raphaelCanvas.paper.text(x, y, this.text); // x and y doesnt matter here, move it below
        text.attr({"font-size": this.height / 2.5});

        var textWidth: number = text.getBBox().width;
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
        
        
        var path: RaphaelPath = raphaelCanvas.paper.path("M"+x+","+(y+(this.height / 2))+"L"+(x+this.width)+","+(y+(this.height / 2)));
        
        path.attr({"stroke": "black", 
	               "stroke-width": 2, 
	               "arrow-end": "block-wide-long"});
        
        // center text right above the arrow
        var textPosition: number = (y + this.height/2) - (path.attr("stroke-width") + text.getBBox().height/2);
        text.attr({"x": x+this.width/2, "y": textPosition});
    }
}