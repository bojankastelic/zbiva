
-- Run all the sql in teh postdeployment folder
\i '/home/zbiva/Projects/zbiva/db/install/postdeployment/zbiva.sql'

-- Spring cleaning
VACUUM ANALYZE;
