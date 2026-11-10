import Impl from '@/components/shell/pages/reports-group-wise-page';

export const dynamic = 'force-dynamic';

export default async function Page(props: Parameters<typeof Impl>[0]) {
  return Impl(props, '/team');
}
