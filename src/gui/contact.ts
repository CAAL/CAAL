/// <reference path="project.ts" />

module ContactForm {
    export function init() {
        // Get project
        var project = Project.getInstance();

        // Set version in contact form
        $("#contact-version").attr("placeholder", Main.getVersion());

        // Set validation on focusout
        $("#contact-form > .form-group").each( (i, item) => {
            $(item).on( "focusout", () => {
                verifyFormGroup($(item));
            });
        });

        $("#contact-send").on("click", () => {
            var url = "mailer.php";

            if(!verifyForm()) {
                return false;
            }

            $.ajax({
                type: "POST",
                url: url,
                data: {subject: $("#contact-subject").val(),
                       email: $("#contact-email").val(),
                       text: $("#contact-text").val(),
                       name: $("#contact-name").val(),
                       project: ($('#contact-isAttached').is(':checked')) ? project.toJSON() : "",
                       version: Main.getVersion()},
                success: function(data)
                {
                    if(data == "true") {
                        showSuccess();
                    } else {
                        showError();
                    }
                },
                error: function(data)
                {
                    showError();
                }
            });

            return false; // avoid to execute the actual submit of the form.
        });
    }

    function verifyFormGroup(element) {
        var control = element.find(".form-control");
        var result = true;

        var test = control.attr('id')

        if(control.attr('id') == "contact-email") {
            result = validateEmail(control.val());
        } else {
            result = (control.val() == "") ? false : true;
        }

        if(result) {
            element.removeClass("has-error");
        } else {
            element.removeClass("has-error").addClass("has-error");
        }

        return result;
    }

    function verifyForm() {
        var result = true;

        $("#contact-form > .form-group").each( (i, item) => {
            var test = $(item).attr('class');
            result = (verifyFormGroup($(item))) ? result : false;
        });

        return result;
    }

    function validateEmail(email) {
        var re = /\S+@\S+/;
        return re.test(email);
    }

    function showSuccess() {
        $("#contactModal").modal("hide");
        Main.showNotification("Thank you!", 2000);
    }

    function showError() {
        $("#contactModal").modal("hide");
        Main.showNotification("An error occurred, please try again", 2000);
    }
}
