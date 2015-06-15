<?php

require("mailconfig.php");

global $mailconfig;

if($_POST["contact-cat-email"] !== "") {
    $headers = 'From: '.$_POST["contact-cat-email"]."\r\n".'Reply-To: '.$_POST["contact-cat-email"];
    if(mail("caal@cs.aau.dk", $_POST["contact-cat-subject"], $_POST["contact-cat-text"], $headers)) {
        echo "true";
    } else {
        echo "false";
    }
} else {
    if(mail("caal@cs.aau.dk", $_POST["contact-cat-subject"], $_POST["contact-cat-text"])) {
        echo "true";
    } else {
        echo "false";
    }
}
    
?>