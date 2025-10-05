SELECT id, parent_id, name_ko, level FROM menus WHERE parent_id IS NOT NULL ORDER BY parent_id, "order";
