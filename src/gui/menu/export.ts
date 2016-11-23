/// <reference path="menuitem.ts" />

declare var PDFDocument : any;
declare var blobStream : any;

// Create cached resource store
var getResource = ((rStore) => {
    return (resource, callback) => {
        if (rStore[resource] === undefined) {
            rStore[resource] = null;
            var oReq = new XMLHttpRequest();
            oReq.open("GET", resource, true);
            oReq.responseType = "arraybuffer";
            oReq.onload = function(oEvent) {
                rStore[resource] = new Uint8Array(oReq.response);
                callback(rStore[resource]);
            };
            oReq.send(null);
        } else {
            callback(rStore[resource]);
        }
    }
})(Object.create(null)) 

class Export extends MenuItem {

	protected onClick(e) : void {
        var doc = new PDFDocument();
        //Ensure resource loaded
        getResource("fonts/DejaVuSansMono.ttf", (res) => {
            doc.registerFont('MainFont', res, null);
            this.createPDF(doc);
        });
	}

    private createPDF(doc) : void {
        
        doc.info.Title = this.project.getTitle();
        doc.fontSize(26).font("Helvetica").fillColor("black").text(this.project.getTitle(), {align: "center"});
        doc.moveDown();

        this.project.setCCS(this.project.getCCS().replace("\r", "")); // remove return characters.

        var splitted = this.project.getCCS().split(/\n/);

        for(var line in splitted) {
            this.addLine(doc, splitted[line]);
        }

        var stream = doc.pipe(blobStream());

        stream.on("finish", () => {
            window.open(stream.toBlobURL("application/pdf"), this.project.getTitle());
        });

        doc.end();
    }

    private addLine(doc, text : string) : void {
        if (text) {
            // match[1] contains the code. match[2] contains a potential comment.
            var match = text.match(/^([^\*]*)(\*.*)?$/);

            var continueCheck = true;

            if (match[1] === undefined) {
                match[1] = "";
            }

            if (match[2] === undefined) {
                match[2] = "";
                continueCheck = false;
            }

            doc.fontSize(10).font("MainFont").fillColor("black").text(match[1], {continued: continueCheck}).fillColor("green").text(match[2], {continued: false});
        } else {
            doc.fontSize(10).font("MainFont").text("\n");
        }
    }
}
