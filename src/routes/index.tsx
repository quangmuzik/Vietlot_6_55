import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Board } from "@/components/board";
import { loadDraws, refreshDraws } from "@/lib/draws.functions";
import type { DrawSnapshot } from "@/lib/vietlott";

export const Route = createFileRoute("/")({
  loader: () => loadDraws(),
  component: Home,
  pendingComponent: Pending,
});

function Pending() {
  return (
    <main className="desk flex min-h-screen items-center justify-center px-6 text-muted">
      Đang lấy kết quả Power 6/55…
    </main>
  );
}

function Home() {
  const initial = Route.useLoaderData();
  const refresh = useServerFn(refreshDraws);
  const [snapshot, setSnapshot] = useState<DrawSnapshot>(initial);
  const [seen, setSeen] = useState(initial.status.checkedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  if (seen !== initial.status.checkedAt) {
    setSeen(initial.status.checkedAt);
    setSnapshot(initial);
  }

  async function onRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      setSnapshot(await refresh());
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Không cập nhật được.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Board
      snapshot={snapshot}
      refreshing={refreshing}
      refreshError={refreshError}
      onRefresh={() => void onRefresh()}
    />
  );
}
