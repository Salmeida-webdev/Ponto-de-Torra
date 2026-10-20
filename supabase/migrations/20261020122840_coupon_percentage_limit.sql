-- The storefront and panel support percentage coupons up to 90%.
-- NOT VALID keeps migration application safe if legacy rows need review, while
-- PostgreSQL enforces the constraint for every new or updated row.
alter table public.coupons
  add constraint coupons_discount_value_limit_check
  check (discount_value > 0 and (discount_type <> 'percent' or discount_value <= 90))
  not valid;
