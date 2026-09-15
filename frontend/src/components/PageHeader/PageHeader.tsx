import styles from './PageHeader.module.scss';

interface PageHeaderProps {
  title: string;
  description: string;
}

function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export default PageHeader;
