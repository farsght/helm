-- Add compound unique constraint on (user_id, name) for tags so that the same
-- tag name can exist for different users without colliding. The previous
-- userId column addition (0002) did not include this constraint.
CREATE UNIQUE INDEX IF NOT EXISTS "tags_user_id_name_unique" ON "tags" USING btree ("user_id", "name");
