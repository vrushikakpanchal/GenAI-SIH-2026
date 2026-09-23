import { generatedBundle, ACTIVITIES, INTEGRATIONS, NOTIFICATIONS, PROVENANCE, SAMPLE_SOURCE, TEAMS, TRANSFORMATIONS, USERS } from "@/data/seed";
import type {
  ActivityEvent,
  GeneratedOutputs,
  OutputType,
  ProvenanceRecord,
  Role,
  SourceDocument,
  Team,
  Transformation,
  TransformationConfig,
  User,
} from "@/types";

function clone<T>(v: T): T {
  return structuredClone(v);
}

let users = clone(USERS);
let teams = clone(TEAMS);
let transformations = clone(TRANSFORMATIONS);
let activities = clone(ACTIVITIES);
let provenance = clone(PROVENANCE);
let integrations = clone(INTEGRATIONS);
let notifications = clone(NOTIFICATIONS);
let nextTr = 1043;

function emit(partial: Omit<ActivityEvent, "id">) {
  activities = [
    {
      id: `a-${Date.now()}`,
      ...partial,
    },
    ...activities,
  ];
}

export const store = {
  users: () => clone(users),
  teams: () => clone(teams),
  transformations: () => clone(transformations),
  activities: () => clone(activities),
  provenance: () => clone(provenance),
  integrations: () => clone(integrations),
  notifications: () => clone(notifications),
  userById: (id: string) => users.find((u) => u.id === id),
  teamById: (id: string) => teams.find((t) => t.id === id),
  transformationById: (id: string) => {
    const item = transformations.find((t) => t.id === id);
    return item ? clone(item) : undefined;
  },

  authenticate(email: string, password: string) {
    if (password !== "demo") return null;
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },

  createTransformation(owner: User, source: SourceDocument, config: TransformationConfig) {
    const id = `tr-${nextTr}`;
    const code = `TR-${nextTr}`;
    nextTr += 1;
    const item: Transformation = {
      id,
      code,
      source,
      config,
      outputs: {},
      organizationId: "org-1",
      teamId: owner.teamId ?? "t-ti",
      ownerId: owner.id,
      reviewerId: "u-rahul",
      status: "draft",
      priority: "high",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedTo: [],
      reviewComments: [],
    };
    transformations = [item, ...transformations];
    emit({
      transformationId: id,
      userId: owner.id,
      teamId: item.teamId,
      action: "source_uploaded",
      detail: `${owner.name.split(" ")[0]} uploaded source`,
      at: item.createdAt,
    });
    return clone(item);
  },

  setProcessing(id: string) {
    transformations = transformations.map((t) =>
      t.id === id ? { ...t, status: "processing", updatedAt: new Date().toISOString() } : t,
    );
  },

  completeGeneration(id: string, types: OutputType[]) {
    const bundle = generatedBundle();
    const outputs: GeneratedOutputs = {};
    if (types.includes("advisory")) outputs.advisory = bundle.advisory;
    if (types.includes("executive")) outputs.executive = bundle.executive;
    if (types.includes("linkedin")) outputs.linkedin = bundle.linkedin;
    if (types.includes("x_thread")) outputs.xThread = bundle.xThread;
    if (types.includes("video")) outputs.video = bundle.video;
    if (types.includes("presentation")) outputs.presentation = bundle.presentation;
    if (types.includes("infographic")) outputs.infographic = bundle.infographic;
    transformations = transformations.map((t) =>
      t.id === id
        ? { ...t, outputs, status: "draft", updatedAt: new Date().toISOString() }
        : t,
    );
    const tr = transformations.find((t) => t.id === id);
    if (tr) {
      emit({
        transformationId: id,
        userId: null,
        teamId: tr.teamId,
        action: "generated",
        detail: "Transformation generated",
        at: new Date().toISOString(),
      });
    }
    return clone(tr!);
  },

  updateOutputs(id: string, outputs: GeneratedOutputs, userId: string) {
    transformations = transformations.map((t) =>
      t.id === id ? { ...t, outputs, updatedAt: new Date().toISOString() } : t,
    );
    const tr = transformations.find((t) => t.id === id)!;
    const user = users.find((u) => u.id === userId);
    emit({
      transformationId: id,
      userId,
      teamId: tr.teamId,
      action: "edited",
      detail: `${user?.name.split(" ")[0] ?? "User"} edited output`,
      at: new Date().toISOString(),
    });
    return clone(tr);
  },

  submitReview(id: string, userId: string) {
    transformations = transformations.map((t) =>
      t.id === id ? { ...t, status: "awaiting_review", updatedAt: new Date().toISOString() } : t,
    );
    const tr = transformations.find((t) => t.id === id)!;
    emit({
      transformationId: id,
      userId,
      teamId: tr.teamId,
      action: "submitted",
      detail: "Submitted for review",
      at: new Date().toISOString(),
    });
    notifications = [
      {
        id: `n-${Date.now()}`,
        title: "Review requested",
        body: `${tr.code} is awaiting review.`,
        unread: true,
        at: new Date().toISOString(),
        href: `/review/${id}`,
      },
      ...notifications,
    ];
    return clone(tr);
  },

  approve(id: string, reviewerId: string) {
    const now = new Date().toISOString();
    transformations = transformations.map((t) =>
      t.id === id
        ? { ...t, status: "approved", approvedBy: reviewerId, approvedAt: now, updatedAt: now }
        : t,
    );
    const tr = transformations.find((t) => t.id === id)!;
    const reviewer = users.find((u) => u.id === reviewerId);
    emit({
      transformationId: id,
      userId: reviewerId,
      teamId: tr.teamId,
      action: "approved",
      detail: `${reviewer?.name.split(" ")[0] ?? "Reviewer"} approved output`,
      at: now,
    });
    return clone(tr);
  },

  requestChanges(id: string, reviewerId: string, comment: string) {
    const now = new Date().toISOString();
    transformations = transformations.map((t) =>
      t.id === id
        ? {
            ...t,
            status: "changes_requested",
            updatedAt: now,
            reviewComments: [
              ...t.reviewComments,
              { id: `c-${Date.now()}`, reviewerId, comment, createdAt: now },
            ],
          }
        : t,
    );
    const tr = transformations.find((t) => t.id === id)!;
    emit({
      transformationId: id,
      userId: reviewerId,
      teamId: tr.teamId,
      action: "changes_requested",
      detail: "Changes requested",
      at: now,
    });
    notifications = [
      {
        id: `n-${Date.now()}`,
        title: "Changes requested",
        body: `${users.find((u) => u.id === reviewerId)?.name ?? "Reviewer"} requested changes to your advisory.`,
        unread: true,
        at: now,
        href: `/transformations/${id}`,
      },
      ...notifications,
    ];
    return clone(tr);
  },

  publish(id: string, destination: string, userId: string) {
    const now = new Date().toISOString();
    transformations = transformations.map((t) =>
      t.id === id
        ? {
            ...t,
            status: destination === "linkedin" || destination === "x" ? "published" : "approved",
            publishedTo: [...new Set([...t.publishedTo, destination])],
            updatedAt: now,
          }
        : t,
    );
    const tr = transformations.find((t) => t.id === id)!;
    emit({
      transformationId: id,
      userId,
      teamId: tr.teamId,
      action: "published",
      detail: `Publication action: ${destination} (mock)`,
      at: now,
    });
    const rec: ProvenanceRecord = {
      id: `prv-${id}-${Date.now()}`,
      transformationId: id,
      sourceHash: "8f7a91acd4e21190c0ab91ac",
      outputHash: "91af72cd44b01883aa72cd91",
      operatorId: tr.ownerId,
      reviewerId: tr.reviewerId,
      timestamp: now,
      model: "Qwen2.5-14B-Instruct",
      version: "engine-2026.09",
      txHash: `0xmock${Date.now().toString(16)}`,
      blockNumber: "pending",
      status: "recorded",
      steps: [
        { label: "Source Uploaded", at: tr.createdAt },
        { label: "AI Generated", at: tr.createdAt },
        { label: "Approved", at: tr.approvedAt ?? now },
        { label: "Published", at: now },
        { label: "Hash Recorded", at: now },
      ],
    };
    provenance = [rec, ...provenance.filter((p) => p.transformationId !== id)];
    emit({
      transformationId: id,
      userId: null,
      teamId: tr.teamId,
      action: "provenance",
      detail: "Provenance record created",
      at: now,
    });
    return { transformation: clone(tr), provenance: clone(rec) };
  },

  assignReviewer(id: string, reviewerId: string) {
    transformations = transformations.map((t) =>
      t.id === id ? { ...t, reviewerId, updatedAt: new Date().toISOString() } : t,
    );
    return clone(transformations.find((t) => t.id === id)!);
  },

  connectIntegration(id: string) {
    integrations = integrations.map((i) =>
      i.id === id
        ? {
            ...i,
            status: "connected",
            account: i.id === "x" ? "Aegis National CERT" : "cms@aegis.gov.in",
            lastUsed: null,
          }
        : i,
    );
    return clone(integrations.find((i) => i.id === id)!);
  },

  disconnectIntegration(id: string) {
    integrations = integrations.map((i) =>
      i.id === id ? { ...i, status: "not_connected", account: null } : i,
    );
    return clone(integrations.find((i) => i.id === id)!);
  },

  inviteMember(email: string, role: Role, teamId: string) {
    const user: User = {
      id: `u-${Date.now()}`,
      name: email.split("@")[0],
      email,
      role,
      teamId,
      status: "invited",
      lastActive: new Date().toISOString(),
      title: "Invited member",
      initials: email.slice(0, 2).toUpperCase(),
    };
    users = [user, ...users];
    teams = teams.map((t) =>
      t.id === teamId ? { ...t, memberIds: [...t.memberIds, user.id] } : t,
    );
    return clone(user);
  },

  updateUser(id: string, patch: Partial<User>) {
    users = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
    return clone(users.find((u) => u.id === id)!);
  },

  addTeamMember(teamId: string, userId: string) {
    teams = teams.map((t) =>
      t.id === teamId && !t.memberIds.includes(userId) ? { ...t, memberIds: [...t.memberIds, userId] } : t,
    );
    users = users.map((u) => (u.id === userId ? { ...u, teamId } : u));
    return clone(teams.find((t) => t.id === teamId)!);
  },

  removeTeamMember(teamId: string, userId: string) {
    teams = teams.map((t) =>
      t.id === teamId ? { ...t, memberIds: t.memberIds.filter((id) => id !== userId) } : t,
    );
    users = users.map((u) => (u.id === userId && u.teamId === teamId ? { ...u, teamId: null } : u));
    return clone(teams.find((t) => t.id === teamId)!);
  },

  createTeam(name: string, description: string) {
    const team: Team = {
      id: `t-${Date.now()}`,
      name,
      description,
      memberIds: [],
      activeWork: 0,
      pendingReviews: 0,
    };
    teams = [...teams, team];
    return clone(team);
  },

  deleteTeam(id: string) {
    teams = teams.filter((t) => t.id !== id);
  },

  markNotificationsRead() {
    notifications = notifications.map((n) => ({ ...n, unread: false }));
  },

  sampleSource(): SourceDocument {
    return clone(SAMPLE_SOURCE);
  },
};

export type Store = typeof store;
