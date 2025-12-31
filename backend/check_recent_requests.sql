
-- Check the most recent requests and their institution names
SELECT 
    r.email, 
    r.created_at, 
    r.institution_id, 
    i.name as institution_name
FROM student_access_requests r
LEFT JOIN institutions i ON r.institution_id = i.id
ORDER BY r.created_at DESC
LIMIT 5;
