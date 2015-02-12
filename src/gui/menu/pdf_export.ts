/// <reference path="../menu.ts" />

declare var PDFDocument : any;
declare var blobStream : any;

class PdfExport extends MenuItem {

    private doc;

	public onClick(e) : void {
        this.doc = new PDFDocument();
		var stream = this.doc.pipe(blobStream());
		var project = this.project;

		this.doc.info.Title = project.getTitle();

        console.log(this.doc.info.Title);

        this.doc.fontSize(26).font('Helvetica').fillColor('black').text(project.getTitle(), {align: 'center'});
        this.doc.moveDown()

        var splitted = project.getCCS().split("\n");
        
        for(var line in splitted) {
            this.addLine(splitted[line]);
        }

		
		stream.on("finish", () => {
			window.open(stream.toBlobURL("application/pdf"), project.getTitle());
		});

        this.doc.end();
        
	}

    private addLine(text: string): void {
        if(text) {
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

            this.doc.fontSize(10).font('Courier').fillColor('black').text(match[1], {continued: continueCheck}).fillColor('green').text(match[2], {continued: false});

        } else {
            this.doc.fontSize(10).font('Courier').text("\n");
        }
        
    }
}
