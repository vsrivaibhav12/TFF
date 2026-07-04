import ItPage from '@/components/shell/pages/it-page';

export default function AdminItPage(props: any) {
  return <ItPage {...props} rolePrefix="/admin" />;
}
