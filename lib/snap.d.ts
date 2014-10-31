//Type definitions for Snap
// Definitions by: FuzzyAzurik <https://github.com/FuzzyAzurik>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

interface BoundingBox {
    x: number;
    y: number;
    x2: number;
    y2: number;
    width: number;
    w: number;
    height: number;
    h: number;
    cx: number;
    cy: number;
    path: string;
    r0: number;
    r1: number;
    r2: number;
    vb: number;
}

interface SnapFilter {
    blur();
    brightness();
    contrast();
    grayscale();
    hueRotate();
    invert();
    staturate();
    sepia();
    shadow();

}

interface SnapPath {
    bezierBBox(p1x: number, p1y: number, c1x: number, c1y: number, c2x: number, c2y: number, p2x: number, p2y: number): { min: { x: number; y: number; }; max: { x: number; y: number; }; };
    bezierBBox(bez: any[]): { min: { x: number; y: number; }; max: { x: number; y: number; }; };
    findDotsAtSegment(p1x: number, p1y: number, c1x: number, c1y: number, c2x: number, c2y: number, p2x: number, p2y: number, t: number): { x: number; y: number; m: { x: number; y: number; }; n: { x: number; y: number; }; start: { x: number; y: number; }; end: { x: number; y: number; }; alpha: number; };
    getBBox(path: string): BoundingBox;
    getPointAtLength();
    getSubpath();
    getTotalLength();
    intersection();
    isBBoxIntersect();
    isPointInside();
    isPointInsideBBox();
    map();
    toAbsolute();
    toCubic();
    toRelative();
}


interface SnapStatic {
    (width: number, height: number): SnapElement;
    (width: string, height: string): SnapElement;
    (DOM: any) : SnapElement;
    (all: any[]): SnapElement;
    (query: string): SnapElement;
    path: SnapPath;
    filter: SnapFilter;


    ajax(url: string, postData: string, callback: Function, scope: any): any;
    ajax(url: string, postData: any, callback: Function, scope: any): any;
    ajax(url: string, callback: Function, scope: any): any;
    angle(x1: number, y1: number, x2: number, y2: number, x3?: number, y3?: number): number;
    animate();
    animation(params: any, ms: number, easing?: string, callback?: Function): any;
    color(clr: string): { r: number; g: number; b: number; hex: string; error: boolean; h: number; s: number; v: number; l: number; };
    deg(deg: number): number;
    format(token: string, ...parameters: any[]): string;
    fragment();
    getElementByPoint();
    getRGB(colour: string): { r: number; g: number; b: number; hex: string; error: boolean; };
    hsb(h: number, s: number, b: number): string;
    hsb2rgb(h: number, s: number, v: number): { r: number; g: number; b: number; hex: string; };
    hsl(h: number, s: number, l: number): string;
    hsl2rgb(h: number, s: number, l: number): { r: number; g: number; b: number; hex: string; };
    is(o: any, type: string): boolean;
    matrix(a: number, b: number, c: number, d: number, e: number, f: number): SnapMatrix;
    Matrix(a: number, b: number, c: number, d: number, e: number, f: number): SnapMatrix;
    parse();
    parsePathString(pathString: string): string[];
    parsePathString(pathString: string[]): string[];
    parseTransformString(TString: string): string[];
    parseTransformString(TString: string[]): string[];
    plugin();
    rad(deg: number): number;
    rgb(r: number, g: number, b: number): string;
    rgb2hsb(r: number, g: number, b: number): { h: number; s: number; b: number; };
    rgb2hsl(r: number, g: number, b: number): { h: number; s: number; l: number; };
    select(query: string): SnapElement;
    selectAll(query: string): SnapElement;
    snapTo(values: number, value: number, tolerance?: number): number;
    snapTo(values: number[], value: number, tolerance?: number): number;

}

interface SnapElement {
    add(el: SnapElement): SnapElement;
    add(el: SnapSet): SnapElement;
    addClass(value: string): SnapElement;
    after(el: SnapElement): SnapElement;
    animate(params: { [key: string]: any; }, ms: number, easing?: string, callback?: Function): SnapElement;
    animate(animation: any): SnapElement;
    append(el : SnapElement): SnapElement;
    append(el : SnapSet): SnapElement;
    appendTo(el: SnapElement): SnapElement;
    asPX(attr: string, value: string): SnapElement;
    attr(attrName: string, value: any): SnapElement;
    attr(params: any): SnapElement;
    attr(attrName: string): any;
    attr(attrNames: string[]): any[];
    before(el: SnapElement): SnapElement;
    click(handler: Function): SnapElement;
    clone(): SnapElement;
    data(key: string): any;
    data(key: string, value: any): SnapElement;
    dblclick(handler: Function): SnapElement;
    drag(onmove: (dx: number, dy: number, x: number, y: number, event: DragEvent) =>{ }, onstart: (x: number, y: number, event: DragEvent) =>{ }, onend: (DragEvent: any) =>{ }, mcontext?: any, scontext?: any, econtext?: any): SnapElement;
    getBBox(isWithoutTransform?: boolean): BoundingBox;
    hasClass(value: string): boolean;
    hover(f_in: Function, f_out: Function, icontext?: any, ocontext?: any): SnapElement;
    insertAfter(el: SnapElement): SnapElement;
    insertBefore(el: SnapElement): SnapElement;
    innerSVG(): string;
    marker(x: number, y: number, width: number, height: number, refX: number, refY: number): SnapElement;
    mousedown(handler: Function): SnapElement;
    mousemove(handler: Function): SnapElement;
    mouseout(handler: Function): SnapElement;
    mouseover(handler: Function): SnapElement;
    mouseup(handler: Function): SnapElement;
    node: SVGElement;
    outerSVG(): string;
    parent(): SnapElement;
    prepend(el: SnapElement): SnapElement;
    prependTo(el: SnapElement): SnapElement;
    remove(): void;
    removeClass();
    removeData(key?: string): SnapElement;
    select(query: string): SnapElement;
    selectAll(query: string): any;
    stop(anim?: any): SnapElement;
    toDefs(): SnapElement;
    toPattern(x: number, y: number, width: number, height: number): SnapElement;
    toPattern(x: string, y: string, width: string, height: string): SnapElement;
    toString(): string;
    toggleClass(value: string, flag: boolean): SnapElement;
    touchcancel(handler: Function): SnapElement;
    touchend(handler: Function): SnapElement;
    touchmove(handler: Function): SnapElement;
    touchstart(handler: Function): SnapElement;
    transform(): string;
    transform(tstr: string): SnapElement;
    unclick(handler: Function): SnapElement;
    undblclick(handler: Function): SnapElement;
    undrag(): SnapElement;
    unhover(): SnapElement;
    unhover(f_in: Function, f_out: Function): SnapElement;
    unmousedown(handler: Function): SnapElement;
    unmousemove(handler: Function): SnapElement;
    unmouseout(handler: Function): SnapElement;
    unmouseover(handler: Function): SnapElement;
    unmouseup(handler: Function): SnapElement;
    untouchcancel(handler: Function ): SnapElement;
    untouchend(handler: Function): SnapElement;
    untouchmove(handler: Function): SnapElement;
    untouchstart(handler: Function): SnapElement;
    use(): SnapElement;

}

interface SnapPaper {
    circle(x: number, y: number , r: number): any;
    clear(): void;
    el(name: string, attr: any): SnapElement;
    ellipse(x: number, y: number, rx: number, ry: number): any;
    filter(filstr: string): any;
    g(...varargs:any[]): any;
    gradient(gradient: string) : any;
    group(): any;
    image(src: string, x: number, y: number, width: number, height: number): any;
    line(x1: number, y1: number, x2: number, y2:number): any;
    mask() : any;
    path(pathString: string);
    polyline(points: number[]): any;
    polyline(...varargs: number[]): any;
    polygon(points: number[]): any;
    polygon(...varargs: number[]): any;
    ptrn(x?: number, y?: number, width?: number, height?: number, vbx?: number, vby?: number, vbw?:number, vbh?: number) : any;
    rect(x: number, y: number, width: number, height: number, rx?: number, ry?: number): any;
    svg(x?: number, y?: number, width?: number, height?: number, vbx?: number, vby?: number, vbw?:number, vbh?: number) : any;
    text(x: number, y: number, text: string) : any;
    text(x: number, y: number, text: string[]) : any;
    toString(): string;
    use(id?: string);
    use(id?: SnapElement);
}

interface SnapMatrix{
    add(a: number, b: number, c: number, d: number, e: number, f: number, matrix: SnapMatrix): SnapMatrix;
    clone(): SnapMatrix;
    invert(): SnapMatrix;
    rotate(a: number, x: number, y: number): void;
    scale(x: number, y?: number, cx?: number, cy?: number): void;
    split(): { dx: number; dy: number; scalex: number; scaley: number; shear: number; rotate: number; isSimple: boolean; };
    toTransformString(): string;
    translate(x: number, y: number): void;
    x(x: number, y: number): number;
    y(x: number, y: number): number;
}

interface SnapMina{
    (a: number, A: number, b: number, B: number, get: Function, set: Function, easing?: Function) : SnapAnimationDescriptor;
    backin(n: number): number;
    backout(n: number): number;
    bounce(n: number): number;
    easein(n: number): number;
    easeout(n: number): number;
    elastic(n: number): number;
    getbyid(id: string): any;
    linear(n: number): number;
    time(): any;
}

interface SnapAnimationDescriptor {
    id : string;
    start: number;
    end: number;
    b: number;
    s: number;
    dur: number;
    spd: number;
    get():any;
    set(): any;
    easing(): any;
    status(): any;
    speed(): any;
    duration(): any;
    stop(): any;
    pause(): any;
    resume(): any;
    update(): any;
}

interface SnapFragment {
    // methods
}

interface SnapSet {

}

declare var Snap: SnapStatic