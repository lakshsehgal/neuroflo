"use client";

import { useState, useEffect } from "react";
import { getDepartments, createDepartment, deleteDepartment } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

type Department = {
  id: string;
  name: string;
  _count: { users: number };
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    const depts = await getDepartments();
    setDepartments(depts as Department[]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError("");

    const result = await createDepartment(newName);
    if (result.success) {
      setNewName("");
      loadDepartments();
    } else {
      setError(result.error || "Failed to create department");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteDepartment(id);
    if (result.success) {
      loadDepartments();
    } else {
      setError(result.error || "Failed to delete department");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Departments</h1>
        <p className="text-muted-foreground">Manage agency departments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Add Department</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-3">
            <Input
              placeholder="Department name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </form>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Departments ({departments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          ) : (
            <div className="space-y-3">
              {departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{dept.name}</span>
                    <Badge variant="outline">{dept._count.users} members</Badge>
                  </div>
                  {dept._count.users === 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(dept.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
