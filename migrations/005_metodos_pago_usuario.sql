-- SplitVision esquema v5: métodos de cobro personales (Yape, Plin, Banco, QR)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name varchar(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number varchar(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS qr_image_path text;
