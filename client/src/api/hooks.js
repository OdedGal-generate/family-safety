import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { saveAuth, saveGroupId, getGroupId } from "./client.js";
import { demoMembers } from "../data/demoMembers.js";
import { demoSubGroups, demoPendingRequests } from "../data/demoSubGroups.js";

// ── Auth ──

export function useRegisterUser() {
  return useMutation({
    mutationFn: async ({ name, phone, pin }) => {
      const { data } = await api.post("/auth/register", { name, phone, pin });
      return data;
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ phone, pin }) => {
      const { data } = await api.post("/auth/login", { phone, pin });
      return data;
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ name, avatar_emoji }) => {
      const { data } = await api.post("/auth/profile", { name, avatar_emoji });
      return data;
    },
  });
}

// ── Groups ──

export function useCreateGroup() {
  return useMutation({
    mutationFn: async ({ name }) => {
      const { data } = await api.post("/groups", { name });
      return data;
    },
  });
}

export function useJoinGroup() {
  return useMutation({
    mutationFn: async ({ code, display_name, phone, self_description }) => {
      const { data } = await api.post("/groups/join", {
        code,
        display_name,
        phone,
        self_description,
      });
      return data;
    },
  });
}

// ── Group Status (home screen data) ──

function transformStatusData(data) {
  // Transform API response into the shape our components expect
  const members = data.members.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.nickname || "member",
    emoji: m.avatar_emoji,
    status: m.latest_status || "pending",
    time: m.last_update ? minutesAgo(m.last_update) : null,
    location: m.address || null,
  }));

  const subGroups = (data.sub_groups || []).map((sg) => ({
    id: sg.id,
    name: sg.name,
    emoji: sg.members.length >= 4 ? "👨‍👩‍👧‍👦" : "👨‍👩‍👧",
    members: sg.members.map((m) => ({
      id: m.id,
      name: m.name,
      emoji: m.avatar_emoji,
      status: m.latest_status || "pending",
      time: m.last_update ? minutesAgo(m.last_update) : null,
    })),
  }));

  return { members, subGroups, group: data.group };
}

function minutesAgo(timestamp) {
  const then = new Date(timestamp + "Z"); // SQLite datetime is UTC
  const diff = Date.now() - then.getTime();
  return Math.max(0, Math.round(diff / 60000));
}

export function useGroupStatus() {
  const groupId = getGroupId();

  return useQuery({
    queryKey: ["groupStatus", groupId],
    queryFn: async () => {
      const { data } = await api.get(`/status/groups/${groupId}`);
      return transformStatusData(data);
    },
    enabled: !!groupId,
    refetchInterval: 30000, // Poll every 30 seconds
    placeholderData: {
      members: demoMembers,
      subGroups: demoSubGroups,
      group: null,
    },
  });
}

// ── Post Status ──

export function usePostStatus() {
  const qc = useQueryClient();
  const groupId = getGroupId();

  return useMutation({
    mutationFn: async ({ status, lat, lng, address }) => {
      const { data } = await api.post("/status", {
        group_id: groupId,
        status,
        lat,
        lng,
        address,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groupStatus"] });
    },
  });
}

// ── Invite ──

export function useCreateInvite() {
  const groupId = getGroupId();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/groups/${groupId}/invite`);
      return data;
    },
  });
}

// ── Pending Requests ──

export function usePendingRequests() {
  const groupId = getGroupId();

  return useQuery({
    queryKey: ["pendingRequests", groupId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}/requests`);
      return data.requests.map((r) => ({
        id: r.id,
        name: r.display_name,
        status: r.status,
        avatar_emoji: r.avatar_emoji,
      }));
    },
    enabled: !!groupId,
    placeholderData: demoPendingRequests,
  });
}

export function useReviewRequest() {
  const qc = useQueryClient();
  const groupId = getGroupId();

  return useMutation({
    mutationFn: async ({ reqId, status }) => {
      const { data } = await api.patch(
        `/groups/${groupId}/requests/${reqId}`,
        { status }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingRequests"] });
    },
  });
}
