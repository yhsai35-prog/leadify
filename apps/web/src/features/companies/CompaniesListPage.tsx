import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCompanies } from "./useCompanies";

export function CompaniesListPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const params = new URLSearchParams();
  if (search) params.set("search", search);

  const { data, isLoading } = useCompanies(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">Every company your organization has discovered or served, in one place.</p>
      </div>
      <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((company) => (
              <TableRow key={company.id} className="cursor-pointer" onClick={() => navigate(`/companies/${company.id}`)}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.industry ?? "—"}</TableCell>
                <TableCell>{company.employeeCount ?? "—"}</TableCell>
                <TableCell>
                  {company.isExistingClient ? <Badge variant="success">Existing Client</Badge> : <Badge variant="outline">Prospect</Badge>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
