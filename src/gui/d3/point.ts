
class Point {
    constructor(public x : number, public y : number) {
    }

    public add(v){
        return new Point(this.x + v.x, this.y + v.y);
    }

    public clone(){
        return new Point(this.x, this.y);
    }

    public degreesTo(v){
        var dx = this.x - v.x;
        var dy = this.y - v.y;
        var angle = Math.atan2(dy, dx); // radians
        return angle * (180 / Math.PI); // degrees
    }

    public distanceTo(v : Point){
        var x = this.x - v.x;
        var y = this.y - v.y;
        return Math.sqrt(x * x + y * y);
    }

    public equals(toCompare){
        return this.x == toCompare.x && this.y == toCompare.y;
    }

    public interpolateTo(v : Point, f : number){
        return new Point((this.x + v.x) * f, (this.y + v.y) * f);
    }

    public length(){
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public normalize(thickness){
        var l = this.length();
        this.x = this.x / l * thickness;
        this.y = this.y / l * thickness;
    }

    public orbit(origin, arcWidth, arcHeight, degrees){
        var radians = degrees * (Math.PI / 180);
        this.x = origin.x + arcWidth * Math.cos(radians);
        this.y = origin.y + arcHeight * Math.sin(radians);
    }

    public offset(dx, dy){
        this.x += dx;
        this.y += dy;
    }

    public subtract(v){
        return new Point(this.x - v.x, this.y - v.y);
    }

    public toString(){
        return "(x=" + this.x + ", y=" + this.y + ")";
    }
     
    public interpolateFromTo(pt1 : Point, pt2 : Point, f : number){
        return new Point((pt1.x + pt2.x) * f, (pt1.y + pt2.y) * f);
    }

    public polar(len, angle : number){
        return new Point(len * Math.cos(angle), len * Math.sin(angle));
    }

    public distanceFromTo(pt1 : Point, pt2 : Point){
        var x = pt1.x - pt2.x;
        var y = pt1.y - pt2.y;
        return Math.sqrt(x * x + y * y);
    }
}