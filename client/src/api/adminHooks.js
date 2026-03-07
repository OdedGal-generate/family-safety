import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "./adminClient";

export function useAdminGroups() {
  return useQuery({
    queryKey: ["admin", "groups"],
    queryFn: async () => {
      const { data } = await adminApi.get("/groups");
      return data.groups;
    },
  });
}

export function useAdminGroupMembers(groupId) {
  return useQuery({
    queryKey: ["admin", "groups", groupId, "members"],
    queryFn: async () => {
      const { data } = await adminApi.get(`/groups/${groupId}/members`);
      return data;
    },
    enabled: !!groupId,
  });
}

export function useAdminRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }) => {
      const { data } = await adminApi.delete(`/groups/${groupId}/members/${userId}`);
      return data;
    },
    onSuccess: (_, { groupId }) => {
      qc.invalidateQueries({ queryKey: ["admin", "groups", groupId, "members"] });
      qc.invalidateQueries({ queryKey: ["admin", "groups"] });
    },
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }) => {
      const { data } = await adminApi.delete(`/users/${userId}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
