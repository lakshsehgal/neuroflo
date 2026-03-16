import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, Edit, Trash2, UserPlus, Settings, CheckCircle2, XCircle } from "lucide-react";

const roles = [
  {
    name: "Admin",
    color: "bg-red-100 text-red-800",
    description: "Full access to all features, settings, and team management",
    permissions: {
      "Manage Team & Invites": true,
      "Manage Departments": true,
      "Manage Clients & Billing": true,
      "Delete Projects": true,
      "Approve Tickets": true,
      "Manage Project Members": true,
      "Create Projects & Tasks": true,
      "Create Tickets": true,
      "View Dashboard": true,
    },
  },
  {
    name: "Manager",
    color: "bg-blue-100 text-blue-800",
    description: "Can manage projects, approve tickets, and view team members",
    permissions: {
      "Manage Team & Invites": false,
      "Manage Departments": false,
      "Manage Clients & Billing": true,
      "Delete Projects": true,
      "Approve Tickets": true,
      "Manage Project Members": true,
      "Create Projects & Tasks": true,
      "Create Tickets": true,
      "View Dashboard": true,
    },
  },
  {
    name: "Member",
    color: "bg-green-100 text-green-800",
    description: "Can create and edit projects, tasks, and tickets. Project leads can manage their project members.",
    permissions: {
      "Manage Team & Invites": false,
      "Manage Departments": false,
      "Manage Clients & Billing": false,
      "Delete Projects": false,
      "Approve Tickets": false,
      "Manage Project Members": false,
      "Create Projects & Tasks": true,
      "Create Tickets": true,
      "View Dashboard": true,
    },
  },
  {
    name: "Viewer",
    color: "bg-gray-100 text-gray-800",
    description: "Read-only access to view projects and tickets",
    permissions: {
      "Manage Team & Invites": false,
      "Manage Departments": false,
      "Manage Clients & Billing": false,
      "Delete Projects": false,
      "Approve Tickets": false,
      "Manage Project Members": false,
      "Create Projects & Tasks": false,
      "Create Tickets": false,
      "View Dashboard": true,
    },
  },
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        <p className="text-muted-foreground">Overview of role-based access control</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <Badge className={role.color} variant="secondary">{role.name}</Badge>
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(role.permissions).map(([perm, allowed]) => (
                  <div key={perm} className="flex items-center justify-between">
                    <span className="text-xs">{perm}</span>
                    {allowed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
