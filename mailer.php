<?php

require("mailconfig.php");

global $mailconfig;

if(mail($mailconfig->to, $_POST["contact-cat-subject"], $_POST["contact-cat-text"], $mailconfig->headers)) {
    echo "true";
} else {
    echo "false";
}
    
?>