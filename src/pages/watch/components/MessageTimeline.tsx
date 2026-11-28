import { useState } from "react";
import { BellFilled, CheckOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { historyPageSize, relevanceLabels } from "@/constants/watch.constant";
import type { HistoryEntry, MessageEntry } from "@/services/api/dashboard/types";
import { formatDateTime, formatTime } from "@/utilities/date";
import { getSender, groupByDay } from "../helper";
import styles from "../styles.module.less";

interface MessageTimelineProps {
  history: HistoryEntry[];
  /** Tên hiển thị cho người kia trong chat riêng. */
  chatName: string;
}

function Message({ entry, chatName }: { entry: MessageEntry; chatName: string }) {
  const isMine = entry.from === "me";
  const rel = isMine || entry.rel === "no" ? undefined : entry.rel;
  const tone = isMine ? styles["message-mine"] : rel === "yes" ? styles["message-attention"] : "";

  return (
    <div className={`${styles["message"]} ${tone}`}>
      <div className={styles["message-head"]}>
        <strong>{getSender(entry.from, chatName)}</strong>
        <time className={styles["when"]} dateTime={entry.at} title={formatDateTime(entry.at)}>
          {formatTime(entry.at)}
          {!entry.id && " (giờ quét)"}
        </time>
        {rel && (
          <span className={`${styles["chip"]} ${rel === "yes" ? styles["chip-attention"] : ""}`}>
            {rel === "yes" && <BellFilled aria-hidden />} {relevanceLabels[rel]}
          </span>
        )}
      </div>
      <div className={styles["text"]}>
        {entry.text}
        {entry.truncated && <span className={styles["muted"]}> (bị rút gọn)</span>}
      </div>
    </div>
  );
}

function Entry({ entry, chatName }: { entry: HistoryEntry; chatName: string }) {
  if (entry.type === "read") {
    return (
      <div className={styles["read"]}>
        <CheckOutlined aria-hidden /> Bạn đã đọc lúc {formatTime(entry.at)}
        {entry.waitedMin != null && `, sau ${entry.waitedMin} phút`}
      </div>
    );
  }
  if (entry.type === "gap") {
    return (
      <div className={styles["gap"]}>
        <WarningOutlined aria-hidden />
        <span>
          <strong>Có thể thiếu tin.</strong> Chưa tải được tin{" "}
          {entry.since ? `từ ${formatDateTime(entry.since)} ` : ""}đến {formatDateTime(entry.to)}, hãy mở Zalo để xem.
        </span>
      </div>
    );
  }
  return <Message entry={entry} chatName={chatName} />;
}

export function MessageTimeline({ history, chatName }: MessageTimelineProps) {
  const [limit, setLimit] = useState(historyPageSize);

  return (
    <>
      {groupByDay(history.slice(0, limit)).map(({ day, entries }) => (
        <section key={day}>
          <h4 className={styles["day"]}>{day}</h4>
          <ol className={styles["entries"]}>
            {entries.map((entry, index) => (
              <li key={entry.type === "msg" && entry.id ? entry.id : `${entry.type}-${entry.at}-${index}`}>
                <Entry entry={entry} chatName={chatName} />
              </li>
            ))}
          </ol>
        </section>
      ))}
      {history.length > limit && (
        <Button block onClick={() => setLimit(limit + historyPageSize)}>
          Xem thêm ({history.length - limit} mục cũ hơn)
        </Button>
      )}
    </>
  );
}
