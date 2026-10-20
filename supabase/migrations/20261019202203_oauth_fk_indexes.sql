create index if not exists melhor_envio_oauth_states_initiated_by_idx
  on private.melhor_envio_oauth_states(initiated_by);
create index if not exists melhor_envio_oauth_credentials_authorized_by_idx
  on private.melhor_envio_oauth_credentials(authorized_by)
  where authorized_by is not null;
