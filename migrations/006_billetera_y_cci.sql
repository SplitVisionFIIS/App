-- SplitVision esquema v6: billetera preferida y CCI
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_wallet varchar(20) DEFAULT 'YAPE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS cci varchar(30);
