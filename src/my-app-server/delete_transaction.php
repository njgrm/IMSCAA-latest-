<?php
require_once __DIR__ . '/bootstrap.php';
require_method('DELETE');
require_roles('adviser');
api_error(410, 'Financial deletion was retired. Use the audited obligation void action.', 'TRANSACTION_DELETE_RETIRED');
