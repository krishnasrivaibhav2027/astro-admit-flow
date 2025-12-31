
SELECT 
    r.email, 
    i.name as assigned_institution_name, 
    r.institution_id,
    r.created_at
FROM student_access_requests r
LEFT JOIN institutions i ON r.institution_id = i.id
WHERE r.email = 'arunodayshine@gmail.com';
