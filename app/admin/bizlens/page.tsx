import BizlensPage from '@/components/shell/pages/bizlens-page';

export default function AdminBizlensPage(props: any) {
  return <BizlensPage {...props} rolePrefix="/admin" />;
}
