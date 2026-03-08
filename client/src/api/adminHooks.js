import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi from "./adminClient";

// ── Auth ──

export function useAdminLogin() {
  return useMutation({
    mutationFn: async ({ password, totp_code }) => {
      const { data } = await adminApi.post("/login", { password, totp_code });
      return data;
    },
  });
}

// ── Settings ──

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data } = await adminApi.get("/settings");
      return data;
    },
  });
}

export function useAdminChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const { data } = await adminApi.post("/change-password", {
        currentPassword,
        newPassword,
      });
      return data;
    },
  });
}

// ── 2FA ──

export function useAdmin2FASetup() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await adminApi.post("/2fa/setup");
      return data;
    },
  });
}

export function useAdmin2FAVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ code }) => {
      const { data } = await adminApi.post("/2fa/verify", { code });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

export function useAdmin2FADisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ password }) => {
      const { data } = await adminApi.post("/2fa/disable", { password });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

// ── Data ──

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
