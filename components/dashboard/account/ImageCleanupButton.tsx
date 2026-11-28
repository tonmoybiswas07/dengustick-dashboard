"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImageCleanupButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  async function cleanup() {
    setRunning(true);
    setMessage("");
    try {
      const response = await fetch("/api/inspection-images/cleanup", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Cleanup failed");
      const result: { attempted: number; removed: number } =
        await response.json();
      setMessage(
        result.attempted === 0
          ? "No expired uploads were found."
          : `Removed ${result.removed} of ${result.attempted} expired uploads in this batch.`,
      );
    } catch {
      setMessage("Image cleanup could not finish. Try again later.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <Button variant="outline" disabled={running} onClick={cleanup}>
        {running ? "Cleaning…" : "Clean up expired uploads"}
      </Button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
