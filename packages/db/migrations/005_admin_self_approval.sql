-- Admins may self-approve in the current MVP; enforcement lives in the API.
alter table approval_queue drop constraint if exists chk_approval_no_self_approval;
