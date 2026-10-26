-- One-time setup for a native (non-Docker) MySQL 8 install. Run as root:
--   mysql -u root -p < server/scripts/create-db.sql
-- Credentials match .env.example; change both together if you change them.
CREATE DATABASE IF NOT EXISTS ez_trader CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS ez_trader_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'ez_trader'@'localhost' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON ez_trader.* TO 'ez_trader'@'localhost';
GRANT ALL PRIVILEGES ON ez_trader_test.* TO 'ez_trader'@'localhost';
FLUSH PRIVILEGES;
