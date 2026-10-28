import { useMemo, useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import {
  SIZES,
  WINDOWS,
  agoLabel,
  ballLabel,
  factorLabel,
  formatDate,
  nextDrawDate,
  nextDrawId,
  oneInLabel,
  rankSets,
  weekday,
  type Combo,
  type SetSize,
  type WindowId,
} from "@/lib/lottery";
import { formatSyncTime, type DrawSnapshot } from "@/lib/vietlott";

const SIZE_COPY: Record<SetSize, { label: string; note: string }> = {
  2: {
    label: "Cặp 2",
    note: "Hai số cùng nằm trong 6 số chính. Mức ngẫu nhiên mỗi kỳ là 1 trên 99.",
  },
  3: {
    label: "Cặp 3",
    note: "Ba số cùng về. Mức ngẫu nhiên là 1 trên 1.312.",
  },
  4: {
    label: "Cặp 4",
    note: "Bốn số cùng về. Mức ngẫu nhiên là 1 trên 22.737.",
  },
  5: {
    label: "Cặp 5",
    note: "Năm số cùng về. Mức ngẫu nhiên là 1 trên 579.794.",
  },
  6: {
    label: "Cặp 6",
    note: "Đủ một vé 6 số. Mức ngẫu nhiên là 1 trên 28.989.675 — hệ số chỉ nói vé này nóng hơn vé bất kỳ.",
  },
};

function Ball({
  n,
  ghost = false,
  swap = false,
}: {
  n: number;
  ghost?: boolean;
  swap?: boolean;
}) {
  const tone = ghost
    ? "border-2 border-gold bg-transparent text-gold"
    : swap
      ? "border-2 border-gold bg-surface-2 text-fg"
      : "bg-gold text-ink";
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${tone}`}
    >
      {ballLabel(n)}
    </span>
  );
}

function copyText(combo: Combo): string {
  return combo.nums.map(ballLabel).join(" ");
}

export function Board({
  snapshot,
  refreshing,
  refreshError,
  onRefresh,
}: {
  snapshot: DrawSnapshot;
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
}) {
  const [windowId, setWindowId] = useState<WindowId>(80);
  const [size, setSize] = useState<SetSize>(2);
  const [copied, setCopied] = useState<string | null>(null);
  const draws = snapshot.draws;
  const latest = draws[0];
  const status = snapshot.status;
  const upcoming = latest ? nextDrawDate(latest.date) : "";
  const upcomingId = latest ? nextDrawId(latest.id) : "";

  const ranked = useMemo(() => rankSets(draws, windowId, size, 8), [draws, windowId, size]);
  const lead = ranked.combos[0];
  const leadSet = useMemo(() => new Set(lead?.nums ?? []), [lead]);
  const windowLabel = WINDOWS.find((item) => item.id === windowId)?.label ?? "";

  const core = useMemo(() => {
    const counts = new Map<number, number>();
    for (const combo of ranked.combos) {
      for (const n of combo.nums) counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    const need = Math.max(3, Math.ceil(ranked.combos.length * 0.6));
    return [...counts.entries()]
      .filter(([, count]) => count >= need)
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([n]) => n);
  }, [ranked]);

  async function copyValue(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  }

  async function copyBoard() {
    const lines = [
      `Power 6/55 · ${SIZE_COPY[size].label} · cửa sổ ${windowLabel}`,
      `Kỳ tới #${upcomingId} · ${weekday(upcoming)} ${formatDate(upcoming)}`,
      ...ranked.combos.map((combo, index) => `${index + 1}. ${copyText(combo)} · ${factorLabel(combo.factor)}`),
    ];
    await copyValue("board", lines.join("\n"));
  }

  return (
    <main className="desk min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-widest text-gold uppercase">Power 6/55</p>
          <h1 className="font-display text-4xl leading-tight text-fg sm:text-5xl">
            Cặp số dễ về kỳ tới
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted">
            Xếp hạng cặp 2, 3, 4, 5 và 6 số theo xác suất tương đối. Bộ nào các số hay đi cùng nhau
            trong các kỳ gần sẽ đứng trên — không phải bộ chỉ xuất hiện nhiều từ năm 2017.
          </p>
        </header>

        <section
          role="status"
          aria-live="polite"
          className={`rounded-2xl border p-4 ${
            !latest || !status.ok ? "border-hot bg-surface" : status.warning ? "border-gold bg-surface" : "border-line bg-surface"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {!latest || !status.ok ? (
                <>
                  <p className="text-sm font-semibold text-hot">Chưa cập nhật được kết quả mới</p>
                  <p className="mt-1 text-sm leading-relaxed text-fg">
                    {refreshError || status.error || "Không lấy được dữ liệu mới."} Đang hiển thị bản gần nhất
                    {latest ? (
                      <>
                        : kỳ #{latest.id} ngày {formatDate(latest.date)}
                      </>
                    ) : null}
                    {status.fetchedAt
                      ? ` — lần đồng bộ thành công gần nhất ${formatSyncTime(status.fetchedAt)}.`
                      : " — đây là bản lưu đi kèm ứng dụng, không phải lần kiểm tra vừa rồi."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-fg">
                    {status.added > 0
                      ? `Đã thêm ${status.added} kỳ mới và tính lại thống kê`
                      : "Đã kiểm tra nguồn — không có kỳ mới hơn"}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Lần kiểm tra {formatSyncTime(status.checkedAt)}. Nguồn: {status.sourceLabel}. Lịch sử{" "}
                    {status.drawCount} kỳ, mới nhất #{status.latestId} ngày {formatDate(status.latestDate)}.
                  </p>
                </>
              )}
              {refreshError ? <p className="mt-2 text-sm leading-relaxed text-hot">{refreshError}</p> : null}
              {status.ok && status.warning ? (
                <p className="mt-2 text-sm leading-relaxed text-gold">{status.warning}</p>
              ) : null}
              {!status.ok && status.warning ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">{status.warning}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 px-4 text-sm font-semibold text-fg disabled:opacity-60"
            >
              {refreshing ? "Đang lấy số mới…" : "Cập nhật kết quả"}
            </button>
          </div>
        </section>

        {latest ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm text-muted">Kỳ vừa quay</p>
              <h2 className="mt-1 text-xl font-semibold text-fg">
                #{latest.id} · {weekday(latest.date)} {formatDate(latest.date)}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {latest.nums.map((n) => (
                  <Ball key={n} n={n} />
                ))}
                {latest.bonus != null ? (
                  <>
                    <span className="mx-1 hidden h-8 w-px bg-line sm:block" aria-hidden="true" />
                    <span className="flex items-center gap-2">
                      <Ball n={latest.bonus} ghost />
                      <span className="text-xs text-muted">Đặc biệt</span>
                    </span>
                  </>
                ) : null}
              </div>
            </article>

            <article className="rounded-2xl border border-gold bg-surface p-5">
              <p className="text-sm text-gold">Kỳ tới · bộ mạnh nhất</p>
              <h2 className="mt-1 text-xl font-semibold text-fg">
                #{upcomingId} · {weekday(upcoming)} {formatDate(upcoming)}
              </h2>
              {lead ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lead.nums.map((n) => (
                      <Ball key={n} n={n} />
                    ))}
                  </div>
                  <p className="mt-4 font-display text-4xl text-gold">{factorLabel(lead.factor)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Nếu mẫu {windowLabel.toLowerCase()} tiếp tục, bộ này khoảng 1 trên {oneInLabel(lead.chance)}. Bộ
                    ngẫu nhiên cùng cỡ là 1 trên {oneInLabel(lead.baseline)}.
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-fg">
                    Thống kê lịch sử không bảo đảm dự đoán chính xác kỳ tiếp theo.
                  </p>
                </>
              ) : null}
            </article>
          </section>
        ) : null}

        {draws.length > 0 ? (
          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg">Lịch sử kỳ gần</h2>
              <p className="text-sm text-muted">{draws.length} kỳ</p>
            </div>
            <ol className="mt-3 divide-y divide-line">
              {draws.slice(0, 8).map((draw) => (
                <li key={draw.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                  <span className="text-sm text-muted">
                    #{draw.id} · {weekday(draw.date)} {formatDate(draw.date)}
                  </span>
                  <span className="font-semibold tabular-nums text-fg">
                    {draw.nums.map(ballLabel).join(" ")}
                    {draw.bonus != null ? <span className="text-gold"> · {ballLabel(draw.bonus)}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cỡ bộ số">
            {SIZES.map((value) => {
              const active = value === size;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSize(value)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                    active ? "border-gold bg-gold text-ink" : "border-line bg-surface text-fg"
                  }`}
                >
                  {SIZE_COPY[value].label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cửa sổ thống kê">
            {WINDOWS.map((item) => {
              const active = item.id === windowId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setWindowId(item.id)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
                    active ? "border-gold bg-surface-2 text-gold" : "border-line bg-surface text-muted"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="text-sm leading-relaxed text-muted">{SIZE_COPY[size].note}</p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-fg">Số đang nóng</h2>
            <p className="text-sm text-muted">{ranked.windowDraws} kỳ</p>
          </div>
          <ul className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-1">
            {ranked.hot.map((item) => (
              <li key={item.n} className="flex w-14 shrink-0 flex-col items-center gap-1">
                <Ball n={item.n} />
                <span className="text-xs font-semibold text-gold">{factorLabel(item.factor)}</span>
                <span className="text-xs text-muted">{item.hits} lần</span>
              </li>
            ))}
          </ul>
        </section>

        {core.length > 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            Các bộ hạng cao đang xoay quanh cụm{" "}
            <span className="font-semibold text-fg">{core.map(ballLabel).join(" · ")}</span>
            {size >= 4 ? ". Số có viền ở danh sách là số khác so với bộ hạng 1." : "."}
          </p>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-fg">Hạng {SIZE_COPY[size].label.toLowerCase()}</h2>
            <button
              type="button"
              onClick={() => void copyBoard()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-fg"
            >
              {copied === "board" ? <Check className="size-4 text-gold" /> : <Copy className="size-4" />}
              {copied === "board" ? "Đã chép" : "Chép top"}
            </button>
          </div>
          <p className="sr-only" aria-live="polite">
            {copied ? "Đã chép bộ số" : ""}
          </p>
          <ol className="flex flex-col gap-3">
            {ranked.combos.map((combo, index) => {
              const key = combo.nums.join("-");
              const width = lead ? Math.max(8, Math.round((combo.factor / lead.factor) * 100)) : 0;
              return (
                <li key={key} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-2xl text-gold">{String(index + 1).padStart(2, "0")}</p>
                    <p className="text-right">
                      <span className="block font-display text-3xl text-fg">{factorLabel(combo.factor)}</span>
                      <span className="text-xs text-muted">so với ngẫu nhiên</span>
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {combo.nums.map((n) => (
                      <Ball key={n} n={n} swap={index > 0 && size >= 4 && !leadSet.has(n)} />
                    ))}
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {combo.hitsWindow} lần trong {ranked.windowDraws} kỳ này · {combo.hitsAll} lần từ 2017 ·{" "}
                    {agoLabel(combo.lastAgo)}
                    {size > 2 ? ` · cặp yếu nhất ${factorLabel(combo.weakest)}` : ""}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-fg">
                    Ước lượng 1 trên {oneInLabel(combo.chance)}
                  </p>
                  {size > 2 ? (
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      Cặp ăn ý nhất: {ballLabel(combo.bestPair[0])}–{ballLabel(combo.bestPair[1])} (
                      {factorLabel(combo.bestPair[2])})
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copyValue(key, copyText(combo))}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-fg"
                  >
                    {copied === key ? <Check className="size-4 text-gold" /> : <Copy className="size-4" />}
                    {copied === key ? "Đã chép" : "Chép bộ số"}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-2xl border border-line bg-surface-2 p-5 text-sm leading-relaxed text-muted">
          <p className="flex items-start gap-2 text-fg">
            <Info className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
            Thống kê lịch sử không bảo đảm dự đoán chính xác kỳ tiếp theo. Máy quay không có trí nhớ — đây là xếp hạng
            mẫu đã xảy ra, không phải cam kết trúng.
          </p>
          <details className="mt-3">
            <summary className="cursor-pointer font-medium text-fg">Cách chấm điểm</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Chỉ tính 6 số chính. Số đặc biệt không đưa vào cặp.</li>
              <li>Kỳ gần trong cửa sổ được tính nặng hơn kỳ cũ. Chọn Tất cả thì mọi kỳ ngang nhau.</li>
              <li>
                Mỗi cặp được so với mức 1/99. Bộ lớn lấy trung bình các cặp bên trong và bị kéo xuống nếu có một cặp
                yếu.
              </li>
              <li>Bộ 4 số trở lên vừa nổ ở kỳ mới nhất bị giảm điểm, vì rất hiếm lặp lại ngay.</li>
              <li>
                Hệ số 3× nghĩa là bộ đó đang nóng gấp khoảng 3 lần một bộ cùng cỡ chọn hú họa — nếu mẫu gần đây còn đúng.
              </li>
            </ul>
          </details>
          <p className="mt-3">
            {draws.length > 0 && latest ? (
              <>
                {draws.length} kỳ, từ {formatDate(draws[draws.length - 1].date)} đến {formatDate(latest.date)}.{" "}
              </>
            ) : null}
            Kết quả được kéo lại mỗi lần mở trang từ kho{" "}
            <a
              className="text-gold underline underline-offset-4"
              href="https://github.com/vietvudanh/vietlott-data"
              target="_blank"
              rel="noreferrer"
            >
              vietlott-data
            </a>{" "}
            (cào hàng ngày từ vietlott.vn), kỳ mới nhất đối chiếu thêm{" "}
            <a
              className="text-gold underline underline-offset-4"
              href="https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/power-6x55.html"
              target="_blank"
              rel="noreferrer"
            >
              Minh Ngọc
            </a>
            , và trang{" "}
            <a
              className="text-gold underline underline-offset-4"
              href="https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/655"
              target="_blank"
              rel="noreferrer"
            >
              vietlott.vn
            </a>{" "}
            khi trang này cho phép máy chủ đọc. Không có số nào được tự tạo.
          </p>
        </section>
      </div>
    </main>
  );
}
