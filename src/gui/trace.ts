/// <reference path="../../lib/raphael.d.ts" />
class RaphaelCanvas {
    
    private currentX: number;
    private currentY: number;
    public paper: RaphaelPaper;
    
    constructor(htmlElement: string, private width: number, private height: number) {
        this.paper = Raphael(htmlElement, width, height);
        this.currentX = 0;
        this.currentY = 0;
    }
    
    public draw() {
        var traces: Trace[] = [Trace.GetTrace(this.paper)];
        
        traces.forEach( (item) => {
            item.draw(this.currentX, this.currentY);
            this.currentX += item.width;
            this.currentY += item.height;
        });
    }
}

interface Drawable {
    paper: RaphaelPaper;
    width: number;
    draw(x: number, y: number);
}

class Trace implements Drawable {
    static LineHeight = 40;
    static LineSpacing = 20;
    
    // save how much space the trace used in the canvas
    public width: number;
    public height: number;
    
    constructor(public paper: RaphaelPaper, private drawables: Drawable[]) { }

    static GetTrace(paper: RaphaelPaper) : Trace {
        var drawables: Drawable[]  = [new Circle(paper, 10, "Yo"), new Square(paper, 30, "To")];
        var trace = new Trace(paper, drawables);
        // TODO: fix method structure
        
        return trace;
    }
    
    public draw(x: number, y: number) {
        this.drawables.forEach( (item) => {
            item.draw(x, y);
            x += item.width;
        });
    }
}

class Circle implements Drawable {
    public width: number;
    
    constructor(public paper: RaphaelPaper, private radius: number, private text: string) {
        this.width = radius*2;
    }

    public draw(x: number, y: number) {
        var circle = this.paper.circle(x + this.radius, y + this.radius, this.radius);
        circle.attr({"fill": "#f00", "stroke": "#000"});
    }
}

class Square implements Drawable {
    
    private height: number;
    
    constructor(public paper: RaphaelPaper, public width: number, private text: string) {
        this.height = this.width;
    }

    public draw(x: number, y: number) {
        var margin = (this.width - (this.width / 2.5)) / 2;

        var text = this.paper.text(x + margin, y + (this.height / 2), this.text);
        text.attr({"font-size": this.width / 2.5,
                   "text-anchor": "start"});

        var textWidth = text.getBBox().width;
        
        // set width of the square to make room for the text
        this.width = (textWidth + margin*2 > this.width) ? textWidth + margin*2 : this.width;
        
        // Parameters: x, y, width, height
        var rect = this.paper.rect(x, y,
                                   this.width,
                                   this.height);
        rect.attr({"fill": "#f00", "stroke": "#000"});

        text.toFront();
    }

}

class Arrow implements Drawable {
    private height;
    
    constructor(public paper: RaphaelPaper, public width: number, private text: string) {
        this.height = 10;
    }

    public draw(x: number, y: number) {
        var path = this.paper.path("M"+x+","+(y+this.height)+"L"+(x+this.width)+","+(y+this.height));

        path.attr({"stroke": "black", 
	               "stroke-width": 2, 
	               "arrow-end": "block-wide-long"});
    }
}