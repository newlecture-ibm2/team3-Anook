import React from 'react';
import styles from './Table.module.css';

interface TableProps {
  columns: string; // e.g. "1fr 120px 120px 88px 88px"
  children: React.ReactNode;
}

export const Table = ({ columns, children }: TableProps) => {
  return (
    <div
      className={styles.tableContainer}
      style={{ '--table-columns': columns } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export const TableHeader = ({ children }: { children: React.ReactNode }) => {
  return <div className={styles.tableHeader}>{children}</div>;
};

export const TableRow = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={`${styles.tableRow} ${className || ''}`}>{children}</div>;
};

export const TableCell = ({
  children,
  header = false,
  className,
}: {
  children?: React.ReactNode;
  header?: boolean;
  className?: string;
}) => {
  return (
    <div className={`${header ? styles.headerItem : styles.rowItem} ${className || ''}`}>
      {children}
    </div>
  );
};
