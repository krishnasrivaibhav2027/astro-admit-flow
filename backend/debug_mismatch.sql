
-- Run this to see why you can't see the requests
SELECT 
    r.email as student_email, 
    r.created_at,
    r.institution_id as request_inst_id, 
    i1.name as request_inst_name,
    'VS' as compare,
    a.institution_id as YOUR_ADMIN_INST_ID,
    i2.name as YOUR_ADMIN_INST_NAME
FROM student_access_requests r
CROSS JOIN admins a
LEFT JOIN institutions i1 ON i1.id = r.institution_id
LEFT JOIN institutions i2 ON i2.id = a.institution_id
WHERE a.email = 'vausdevguptha@gmail.com' -- Your email
ORDER BY r.created_at DESC
LIMIT 5;
