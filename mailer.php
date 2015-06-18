<?php
if($_POST["project"] == "") {
    $headers = "From: ".$_POST["name"]." <".$_POST["email"].">\r\n".'Reply-To: '.$_POST["email"];
    if(mail("caal@cs.aau.dk", $_POST["subject"]." (".$_POST["version"].")", $_POST["text"], $headers)) {
        echo "true";
    } else {
        echo "false";
    }
} else {
    if( mail_attachment($_POST["project"], "caal@cs.aau.dk", $_POST["email"], $_POST["name"], $_POST["subject"]." (".$_POST["version"].")", $_POST["text"]) ) {
        echo "true";
    } else {
        echo "false";
    }
}

function mail_attachment($filecontent, $mailto, $from_mail, $from_name, $subject, $message) {

$filename = "project.caal";
$content_attachment = chunk_split(base64_encode(json_encode($filecontent)));
$uid = md5(uniqid(time()));
$type = "text/plain";

$header = "From: ".$from_name." <".$from_mail.">\n";
$header .= "Reply-To: ".$from_mail."\n";
$header .= "MIME-Version: 1.0\n";
$header .= "Content-Type: multipart/mixed; boundary=\"".$uid."\"\n";

$content = "\n--".$uid."\n";
$content .= "Content-Type:text/plain; charset=iso-8859-1\n";
$content .= "Content-Transfer-Encoding: 7bit\n\n";
$content .= $message."\n";

$content .= "\n--".$uid."\n";
$content .= "Content-Type: $type; name=\"".$filename."\"\n";
$content .= "Content-Transfer-Encoding: base64\n";
$content .= "Content-Disposition: attachment; filename=\"".$filename."\"\n\n";
$content .= $content_attachment."\n";
$content .= "\n--".$uid."--";

return mail($mailto, $subject, $content, $header);
}
    
?>