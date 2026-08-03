-- ============================================================================
-- Optional demo data for local development / presentation walkthroughs.
-- Password for the demo user is: Password123!
-- (hash below is a bcrypt hash generated at cost factor 10)
-- ============================================================================
USE student_budget_planner;

INSERT INTO users (name, email, password_hash)
VALUES ('Demo Student', 'demo@student.edu', '$2b$10$Kc9m9m3s2m1J2f3wZ0j8H.z0m1e1cGZ3nQeQeQe1QeQeQeQeQeQeq')
ON DUPLICATE KEY UPDATE name = name;

SET @uid = (SELECT id FROM users WHERE email = 'demo@student.edu');

INSERT INTO budgets (user_id, monthly_limit, month, year)
VALUES (@uid, 500.00, MONTH(CURDATE()), YEAR(CURDATE()))
ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit);

INSERT INTO income (user_id, amount, source, date) VALUES
  (@uid, 600.00, 'Part-time job', CURDATE()),
  (@uid, 150.00, 'Parental allowance', CURDATE());

INSERT INTO expenses (user_id, category_id, amount, description, date)
SELECT @uid, c.id, v.amount, v.description, CURDATE()
FROM (
  SELECT 'Food' AS category, 45.50 AS amount, 'Groceries' AS description
  UNION ALL SELECT 'Transport', 20.00, 'Bus pass top-up'
  UNION ALL SELECT 'Entertainment', 15.00, 'Cinema'
) AS v
JOIN categories c ON c.name = v.category;
