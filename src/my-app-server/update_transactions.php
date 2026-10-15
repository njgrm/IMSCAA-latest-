<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
require_operator();
api_error(410, 'Transaction snapshots were retired. Record payments against the existing obligation.', 'PAYMENT_UPDATE_RETIRED');
