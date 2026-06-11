import PayrollPage from '@/components/shell/pages/payroll-page';

export default function AdminPayrollPage(props: any) {
  return <PayrollPage {...props} rolePrefix="/admin" />;
}
