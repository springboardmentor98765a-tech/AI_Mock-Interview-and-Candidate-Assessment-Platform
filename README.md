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