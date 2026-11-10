import TasksListPage, { type TasksSearchParams } from '@/components/tasks/tasks-list-page';

export default function TeamTasksList({ searchParams }: { searchParams: TasksSearchParams }) {
  return <TasksListPage variant="team" searchParams={searchParams} />;
}
