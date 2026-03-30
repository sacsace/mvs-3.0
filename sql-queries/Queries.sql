
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

UPDATE users SET role = 'root' WHERE userid = 'root';

select * from users

select * from companies;

select * from tenants;

select * from menus;

select * from user_permissions;