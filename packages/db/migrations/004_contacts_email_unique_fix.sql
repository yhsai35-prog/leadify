-- Allow multiple contacts per company without an email (bulk Apollo import
-- saves several POCs before emails are revealed). The original constraint used
-- NULLS NOT DISTINCT, which treated every NULL email as a duplicate.

-- 1. Remove duplicate POCs (same company + apollo_id), keep the richest row.
delete from contacts
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by company_id, apollo_id
        order by
          (email is not null) desc,
          (linkedin_url is not null) desc,
          (title is not null) desc,
          created_at asc
      ) as rn
    from contacts
    where apollo_id is not null
  ) ranked
  where rn > 1
);

-- 2. Remove duplicate emails per company (non-null only), keep the richest row.
delete from contacts
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by company_id, email
        order by
          (apollo_id is not null) desc,
          (linkedin_url is not null) desc,
          (title is not null) desc,
          created_at asc
      ) as rn
    from contacts
    where email is not null
  ) ranked
  where rn > 1
);

-- 3. Relax email uniqueness so multiple NULL emails are allowed per company.
alter table contacts drop constraint if exists uq_contacts_company_email;
alter table contacts
  add constraint uq_contacts_company_email unique (company_id, email);

-- 4. Prevent future duplicate Apollo POCs per company.
create unique index if not exists uq_contacts_company_apollo_id
  on contacts (company_id, apollo_id)
  where apollo_id is not null;
