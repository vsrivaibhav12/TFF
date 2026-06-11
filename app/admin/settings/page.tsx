import SettingsPage from '@/components/shell/pages/settings-page';

export default function AdminSettingsPage(props: any) {
  return <SettingsPage {...props} rolePrefix="/admin" />;
}
