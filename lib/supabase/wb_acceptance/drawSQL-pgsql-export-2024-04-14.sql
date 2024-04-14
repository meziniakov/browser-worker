CREATE TABLE "requests"(
    "id" UUID NOT NULL,
    "message_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(0) WITH
        TIME zone NOT NULL,
        "is_active" BOOLEAN NOT NULL,
        "wh_id" BIGINT NOT NULL,
        "delivery_date" DATE NOT NULL,
        "delivery_type" TEXT NOT NULL,
        "req_user_id" BIGINT NOT NULL
);
ALTER TABLE
    "requests" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "requests"."wh_id" IS 'id склада (цифра, int)';
COMMENT
ON COLUMN
    "requests"."delivery_date" IS 'дата поставки (в формате ''2024-03-30'')';
COMMENT
ON COLUMN
    "requests"."delivery_type" IS 'тип поставки (возможные значения: mono_pallet, koroba, super_safe)';
CREATE TABLE "users"(
    "user_id" BIGINT NOT NULL,
    "username" TEXT NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(0) WITH
        TIME zone NOT NULL,
        "first_name" TEXT NOT NULL,
        "last_name" TEXT NOT NULL
);
ALTER TABLE
    "users" ADD PRIMARY KEY("user_id");
ALTER TABLE
    "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
ALTER TABLE
    "requests" ADD CONSTRAINT "requests_req_user_id_foreign" FOREIGN KEY("req_user_id") REFERENCES "users"("user_id");