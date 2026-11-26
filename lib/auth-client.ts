import { createAuthClient } from "better-auth/react";

import {
    adminClient,
    inferAdditionalFields,
} from "better-auth/client/plugins";

import type { auth } from "@/lib/auth";
import { ac, authRoles } from "@/lib/auth-access";

export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields<typeof auth>(),

        adminClient({
            ac,
            roles: authRoles,
        }),
    ],
});

export const {
    signIn,
    signOut,
    useSession,
} = authClient;