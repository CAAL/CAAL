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
                data: $("#contact-form").serialize(), // serializes the form's elements.
                success: function(data)
                {
                    if(data == "true") {
                        
                        //$("#contact-modal").modal("hide");
                    } else {
                        showError();
                    }
                },
                error: function(data)
                {
                    showError();
                    alert("An error occured");
                }
            });

            return false; // avoid to execute the actual submit of the form.
        });
    }

    function showSuccess() {
        $("#contact-modal").find(".form-group").hide();
    }

    function showError() {
        $("#contact-modal").find(".form-group").hide();
    }
}




