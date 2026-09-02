DESC users;
user_id	int(11)	NO	PRI	NULL	auto_increment	
username	varchar(50)	NO	UNI	NULL		
password	varchar(255)	NO		NULL		
email	varchar(100)	NO	UNI	NULL		
role	enum('adviser','president','officer','member')	NO		NULL		
club_id	int(11)	NO	MUL	NULL		
school_id	varchar(20)	NO		NULL		
user_fname	varchar(50)	NO		NULL		
user_lname	varchar(50)	NO		NULL		
user_mname	char(1)	YES		NULL		
user_course	varchar(100)	NO		NULL		
user_year	varchar(11)	NO		NULL		
user_section	varchar(50)	NO		NULL		
avatar	longtext	YES		NULL		
contact_info	varchar(20)	YES		NULL		
date_added	datetime(6)	NO		current_timestamp(6)		



127.0.0.1/db_imscca/attendance/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=attendance
Your SQL query has been executed successfully.

DESC users;



user_id	int(11)	NO	PRI	NULL	auto_increment	
username	varchar(50)	NO	UNI	NULL		
password	varchar(255)	NO		NULL		
email	varchar(100)	NO	UNI	NULL		
role	enum('adviser','president','officer','member')	NO		NULL		
club_id	int(11)	NO	MUL	NULL		
school_id	varchar(20)	NO		NULL		
user_fname	varchar(50)	NO		NULL		
user_lname	varchar(50)	NO		NULL		
user_mname	char(1)	YES		NULL		
user_course	varchar(100)	NO		NULL		
user_year	varchar(11)	NO		NULL		
user_section	varchar(50)	NO		NULL		
avatar	longtext	YES		NULL		
contact_info	varchar(20)	YES		NULL		
date_added	datetime(6)	NO		current_timestamp(6)		


127.0.0.1/db_imscca/		http://localhost/phpmyadmin/index.php?route=/database/sql&db=db_imscca
Your SQL query has been executed successfully.

DESCRIBE transactions;

transaction_id	int(11)	NO	PRI	NULL	auto_increment	
user_id	int(11)	NO	MUL	NULL		
requirement_id	int(11)	NO	MUL	NULL		
amount_due	decimal(10,2)	NO	MUL	NULL		
amount_paid	decimal(10,2)	YES		0.00		
payment_status	enum('unpaid','partial','paid')	YES		unpaid		
payment_method	varchar(50)	YES		NULL		
payment_date	datetime(6)	YES		NULL		
due_date	datetime(6)	YES		NULL		
verified_by	int(11)	YES	MUL	NULL		
date_added	datetime(6)	YES		current_timestamp(6)		
fee_description	text	NO		NULL		


127.0.0.1/db_imscca/		http://localhost/phpmyadmin/index.php?route=/database/sql&db=db_imscca
Your SQL query has been executed successfully.

DESCRIBE requirements;
requirement_id	int(11)	NO	PRI	NULL	auto_increment	
title	varchar(255)	NO		NULL		
description	text	NO		NULL		
start_datetime	datetime(6)	NO		NULL		
end_datetime	datetime(6)	NO		NULL		
location	varchar(255)	NO		NULL		
requirement_type	enum('event','activity','fee')	NO		NULL		
status	enum('scheduled','ongoing','canceled','completed')	NO		NULL		
club_id	int(11)	NO	MUL	NULL		
amount_due	decimal(10,2)	YES		0.00		
req_picture	longtext	YES		NULL		
date_added	datetime(6)	YES		current_timestamp(6)		


127.0.0.1/db_imscca/invite_links/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=invite_links
Your SQL query has been executed successfully.

DESCRIBE invite_links;

id	int(11)	NO	PRI	NULL	auto_increment	
token	varchar(64)	NO	UNI	NULL		
role	enum('member','officer','president')	NO		NULL		
allowed_signups	int(11)	NO		1		
used_count	int(11)	NO		0		
expiry	datetime	NO		NULL		
club_id	int(11)	NO	MUL	NULL		
created_by	int(11)	NO	MUL	NULL		
created_at	datetime	NO		current_timestamp()		


127.0.0.1/db_imscca/invite_links/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=invite_links
Your SQL query has been executed successfully.

127.0.0.1/db_imscca/approval_requests/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=approval_requests
Your SQL query has been executed successfully.

DESCRIBE approval_requests;



request_id	int(11)	NO	PRI	NULL	auto_increment	
type	enum('user','requirement','club','transaction')	NO	MUL	NULL		
approval_type	enum('delete','attendance_edit')	YES	MUL	delete		
target_id	int(11)	NO		NULL		
club_id	int(11)	NO	MUL	NULL		
requested_by	int(11)	NO	MUL	NULL		
status	enum('pending','approved','denied')	YES	MUL	pending		
reason	varchar(255)	YES		NULL		
original_status	varchar(20)	YES		NULL		
requested_status	varchar(20)	YES		NULL		
attendance_record_id	int(11)	YES		NULL		
requested_at	datetime	YES		current_timestamp()		
approved_by	int(11)	YES	MUL	NULL		
approved_at	datetime	YES		NULL		


127.0.0.1/db_imscca/club/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=club
Your SQL query has been executed successfully.

DESCRIBE club;

club_id	int(11)	NO	PRI	NULL	auto_increment	
club_name	varchar(100)	NO	UNI	NULL		
description	text	YES		NULL		
president_id	int(11)	YES	MUL	NULL		
category	enum('academic','sports','cultural')	NO		NULL		
club_adviser_id	int(11)	YES	MUL	NULL		
date_added	datetime(6)	NO		current_timestamp(6)		


127.0.0.1/db_imscca/attendance/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=attendance
Your SQL query has been executed successfully.

DESCRIBE attendance;

attendance_id	int(11)	NO	PRI	NULL		
user_id	int(11)	NO	MUL	NULL		
event_id	int(11)	NO	MUL	NULL		
scan_time	datetime(6)	NO		NULL		
date_added	datetime(6)	NO		NULL		


127.0.0.1/db_imscca/attendance_records/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=attendance_records
Your SQL query has been executed successfully.

Your SQL query has been executed successfully.

Your SQL query has been executed successfully.









DESCRIBE attendance_records;

attendance_id	int(11)	NO	PRI	NULL	auto_increment	
user_id	int(11)	NO	MUL	NULL		
requirement_id	int(11)	NO	MUL	NULL		
slot_id	int(11)	YES	MUL	NULL		
verified_by	int(11)	NO	MUL	NULL		
club_id	int(11)	NO	MUL	NULL		
scan_datetime	datetime	YES	MUL	current_timestamp()		
attendance_status	enum('present','late','excused')	YES	MUL	present		
notes	text	YES		NULL	

DESCRIBE attendance_time_slots;

slot_id	int(11)	NO	PRI	NULL	auto_increment	
requirement_id	int(11)	NO	MUL	NULL		
slot_name	varchar(100)	NO		NULL		
start_time	time	NO		NULL		
end_time	time	NO		NULL		
date	date	NO		NULL		
is_active	tinyint(1)	YES	MUL	1		
created_at	datetime	YES		current_timestamp()		
created_by	int(11)	YES	MUL	NULL		


DESCRIBE user_qr_codes;

qr_id	int(11)	NO	PRI	NULL	auto_increment	
user_id	int(11)	NO	MUL	NULL		
qr_code_data	varchar(255)	NO	UNI	NULL		
generated_at	datetime	YES		current_timestamp()		
is_active	tinyint(1)	YES		1		
club_id	int(11)	NO	MUL	NULL		

127.0.0.1/db_imscca/approval_requests/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=approval_requests
Your SQL query has been executed successfully.

DESCRIBE approval_requests;



request_id	int(11)	NO	PRI	NULL	auto_increment	
type	enum('user','requirement','club','transaction','attendance')	NO	MUL	NULL		
approval_type	enum('delete','attendance_edit')	YES	MUL	delete		
target_id	int(11)	NO		NULL		
club_id	int(11)	NO	MUL	NULL		
requested_by	int(11)	NO	MUL	NULL		
status	enum('pending','approved','denied')	YES	MUL	pending		
reason	varchar(255)	YES		NULL		
original_status	varchar(20)	YES		NULL		
requested_status	varchar(20)	YES		NULL		
attendance_record_id	int(11)	YES		NULL		
new_data	longtext	YES		NULL		
requested_at	datetime	YES		current_timestamp()		
approved_by	int(11)	YES	MUL	NULL		
approved_at	datetime	YES		NULL		
		

127.0.0.1/db_imscca/approval_requests/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=approval_requests
Your SQL query has been executed successfully.

	127.0.0.1/db_imscca/requirements/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=requirements
Your SQL query has been executed successfully.

DESCRIBE event_registrations;



registration_id	int(11)	NO	PRI	NULL	auto_increment	
requirement_id	int(11)	NO	MUL	NULL		
user_id	int(11)	NO	MUL	NULL		
status	enum('registered','unregistered')	YES	MUL	registered		
registered_by	int(11)	NO	MUL	NULL		
registered_at	timestamp	NO		current_timestamp()		


127.0.0.1/db_imscca/requirements/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=requirements
Your SQL query has been executed successfully.

127.0.0.1/db_imscca/automatic_absence_processing/		http://localhost/phpmyadmin/index.php?route=/table/sql&db=db_imscca&table=automatic_absence_processing
Your SQL query has been executed successfully.

DESCRIBE automatic_absence_processing;



processing_id	int(11)	NO	PRI	NULL	auto_increment	
requirement_id	int(11)	NO	UNI	NULL		
processed_at	timestamp	NO	MUL	current_timestamp()		
absences_created	int(11)	YES		0		
created_at	timestamp	NO		current_timestamp()		
	

