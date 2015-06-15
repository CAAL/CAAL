module ContactForm {
    export function init() {
        $('#contact').click(() => {
            $("#contact-modal").modal("show");
        });

        $("#contact-send").on("click", () => {
            var url = "mailer.php";

            $.ajax({
                type: "POST",
                url: url,
                data: {form: $("#contact-form").serialize(),
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

    function showSuccess() {
        $("#contact-modal").modal("hide");
        Main.showInfoBox("Thank you!", 2500);
    }
    
    function showError() {
        $("#contact-modal").modal("hide");
        Main.showInfoBox("An error occurred, please try again", 2500);
    }
}




