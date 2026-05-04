import Link from 'next/link';
import KnowledgePageContent from './_components/KnowledgePageContent';
import Button from '@/components/ui/Button/Button';
import styles from './page.module.css';

export default function RagAdminPage() {
  const domains = [
    { name: '하우스키핑', path: 'hk' },
    { name: 'F&B', path: 'fb' },
    { name: '시설', path: 'facility' },
    { name: '컨시어지', path: 'concierge' },
    { name: '프론트 데스크', path: 'front-desk' },
    { name: '긴급 대응', path: 'emergency' },
    { name: '공통 (호텔 전반)', path: 'common' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.buttonGroup}>
        {domains.map((d) => (
          <Link key={d.path} href={`/admin/rag/${d.path}`}>
            <Button variant="secondary">{d.name} 지식 관리</Button>
          </Link>
        ))}
      </div>
      <KnowledgePageContent title="전체 지식 라이브러리 (통합 뷰)" />
    </div>
  );
}
