import VcfoClientPage from '@/components/shell/pages/vcfo-client-page';

export default function AdminVcfoClientPage(props: any) {
  return <VcfoClientPage {...props} rolePrefix="/admin" />;
}
