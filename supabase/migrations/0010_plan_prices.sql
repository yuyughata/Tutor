-- 0010: new plan prices (kobo): Premium Monthly N3,000, Premium Quarterly N7,500 (was N5,000 and N12,000).
-- The quarterly saving versus three monthly payments is 17%. The amounts on the Paystack plans must be changed to match.
update plans set price_minor = 300000 where id = 'monthly';
update plans set price_minor = 750000, tagline = 'Best value: save 17%' where id = 'quarterly';
update plans set features = '["Everything in Monthly", "Three months for the price of 2.5", "Cancel any time"]'::jsonb where id = 'quarterly';
