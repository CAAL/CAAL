<?php
if($_POST["email"] != "") {
    $headers = 'From: '.$_POST["email"]."\r\n".'Reply-To: '.$_POST["email"];
    if(mail("caal@cs.aau.dk", $_POST["subject"], $_POST["text"], $headers)) {
        echo "true";
    } else {
        echo "false";
    }
} else {
    if(mail("caal@cs.aau.dk", $_POST["subject"], $_POST["text"])) {
        echo "true";
    } else {
        echo "false";
    }
}
    
?>