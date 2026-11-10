import TasksListPage, { type TasksSearchParams } from '@/components/tasks/tasks-list-page';

export default function AdminTasksPage({ searchParams }: { searchParams: TasksSearchParams }) {
  return <TasksListPage variant="admin" searchParams={searchParams} />;
}
