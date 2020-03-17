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

// https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
function downloadPDF(blob, filename) {
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(blob, filename);
    else { // Others
        var a = document.createElement("a"),
                url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}

class Export extends MenuItem {

    private options : any = {};

    public constructor(button : string, activityHandler : Activity.ActivityHandler, options? : any) {
        super(button, activityHandler);
        if (options !== undefined && options instanceof Object) {
            this.options = options;    
        }
    }

	protected onClick(e) : void {
        var doc = new PDFDocument();
        //Ensure resource loaded
        getResource("fonts/DejaVuSansMono.ttf", (monoFont) => {
            getResource("fonts/DejaVuSans.ttf", (notMonoFont) => {
                doc.registerFont('MainFont', monoFont, null);
                doc.registerFont('PropertyFont', notMonoFont, null);
                this.createPDF(doc);
            });
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

        if (this.options.properties) {
            this.addProperties(doc);
        }

        var stream = doc.pipe(blobStream());

        stream.on("finish", () => {
            downloadPDF(stream.toBlob("application/pdf"), this.project.getTitle() + ".pdf");
        });

        doc.end();
    }

    private addProperties(doc) {
        var pi = {
            width: doc.page.width,
            height: doc.page.height,
            margins: doc.page.margins
        };

        var minY = pi.margins.top,
            maxY = pi.height - pi.margins.bottom,
            minX = pi.margins.left,
            maxX = pi.width - pi.margins.right,
            contentWidth = maxX - minX,
            contentHeight = maxY - minY;

        doc.moveDown(2);

        // --- Make bar to separate properties from definitions.

        // Check for room
        if (doc.y > (maxY - 10)) {
            doc.addPage();
        }

        // Make bar
        doc.fillColor('black')
           .rect(
               minX,
               doc.y,
               contentWidth,
               2.5)
           .fill();

        doc.moveDown();

        // Make room for status and time, give rest to properties
        var gap = 30, statusWidth = 65, timeWidth = 60, xPositions = [minX, 0, 0];
        xPositions[1] = xPositions[0] + statusWidth + gap;
        xPositions[2] = xPositions[1] + timeWidth + gap;
        var remainWidth = maxX - xPositions[2];

        var totalColumns = 0;
        function writePropertyRow(row : any) {
            var columns = [
                [row[0], 'left', statusWidth],
                [row[1], 'right', timeWidth],
                [row[2], 'left', remainWidth]
            ];

            var separatorPadding = 10;
            if (++totalColumns > 1) {
                //Make column separator
                doc.fillColor('grey').rect(minX, doc.y, contentWidth, 0.6).fill();
            }
            doc.y += separatorPadding;

            doc.fontSize(9).font("PropertyFont").fillColor("black");
            
             //ASSUMPTION: The rightmost text will always be at least as high as any other. Otherwise y-position resets may screw up.
            var startY = doc.y;
            columns.forEach((column, index) => {
                doc.x = xPositions[index];
                doc.y = startY;
                doc.text(column[0], {width: column[2], align: column[1]});
            });

            //Note: This can exceed page y limit and cause weird page issues, and y-coordinates
            doc.y += separatorPadding;
            if (doc.y >= (maxY - doc.currentLineHeight(true))) {
                doc.addPage(); //Also, resets 'doc.y', see note above.
            }
        }

        function getRowData(property) {
            var statusTable = {};
            statusTable[PropertyStatus.unknown] = 'Unknown';
            statusTable[PropertyStatus.satisfied] = 'Satisfied';
            statusTable[PropertyStatus.unsatisfied] = 'Unsatisfied';
            statusTable[PropertyStatus.invalid] = 'Invalid';
            
            var time = property.getElapsedTime();
            if (time === undefined || time === null) {
                time = 'N/A';
            }

            // Hack, to strip html entities.
            // Also, insecure, but not particularly since it requires actually exporting own controlled data.
            var unprocessedDescription = property.getDescription();
            var desc = $('<div/>').html(unprocessedDescription).text();
            return [statusTable[property.getStatus()], time, desc];
        }

        this.project.getProperties().forEach(prop => {
            writePropertyRow(getRowData(prop));
        });
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
