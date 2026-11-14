import { AdminFilterSelect, AdminQueryForm } from "@/components/admin/AdminQueryForm";
import { AdminTablePagination } from "@/components/admin/AdminTablePagination";
import { EmptyState, StatusBadge } from "@/components/ui/admin-data";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { escapeRegex, pageFilters, pageSize, queryPage, queryString, type AdminSearchParams } from "@/lib/admin-query";
import { ProducerProfileModel } from "@/server/db/models/ProducerProfile";
import clientPromise from "@/server/db/mongodb";

export const dynamic = "force-dynamic";
const roles = ["buyer", "producer", "admin"] as const;

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: Date | string;
};

function mapUser(document: Record<string, unknown>): UserRecord {
  const id =
    typeof document.id === "string"
      ? document.id
      : document._id && typeof document._id === "object" && "toString" in document._id
        ? String(document._id)
        : "";
  return {
    id,
    name: typeof document.name === "string" ? document.name : "Name not provided",
    email: typeof document.email === "string" ? document.email : "Email not provided",
    role: typeof document.role === "string" ? document.role : "buyer",
    createdAt:
      document.createdAt instanceof Date || typeof document.createdAt === "string"
        ? document.createdAt
        : undefined,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const search = queryString(params, "q", 100);
  const requestedRole = queryString(params, "role", 16);
  const role = roles.includes(requestedRole as (typeof roles)[number]) ? requestedRole : "all";
  const requestedSort = queryString(params, "sort", 16);
  const sort = requestedSort === "oldest" ? "oldest" : "newest";
  const page = queryPage(params);
  const limit = pageSize();

  const client = await clientPromise;
  const usersCollection = client.db().collection("user");
  const userFilter: Record<string, unknown> = {};
  if (role !== "all") userFilter.role = role;
  if (search) {
    const literal = new RegExp(escapeRegex(search), "i");
    userFilter.$or = [{ name: literal }, { email: literal }];
  }
  const [userDocuments, total] = await Promise.all([
    usersCollection
      .find(userFilter, { projection: { id: 1, name: 1, email: 1, role: 1, createdAt: 1 } })
      .sort(sort === "oldest" ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    usersCollection.countDocuments(userFilter),
  ]);
  const users = userDocuments.map((document) => mapUser(document));
  const userIds = users.map((user) => user.id).filter(Boolean);
  const producerFilter: Record<string, unknown> = { userId: { $in: userIds } };
  const profiles = userIds.length
    ? await ProducerProfileModel.find(producerFilter)
        .select("userId displayName kycStatus payoutStatusUpdatedAt payoutRequiredActions")
        .lean()
    : [];
  const producerByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
  const filters = pageFilters(params, ["q", "role", "sort"]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Users and producer KYC</h2>
        <p className="mt-1 text-sm leading-6 text-steel-dark">
          View account roles and provider-reported producer onboarding status. Identity documents
          and financial details are not shown here.
        </p>
      </div>
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <a href={`/api/admin/export?type=users&role=${encodeURIComponent(role)}&q=${encodeURIComponent(search)}`}>
            Export CSV
          </a>
        </Button>
      </div>
      <AdminQueryForm search={search}>
        <AdminFilterSelect label="Role" name="role" defaultValue={role}>
          <option value="all">All roles</option>
          {roles.map((value) => <option key={value} value={value}>{value}</option>)}
        </AdminFilterSelect>
        <AdminFilterSelect label="Sort by" name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </AdminFilterSelect>
      </AdminQueryForm>
      {users.length === 0 ? (
        <EmptyState title="No matching users" description="Try a different search or role filter." />
      ) : (
        <div className="overflow-hidden rounded border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Producer profile</TableHead>
                <TableHead>KYC status</TableHead>
                <TableHead>Provider action</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const profile = producerByUser.get(user.id);
                return (
                  <TableRow key={user.id || user.email}>
                    <TableCell className="font-medium">{profile?.displayName || user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell>{profile ? "Created" : "Not created"}</TableCell>
                    <TableCell>{profile ? <StatusBadge status={profile.kycStatus} /> : "Not applicable"}</TableCell>
                    <TableCell className="min-w-40">
                      {profile?.payoutRequiredActions.length
                        ? profile.payoutRequiredActions.map((action) => action.replaceAll("_", " ")).join(", ")
                        : profile
                          ? "No action reported"
                          : "Not applicable"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "Not recorded"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <AdminTablePagination pathname="/admin/users" page={page} pageSize={limit} total={total} filters={filters} />
        </div>
      )}
    </div>
  );
}
