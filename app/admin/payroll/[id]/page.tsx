import PayrollDetailPage from '@/components/shell/pages/payroll-detail-page';

export default function AdminPayrollDetailPage(props: any) {
  return <PayrollDetailPage {...props} rolePrefix="/admin" />;
}
