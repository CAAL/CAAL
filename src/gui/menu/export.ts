/// <reference path="menuitem.ts" />

declare var PDFDocument : any;
declare var blobStream : any;

class Export extends MenuItem {
    private doc;

	protected onClick(e) : void {
        this.doc = new PDFDocument();
		this.doc.info.Title = this.project.getTitle();
        this.doc.fontSize(26).font("Helvetica").fillColor("black").text(this.project.getTitle(), {align: "center"});
        this.doc.moveDown();

        this.project.setCCS(this.project.getCCS().replace("\r", "")); // remove return characters.

        var splitted = this.project.getCCS().split(/\n/);

        for(var line in splitted) {
            this.addLine(splitted[line]);
        }

        var stream = this.doc.pipe(blobStream());

		stream.on("finish", () => {
			window.open(stream.toBlobURL("application/pdf"), this.project.getTitle());
		});

        this.doc.end();
	}

    private addLine(text : string) : void {
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

            this.doc.fontSize(10).font("Courier").fillColor("black").text(match[1], {continued: continueCheck}).fillColor("green").text(match[2], {continued: false});
        } else {
            this.doc.fontSize(10).font("Courier").text("\n");
        }
    }
}
