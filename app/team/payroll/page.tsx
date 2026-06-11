import PayrollPage from '@/components/shell/pages/payroll-page';

export default function TeamPayrollPage(props: any) {
  return <PayrollPage {...props} rolePrefix="/team" />;
}
