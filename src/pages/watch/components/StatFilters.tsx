import { watchFilters } from "@/constants/watch.constant";
import type { ConversationDTO } from "@/services/api/dashboard/types";
import { countByFilter } from "../helper";
import styles from "../styles.module.less";
import type { WatchFilter } from "../types";

interface StatFiltersProps {
  items: ConversationDTO[];
  value: WatchFilter;
  onChange: (value: WatchFilter) => void;
}

/** Thẻ số liệu kiêm nút lọc: bấm vào số nào thì danh sách hiện đúng các hội thoại đó. */
export function StatFilters({ items, value, onChange }: StatFiltersProps) {
  return (
    <div className={styles["stats"]} role="group" aria-label="Lọc hội thoại">
      {watchFilters.map((filter) => {
        const { chats, messages } = countByFilter(items, filter.value);
        const isAttention = filter.value === "related" && chats > 0;
        return (
          <button
            key={filter.value}
            type="button"
            className={`${styles["stat"]} ${isAttention ? styles["stat-attention"] : ""}`}
            aria-pressed={value === filter.value}
            onClick={() => onChange(filter.value)}
          >
            <span className={styles["stat-value"]}>{chats}</span>
            <span className={styles["stat-label"]}>{filter.label}</span>
            <span className={styles["stat-sub"]}>
              {messages === null ? "hội thoại" : `${messages} tin trong 24 giờ`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
