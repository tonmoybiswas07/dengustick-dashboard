import "server-only";

import type { Binary } from "mongodb";
import { db } from "@/lib/db";

export const profileAvatars = db.collection<{ _id: string; image: Binary }>("profile_avatars");
