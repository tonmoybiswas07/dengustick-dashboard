import { createAccessControl } from "better-auth/plugins/access";

import {
  defaultStatements,
  adminAc,
  userAc,
} from "better-auth/plugins/admin/access";

export const ac = createAccessControl({
  ...defaultStatements,
});

export const authRoles = {
  admin: ac.newRole({
    ...adminAc.statements,
  }),

  health_authority: ac.newRole({
    ...userAc.statements,
  }),

  supervisor: ac.newRole({
    ...userAc.statements,
  }),

  field_worker: ac.newRole({
    ...userAc.statements,
  }),

  researcher: ac.newRole({
    ...userAc.statements,
  }),
};