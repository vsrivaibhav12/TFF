import TdsPage from '@/components/shell/pages/tds-page';

export default function AdminTdsPage(props: any) {
  return <TdsPage {...props} rolePrefix="/admin" />;
}
