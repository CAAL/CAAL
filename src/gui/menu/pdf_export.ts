/// <reference path="../menu.ts" />

declare var PDFDocument : any;
declare var blobStream : any;

class PdfExport extends MenuItem {
	public onClick(e) : void {
		var doc = new PDFDocument(),
			stream = doc.pipe(blobStream()),
			project = this.project;

		// doc.registerFont('Code', 'fonts/Inconsolata-Regular.ttf', 'Inconsolata');

		doc.info.Title = project.getTitle();

		doc.fontSize(10).font('Courier').text(project.getCCS());

		doc.end();
		stream.on("finish", () => {
			window.open(stream.toBlobURL("application/pdf", project.getTitle()));
		});
		console.log("test");
	}
}