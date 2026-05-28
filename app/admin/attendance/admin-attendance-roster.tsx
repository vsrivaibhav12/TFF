"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { overrideAttendanceAction, upsertAttendanceAction } from "@/lib/actions/attendance";
import { toast } from "sonner";
import { User, CalendarDays } from "lucide-react";

interface Props {
  date: string;
  teamUsers: any[];
  logs: Map<string, any>;
  currentUserId: string;
}

const statusLabels: Record<string, string> = {
  present: "Present",
  leave: "Leave",
  half_day: "Half day",
  permission: "Permission",
};

const statusBadge: Record<string, string> = {
  present: "bg-teal-50 text-teal-700 border-teal-200",
  leave: "bg-amber-50 text-amber-700 border-amber-200",
  half_day: "bg-blue-50 text-blue-700 border-blue-200",
  permission: "bg-purple-50 text-purple-700 border-purple-200",
};

/** Self-marking uses upsert (no reason). Override for others requires reason. */
export default function AdminAttendanceRoster({ date, teamUsers, logs, currentUserId }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(date);
  const [pending, startTransition] = useTransition();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("present");
  const [reason, setReason] = useState("");

  function openEdit(userId: string, log: any) {
    setEditingUserId(userId);
    setStatus(log?.status ?? "present");
    setReason(log?.override_reason ?? "");
  }

  function save(userId: string) {
    const isSelf = userId === currentUserId;
    if (!isSelf && !reason.trim()) {
      toast.error("Override reason is required");
      return;
    }
    startTransition(async () => {
      let r;
      if (isSelf) {
        r = await upsertAttendanceAction({
          attendance_date: selectedDate,
          status: status as any,
        });
      } else {
        r = await overrideAttendanceAction({
          user_id: userId,
          attendance_date: selectedDate,
          status: status as any,
          override_reason: reason.trim(),
        });
      }
      if (!r.success) { toast.error(r.error); return; }
      toast.success(isSelf ? "Attendance recorded" : "Attendance marked");
      setEditingUserId(null);
      setReason("");
      router.refresh();
    });
  }

  const isEditing = (userId: string) => editingUserId === userId;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-zinc-400" />
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            router.push(`/admin/attendance?date=${e.target.value}`);
          }}
          className="w-auto"
        />
        <span className="text-sm text-zinc-500">
          {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      <div className="tff-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 font-medium text-zinc-700">Staff member</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-700">Status</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-700">In</th>
              <th className="text-left px-4 py-3 font-medium text-zinc-700">Out</th>
              <th className="text-right px-4 py-3 font-medium text-zinc-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {teamUsers.map((u) => {
              const log = logs.get(u.id);
              const editing = isEditing(u.id);
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium text-zinc-900">{u.full_name ?? u.email}</span>
                      {isSelf && <Badge variant="outline" className="text-[10px] py-0">You</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editing ? (
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm"
                      >
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <Badge variant="outline" className={log ? statusBadge[log.status] : "bg-zinc-50 text-zinc-400 border-zinc-200"}>
                        {log ? statusLabels[log.status] ?? log.status : "Not marked"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 tabular-nums">
                    {log?.check_in_time ? new Date(log.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-600 tabular-nums">
                    {log?.check_out_time ? new Date(log.check_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing ? (
                      <div className="space-y-2 inline-block text-left">
                        {!isSelf && (
                          <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Override reason (required)"
                            className="h-8 text-xs w-56"
                          />
                        )}
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setEditingUserId(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => save(u.id)} disabled={pending}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => openEdit(u.id, log)}>
                        {log ? "Edit" : "Mark"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
