'use client';

import KnowledgePageContent from './_components/KnowledgePageContent';
import styles from './page.module.css';
import { useTranslation } from '@/app/useTranslation';

export default function RagAdminPage() {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <KnowledgePageContent title={t.adminPage.taskBoard.titles.rag} />
    </div>
  );
}
