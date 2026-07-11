import { Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/features/users/useUsers";

const ALL_USERS_VALUE = "__all__";

export function UserSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (userId: string | undefined) => void;
}) {
  const { data: users, isLoading } = useUsers();

  return (
    <Select
      value={value ?? ALL_USERS_VALUE}
      onValueChange={(next) => onChange(next === ALL_USERS_VALUE ? undefined : next)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-[220px] gap-2">
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="All users" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_USERS_VALUE}>All users</SelectItem>
        {users?.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
