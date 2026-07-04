import {
  Calendar,
  Users,
  Briefcase,
  ArrowRight,
  Plus,
  ClipboardList,
  Zap,
  BellRing,
  Inbox,
  UserCircle,
  Building2,
  BarChart3,
} from 'lucide-react';

export interface SmartSuggestion {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

export function parseNaturalLanguage(
  query: string,
  basePath: string,
  role: 'admin' | 'team' | 'client',
): SmartSuggestion | null {
  const q = query.toLowerCase().trim();

  const dueMatch = q.match(/(?:tasks?|work)\s+(?:due|for|by)\s+(tomorrow|today|this week|next week|overdue)/);
  if (dueMatch) {
    const when = dueMatch[1];
    let dateParam = '';
    const today = new Date().toISOString().slice(0, 10);
    if (when === 'tomorrow') {
      const tmr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      dateParam = `?due_from=${today}&due_to=${tmr}`;
    } else if (when === 'today') {
      dateParam = `?due_from=${today}&due_to=${today}`;
    } else if (when === 'this week') {
      const endOfWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      dateParam = `?due_from=${today}&due_to=${endOfWeek}`;
    } else if (when === 'overdue') {
      dateParam = '?overdue=true';
    }
    return {
      label: `Tasks due ${when}`,
      href: `${basePath}/tasks${dateParam}`,
      icon: Calendar,
      description: `Show all tasks due ${when}`,
    };
  }

  const clientMatch = q.match(/(?:find|search|look up|show)\s+(?:client|customer)\s+(.+)/);
  if (clientMatch) {
    const name = clientMatch[1].trim();
    return {
      label: `Search clients for "${name}"`,
      href: `${basePath}/clients?q=${encodeURIComponent(name)}`,
      icon: Users,
      description: `Filter clients by "${name}"`,
    };
  }

  const taskMatch = q.match(/(?:find|search|look up|show)\s+(?:task|work)\s+(.+)/);
  if (taskMatch) {
    const name = taskMatch[1].trim();
    return {
      label: `Search tasks for "${name}"`,
      href: `${basePath}/tasks?q=${encodeURIComponent(name)}`,
      icon: Briefcase,
      description: `Filter tasks by "${name}"`,
    };
  }

  const goMatch = q.match(/(?:go to|open|navigate to|show me)\s+(.+)/);
  if (goMatch) {
    const page = goMatch[1].trim();
    const pageMap: Record<string, string> = {
      dashboard: `/${role}`,
      home: `/${role}`,
      inbox: `${basePath}/inbox`,
      clients: `${basePath}/clients`,
      tasks: `${basePath}/tasks`,
      queries: `${basePath}/queries`,
      notices: `${basePath}/notices`,
      hearings: `${basePath}/hearings`,
      gst: `${basePath}/gst`,
      payroll: `${basePath}/payroll`,
      billing: `${basePath}/billing`,
      bizlens: `${basePath}/bizlens`,
      vcfo: `${basePath}/vcfo`,
      attendance: `${basePath}/attendance`,
      leave: `${basePath}/leave`,
      approvals: `${basePath}/approvals`,
      credentials: `${basePath}/credentials`,
      settings: `${basePath}/settings`,
      reports: `${basePath}/reports`,
      audit: `${basePath}/audit`,
    };
    if (role === 'admin') {
      pageMap.team = `${basePath}/team`;
      pageMap.compliance = `${basePath}/compliance`;
      pageMap.calendar = `${basePath}/compliance`;
    }
    if (role === 'client') {
      pageMap.compliance = '/portal/calendar';
      pageMap.calendar = '/portal/calendar';
    }
    for (const [key, href] of Object.entries(pageMap)) {
      if (page.includes(key)) {
        return {
          label: `Go to ${key}`,
          href,
          icon: ArrowRight,
          description: `Navigate to ${key} page`,
        };
      }
    }
  }

  const newTaskMatch = q.match(/(?:new|create|add)\s+(?:task|work)\s+(?:for\s+)?(.+)?/);
  if (newTaskMatch && (q.includes('new task') || q.includes('create task') || q.includes('add task'))) {
    const clientHint = newTaskMatch[1]?.trim();
    return {
      label: clientHint ? `Create task for ${clientHint}` : 'Create new task',
      href: clientHint
        ? `${basePath}/tasks/bulk-create?client_hint=${encodeURIComponent(clientHint)}`
        : `${basePath}/tasks/bulk-create`,
      icon: Plus,
      description: clientHint ? `Start creating a task for ${clientHint}` : 'Open task creation form',
    };
  }

  const newClientMatch = q.match(/(?:new|create|add)\s+(?:client|customer)\s*(.+)?/);
  if (newClientMatch && (q.includes('new client') || q.includes('create client') || q.includes('add client'))) {
    const nameHint = newClientMatch[1]?.trim();
    return {
      label: nameHint ? `Add client "${nameHint}"` : 'Add new client',
      href: `${basePath}/clients`,
      icon: Plus,
      description: 'Open client creation form',
    };
  }

  if (q.includes('attendance') || q.includes('punch in') || q.includes('check in')) {
    return {
      label: 'Mark attendance',
      href: `${basePath}/attendance`,
      icon: ClipboardList,
      description: 'Open attendance page',
    };
  }

  if (q.includes('high priority') || q.includes('urgent') || q.includes('critical')) {
    return {
      label: 'High priority tasks',
      href: `${basePath}/tasks?priority=high`,
      icon: Zap,
      description: 'Show all high priority tasks',
    };
  }

  if (q.includes('stuck') || q.includes('blocked')) {
    return {
      label: 'Blocked tasks',
      href: `${basePath}/tasks?blocked=true`,
      icon: BellRing,
      description: 'Show tasks blocked on client or stuck',
    };
  }

  if (q.includes('my tasks') || q.includes('assigned to me') || q.match(/tasks?\s+(?:for|by)\s+me/)) {
    return {
      label: 'My tasks',
      href: `${basePath}/tasks?assigned=me`,
      icon: Briefcase,
      description: 'Show tasks assigned to you',
    };
  }

  if (q.includes('my inbox') || q.includes('inbox')) {
    return {
      label: 'Go to inbox',
      href: `${basePath}/inbox`,
      icon: Inbox,
      description: 'Open your unified inbox',
    };
  }

  if (q.includes('notice') || q.includes('gstr') || q.includes('show cause')) {
    if (q.includes('overdue')) {
      return {
        label: 'Overdue notices',
        href: `${basePath}/notices?status=overdue`,
        icon: BellRing,
        description: 'Show overdue notices',
      };
    }
    return {
      label: 'Go to notices',
      href: `${basePath}/notices`,
      icon: BellRing,
      description: 'Open notices page',
    };
  }

  const assignedMatch = q.match(/(?:tasks?|work)\s+(?:for|assigned to|by)\s+(.+)/);
  if (assignedMatch && !q.includes('for me')) {
    const person = assignedMatch[1].trim();
    return {
      label: `Tasks for ${person}`,
      href: `${basePath}/tasks?q=${encodeURIComponent(person)}`,
      icon: UserCircle,
      description: `Search tasks related to ${person}`,
    };
  }

  const clientTaskMatch = q.match(/^(.+?)\s+(?:tasks?|work)/);
  if (clientTaskMatch) {
    const clientName = clientTaskMatch[1].trim();
    return {
      label: `Tasks for ${clientName}`,
      href: `${basePath}/tasks?q=${encodeURIComponent(clientName)}`,
      icon: Building2,
      description: `Search tasks for ${clientName}`,
    };
  }

  const monthMatch = q.match(/(?:compliance|tasks?|filings?)\s+(?:this month|due this month)/);
  if (monthMatch && role === 'admin') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    return {
      label: 'Compliance this month',
      href: `${basePath}/compliance?from=${start}&to=${end}`,
      icon: Calendar,
      description: 'Show compliance events this month',
    };
  }

  if (q.includes('bizlens') || q.includes('financial report')) {
    const bizMatch = q.match(/(?:bizlens|financial report)\s+(?:for\s+)?(.+)?/);
    const clientHint = bizMatch?.[1]?.trim();
    return {
      label: clientHint ? `BizLens for ${clientHint}` : 'Open BizLens',
      href: clientHint ? `${basePath}/bizlens?q=${encodeURIComponent(clientHint)}` : `${basePath}/bizlens`,
      icon: BarChart3,
      description: clientHint ? `Run BizLens for ${clientHint}` : 'Open BizLens dashboard',
    };
  }

  return null;
}

export const examplePrompts = [
  'Tasks due this week',
  'High priority tasks',
  'Go to clients',
  'Create task for Acme',
  'BizLens for Sri Engineering',
  'Compliance this month',
  'Overdue notices',
];
