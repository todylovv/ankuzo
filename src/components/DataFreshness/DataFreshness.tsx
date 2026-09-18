import { FiDatabase } from "react-icons/fi";
import type { DataSourceStatus } from "../../data/useLiveData";
import { cx } from "../../lib/cx";
import styles from "./DataFreshness.module.scss";

const stateLabel: Record<DataSourceStatus["state"], string> = {
  fresh: "актуально",
  stale: "давно не обновлялось",
  unavailable: "источник недоступен",
  unknown: "дата неизвестна",
};

function formatDate(value?: string) {
  if (!value) return "нет даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "нет даты";
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function DataFreshness({ sources }: { sources: DataSourceStatus[] }) {
  const attention = sources.filter((source) => source.state !== "fresh").length;

  return (
    <details className={styles.root}>
      <summary>
        <FiDatabase aria-hidden="true" />
        <span>{attention ? `Источники данных: ${attention} требуют внимания` : "Источники данных актуальны"}</span>
      </summary>
      <ul>
        {sources.map((source) => (
          <li key={source.id}>
            <span className={cx(styles.dot, styles[source.state])} aria-hidden="true" />
            <b>{source.label}</b>
            <span>{stateLabel[source.state]}</span>
            <time dateTime={source.updatedAt}>{formatDate(source.updatedAt)}</time>
          </li>
        ))}
      </ul>
    </details>
  );
}
