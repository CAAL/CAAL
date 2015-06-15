<?php

require("mailconfig.php");

global $mailconfig;

if($_POST["contact-cat-email"] !== "") {
    $headers = 'From: '.$_POST["contact-cat-email"]."\r\n".'Reply-To: '.$_POST["contact-cat-email"];
    if(mail($mailconfig->to, $_POST["contact-cat-subject"], $_POST["contact-cat-text"], $headers)) {
        echo "true";
    } else {
        echo "false";
    }
} else {
    if(mail($mailconfig->to, $_POST["contact-cat-subject"], $_POST["contact-cat-text"])) {
        echo "true";
    } else {
        echo "false";
    }
}
    
?>