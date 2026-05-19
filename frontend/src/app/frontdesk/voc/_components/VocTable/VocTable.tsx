import React from 'react';
import styles from './VocTable.module.css';
import { VocItem } from '../../useVocList';

import { useTranslation } from '@/app/useTranslation';

interface VocTableProps {
  vocs: VocItem[];
  loading: boolean;
}

export default function VocTable({ vocs, loading }: VocTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className={styles.emptyState}>{t.common.loading}</div>;
  }

  if (vocs.length === 0) {
    return <div className={styles.emptyState}>{t.frontdeskPage.voc.empty}</div>;
  }

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.dateCol}>{t.frontdeskPage.voc.columns.date}</th>
            <th className={styles.roomCol}>{t.frontdeskPage.voc.columns.room}</th>
            <th className={styles.sentimentCol}>{t.frontdeskPage.voc.columns.sentiment}</th>
            <th className={styles.contentCol}>{t.frontdeskPage.voc.columns.content}</th>
            <th className={styles.replyCol}>{t.frontdeskPage.voc.columns.reply}</th>
          </tr>
        </thead>
        <tbody>
          {vocs.map((voc) => (
            <tr key={voc.id}>
              <td className={styles.centerAlign}>{formatDate(voc.createdAt)}</td>
              <td className={styles.centerAlign}>{voc.roomNo}</td>
              <td className={styles.centerAlign}>
                <span className={`${styles.badge} ${voc.sentiment === 'POSITIVE' ? styles.positive : styles.negative}`}>
                  {voc.sentiment === 'POSITIVE' ? t.frontdeskPage.voc.sentiments.positive : t.frontdeskPage.voc.sentiments.negative}
                </span>
              </td>
              <td>
                <div className={styles.contentBox}>{voc.content}</div>
              </td>
              <td>
                <div className={styles.replyBox}>{voc.aiReply}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
