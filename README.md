postgreesql
curl -s localhost:8000/api/health
or 

Divyeshs-MacBook-Air:infosys divyeshkumarpamarthy$ /Library/PostgreSQL/18/bin/psql -h localhost -p 1234 -U postgres -d smarthire   -c "select id,name,email,role,provider,created_at from users;"
Password for user postgres: 
 id |   name    |     email     |   role    | provider |            created_at            
----+-----------+---------------+-----------+----------+----------------------------------
  3 | Div Kumar | div@gmail.com | CANDIDATE | LOCAL    | 2026-08-02 11:24:25.816602+05:30
(1 row)

jwt
curl -s -X POST localhost:8000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"div@gmail.com","password":"Password@123"}'
  pasete access_token in jwt.io

  oauth
  curl -si localhost:8000/api/auth/google/login | head -1
  output 00/api/auth/google/login | head -1
HTTP/1.1 302 Found


Role	        Email	                    Password
Candidate	candidate.demo@smarthire.dev	Candidate@123
Recruiter	recruiter.demo@smarthire.dev	Recruiter@123
Admin	    admin.demo@smarthire.dev	    Admin@123


Method	Path	Role	Returns
GET	/api/analytics/admin	ADMIN	User/interview/question/résumé/ticket counts + 14-day series
GET	/api/analytics/candidate	CANDIDATE	Own interview counts, questions answered, résumé facts
GET	/api/analytics/recruiter	RECRUITER, ADMIN	Candidate/interview counts, top technologies
GET	/api/analytics/recruiter/candidates	RECRUITER, ADMIN	Real candidate list — no score, no rank
GET	/api/analytics/live	RECRUITER, ADMIN	status = IN_PROGRESS, real answered/total progress
GET	/api/metrics	ADMIN	Measured request counts, latency, p95/p99, per-endpoint
GET/PUT	/api/settings	ADMIN	Persisted platform settings
GET	/api/settings/public	public	open_signup / maintenance only
POST/GET	/api/tickets	authed	Create / list (admin sees all, others own only)
GET	/api/tickets/reasons	public	Allowed reasons
PUT	/api/tickets/{id}/status	ADMIN	Resolve / dismiss
GET	/api/users/directory	authed	id + name only, for picking who to report
PUT	/api/users/{id}/block	ADMIN	Block / unblock