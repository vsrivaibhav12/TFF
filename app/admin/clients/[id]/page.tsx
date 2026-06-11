import ClientDetailPage from '@/components/shell/pages/client-detail-page';

export default function AdminClientDetailPage(props: any) {
  return <ClientDetailPage {...props} rolePrefix="/admin" />;
}
