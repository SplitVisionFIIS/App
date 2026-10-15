-- SplitVision esquema v2: invitaciones a eventos
CREATE TABLE event_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status varchar(10) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT event_invitations_status_check CHECK (status IN ('PENDIENTE','ACEPTADA','RECHAZADA')),
  CONSTRAINT event_invitations_no_self CHECK (inviter_id <> invitee_id)
);
CREATE UNIQUE INDEX event_invitations_unique ON event_invitations (event_id, invitee_id);
CREATE INDEX event_invitations_invitee_idx ON event_invitations (invitee_id, status);
CREATE INDEX event_invitations_event_idx ON event_invitations (event_id);