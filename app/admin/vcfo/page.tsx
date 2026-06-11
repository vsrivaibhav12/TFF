import VcfoPage from '@/components/shell/pages/vcfo-page';

export default function AdminVcfoPage(props: any) {
  return <VcfoPage {...props} rolePrefix="/admin" />;
}
