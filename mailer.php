<?php

require("mailconfig.php");

global $mailconfig;

return mail($mailconfig->to, $_POST["contact-cat-subject"], $_POST["contact-cat-text"], $mailconfig->headers);
?>