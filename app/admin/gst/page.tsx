import GstPage from '@/components/shell/pages/gst-page';

export default function AdminGstPage(props: any) {
  return <GstPage {...props} rolePrefix="/admin" />;
}
