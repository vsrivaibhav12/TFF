import ReportsPage from '@/components/shell/pages/reports-page';

export default function AdminReportsPage(props: any) {
  return <ReportsPage {...props} rolePrefix="/admin" />;
}
