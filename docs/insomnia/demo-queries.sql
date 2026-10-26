-- EZ Trader demo queries for MySQL Workbench.
-- Connect: 127.0.0.1:3306, user ez_trader / change_me, schema ez_trader.
-- Run one statement with Ctrl+Enter; re-run to watch values change.
USE ez_trader;

-- 1. Prices moving: current price drifts each tick; opening price is set at the first tick of
--    the day; daily high/low widen as prices move. Re-run every ~10 s while the market is open.
SELECT ticker, current_price, opening_price, daily_high, daily_low, updated_at
FROM Stocks
ORDER BY ticker;

-- 2. Generator appending history: grows by one row per stock per tick.
SELECT COUNT(*) AS price_history_rows FROM Price_History;

-- 3. The latest ticks.
SELECT s.ticker, p.price, p.recorded_at
FROM Price_History p
JOIN Stocks s USING (stock_id)
ORDER BY p.history_id DESC
LIMIT 12;

-- 4. Market cap is not a column; the API computes it. Same calculation here for comparison.
SELECT ticker, total_volume, current_price, total_volume * current_price AS market_cap
FROM Stocks
ORDER BY market_cap DESC;

-- 5. One trade touches four tables together (run after the demo1 buy/sell in Insomnia).
SELECT u.username, ca.balance
FROM Users u
JOIN Cash_Accounts ca USING (user_id)
WHERE u.username = 'demo1';

SELECT s.ticker, h.quantity, h.average_cost
FROM Holdings h
JOIN Stocks s USING (stock_id)
WHERE h.user_id = (SELECT user_id FROM Users WHERE username = 'demo1');

SELECT o.order_id, o.order_type, s.ticker, o.quantity, o.price, o.status, o.order_time, o.filled_time
FROM Orders o
JOIN Stocks s USING (stock_id)
WHERE o.user_id = (SELECT user_id FROM Users WHERE username = 'demo1')
ORDER BY o.order_id;

SELECT transaction_id, transaction_type, order_id, amount, transaction_time
FROM Transactions
WHERE user_id = (SELECT user_id FROM Users WHERE username = 'demo1')
ORDER BY transaction_id;

-- 6. Market schedule: one row per date; admin changes rewrite today onward.
SELECT trading_date, DAYNAME(trading_date) AS day, opening_time, closing_time, is_open, holiday_name
FROM Market_Schedule
WHERE trading_date BETWEEN CURDATE() - INTERVAL 1 DAY AND CURDATE() + INTERVAL 7 DAY
   OR holiday_name IS NOT NULL
ORDER BY trading_date;

-- 7. Passwords are stored only as bcrypt hashes and never returned by the API.
SELECT username, role, LEFT(password_hash, 20) AS hash_prefix
FROM Users;
