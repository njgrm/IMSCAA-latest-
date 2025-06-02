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

DESCRIBE deletion_requests;

request_id	int(11)	NO	PRI	NULL	auto_increment	
type	enum('user','requirement','club','transaction')	NO	MUL	NULL		
target_id	int(11)	NO		NULL		
club_id	int(11)	NO	MUL	NULL		
requested_by	int(11)	NO	MUL	NULL		
status	enum('pending','approved','denied')	YES	MUL	pending		
reason	varchar(255)	YES		NULL		
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

