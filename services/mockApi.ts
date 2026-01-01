import {
  UserProfile,
  UserRole,
  Spot,
  Drink,
  Invitation,
  InvitationStatus,
  Payment,
  PaymentStatus,
  ChatMessage,
  Moment,
  User,
} from "../types";

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/* -------------------------------------------------------------------------- */
/* Default avatars */
/* -------------------------------------------------------------------------- */

export const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/thumbs/svg?seed=bro1",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=bro2",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=bro3",
  "https://api.dicebear.com/7.x/thumbs/svg?seed=bro4",
];

/* -------------------------------------------------------------------------- */
/* In-memory DB (PERSISTENT DURING SESSION) */
/* -------------------------------------------------------------------------- */

// Initialize real users based on actual spot members
let USERS_DB: Record<string, UserProfile> = {
  admin: {
    id: "admin",
    name: "Ram",
    username: "brocode",
    email: "brocode@gmail.com",
    phone: "7826821130",
    password: "admin@brocode",
    role: UserRole.ADMIN,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[0],
    isVerified: true,
  },
  dhanush: {
    id: "dhanush",
    name: "Dhanush",
    username: "dhanush",
    phone: "9994323520",
    password: "dhanush123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[1],
    isVerified: true,
  },
  godwin: {
    id: "godwin",
    name: "Godwin",
    username: "godwin",
    phone: "8903955341",
    password: "godwin123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[2],
    isVerified: true,
  },
  tharun: {
    id: "tharun",
    name: "Tharun",
    username: "tharun",
    phone: "9345624112",
    password: "tharun123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[3],
    isVerified: true,
  },
  sanjay: {
    id: "sanjay",
    name: "Sanjay",
    username: "sanjay",
    phone: "9865703667",
    password: "sanjay123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[0],
    isVerified: true,
  },
  soundar: {
    id: "soundar",
    name: "Soundar",
    username: "soundar",
    phone: "9566686921",
    password: "soundar123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[1],
    isVerified: true,
  },
  jagadeesh: {
    id: "jagadeesh",
    name: "Jagadeesh",
    username: "jagadeesh",
    phone: "6381038172",
    password: "jagadeesh123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[2],
    isVerified: true,
  },
  ram: {
    id: "ram",
    name: "Ram",
    username: "ram",
    phone: "7826821130",
    password: "ram123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[3],
    isVerified: true,
  },
  lingesh: {
    id: "lingesh",
    name: "Lingesh",
    username: "lingesh",
    phone: "",
    password: "lingesh123",
    role: UserRole.USER,
    location: "Attibele",
    profile_pic_url: DEFAULT_AVATARS[0],
    isVerified: true,
  },
};

// Initialize spot for 26/07/2025
const SPOT_DATE = "2025-07-26T10:00:00";
const SPOT_LOCATION = "Attibele Toll Plaza";

let SPOTS: Spot[] = [
  {
    id: "spot-2025-07-26",
    date: SPOT_DATE,
    day: "Saturday",
    timing: "10:00",
    budget: 0,
    location: SPOT_LOCATION,
    created_by: "admin",
    description: "",
    feedback: "",
    members: [
      USERS_DB.dhanush,
      USERS_DB.godwin,
      USERS_DB.tharun,
      USERS_DB.sanjay,
      USERS_DB.soundar,
      USERS_DB.jagadeesh,
      USERS_DB.ram,
    ],
  },
];

// Initialize invitations with real RSVP statuses
let INVITATIONS: Invitation[] = [
  {
    id: "inv-dhanush",
    spot_id: "spot-2025-07-26",
    user_id: "dhanush",
    profiles: USERS_DB.dhanush,
    status: InvitationStatus.CONFIRMED,
  },
  {
    id: "inv-godwin",
    spot_id: "spot-2025-07-26",
    user_id: "godwin",
    profiles: USERS_DB.godwin,
    status: InvitationStatus.CONFIRMED,
  },
  {
    id: "inv-tharun",
    spot_id: "spot-2025-07-26",
    user_id: "tharun",
    profiles: USERS_DB.tharun,
    status: InvitationStatus.CONFIRMED,
  },
  {
    id: "inv-sanjay",
    spot_id: "spot-2025-07-26",
    user_id: "sanjay",
    profiles: USERS_DB.sanjay,
    status: InvitationStatus.CONFIRMED,
  },
  {
    id: "inv-soundar",
    spot_id: "spot-2025-07-26",
    user_id: "soundar",
    profiles: USERS_DB.soundar,
    status: InvitationStatus.CONFIRMED,
  },
  {
    id: "inv-jagadeesh",
    spot_id: "spot-2025-07-26",
    user_id: "jagadeesh",
    profiles: USERS_DB.jagadeesh,
    status: InvitationStatus.CONFIRMED,
  },
  {
    id: "inv-ram",
    spot_id: "spot-2025-07-26",
    user_id: "ram",
    profiles: USERS_DB.ram,
    status: InvitationStatus.CONFIRMED,
  },
  {
    id: "inv-lingesh",
    spot_id: "spot-2025-07-26",
    user_id: "lingesh",
    profiles: USERS_DB.lingesh,
    status: InvitationStatus.DECLINED,
  },
];

// Initialize payments with real payment statuses
let PAYMENTS: Payment[] = [
  {
    id: "pay-dhanush",
    spot_id: "spot-2025-07-26",
    user_id: "dhanush",
    profiles: USERS_DB.dhanush,
    status: PaymentStatus.PAID,
  },
  {
    id: "pay-godwin",
    spot_id: "spot-2025-07-26",
    user_id: "godwin",
    profiles: USERS_DB.godwin,
    status: PaymentStatus.PAID,
  },
  {
    id: "pay-tharun",
    spot_id: "spot-2025-07-26",
    user_id: "tharun",
    profiles: USERS_DB.tharun,
    status: PaymentStatus.PAID,
  },
  {
    id: "pay-sanjay",
    spot_id: "spot-2025-07-26",
    user_id: "sanjay",
    profiles: USERS_DB.sanjay,
    status: PaymentStatus.PAID,
  },
  {
    id: "pay-soundar",
    spot_id: "spot-2025-07-26",
    user_id: "soundar",
    profiles: USERS_DB.soundar,
    status: PaymentStatus.PAID,
  },
  {
    id: "pay-jagadeesh",
    spot_id: "spot-2025-07-26",
    user_id: "jagadeesh",
    profiles: USERS_DB.jagadeesh,
    status: PaymentStatus.PAID,
  },
  {
    id: "pay-ram",
    spot_id: "spot-2025-07-26",
    user_id: "ram",
    profiles: USERS_DB.ram,
    status: PaymentStatus.PAID,
  },
  {
    id: "pay-lingesh",
    spot_id: "spot-2025-07-26",
    user_id: "lingesh",
    profiles: USERS_DB.lingesh,
    status: PaymentStatus.NOT_PAID,
  },
];

let DRINKS: Drink[] = [];
let MESSAGES: ChatMessage[] = [];
let MOMENTS: Moment[] = [];

/* -------------------------------------------------------------------------- */
/* API */
/* -------------------------------------------------------------------------- */

export const mockApi = {
  /* ================================ AUTH ================================ */

  async login(
    identifier: string,
    password: string
  ): Promise<{ user: User; profile: UserProfile }> {
    await delay(300);

    const profile = Object.values(USERS_DB).find(
      (u) =>
        (u.email === identifier || 
         u.phone === identifier || 
         u.username === identifier) &&
        u.password === password
    );

    if (!profile) throw new Error("Invalid credentials");

    const user: User = {
      id: profile.id,
      email: profile.email,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    return { user, profile };
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    await delay(100);
    return USERS_DB[userId] ?? null;
  },

  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    await delay(200);
    USERS_DB[userId] = { ...USERS_DB[userId], ...updates };
    return USERS_DB[userId];
  },

  /* =========================== ADMIN USERS ============================== */

  async createUserByAdmin(data: {
    name: string;
    phone: string;
    password: string;
    role?: UserRole;
  }): Promise<UserProfile> {
    await delay(300);

    if (Object.values(USERS_DB).some((u) => u.phone === data.phone)) {
      throw new Error("User already exists");
    }

    const id = `user-${Date.now()}`;

    const newUser: UserProfile = {
      id,
      name: data.name,
      username: data.name.toLowerCase().replace(/\s+/g, ""),
      phone: data.phone,
      password: data.password,
      role: data.role ?? UserRole.USER,
      location: "Broville",
      profile_pic_url:
        DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
      isVerified: true,
    };

    USERS_DB[id] = newUser;
    return newUser;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    await delay(200);
    return Object.values(USERS_DB);
  },

  /* ================================ SPOTS =============================== */

  async createSpot(data: Omit<Spot, "id" | "members">): Promise<Spot> {
    await delay(400);

    const newSpot: Spot = {
      id: `spot-${Date.now()}`,
      date: data.date,
      day: data.day,
      timing: data.timing,
      budget: Number(data.budget) || 0,
      location: data.location,
      created_by: data.created_by,

      members: [],
      description: data.description ?? "",
      feedback: "",
      latitude: data.latitude,
      longitude: data.longitude,
    };

    SPOTS.push(newSpot);

    const creator = USERS_DB[data.created_by];
    if (creator && newSpot.members) {
      newSpot.members.push(creator);

      INVITATIONS.push({
        id: `inv-${Date.now()}`,
        spot_id: newSpot.id,
        user_id: creator.id,
        profiles: creator,
        status: InvitationStatus.CONFIRMED,
      });

      PAYMENTS.push({
        id: `pay-${Date.now()}`,
        spot_id: newSpot.id,
        user_id: creator.id,
        profiles: creator,
        status: PaymentStatus.NOT_PAID,
      });
    }

    return newSpot;
  },

  async getUpcomingSpot(): Promise<Spot | null> {
    await delay(200);
    return (
      SPOTS.filter((s) => new Date(s.date) >= new Date())
        .sort(
          (a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0] ?? null
    );
  },

  async getPastSpots(): Promise<Spot[]> {
    await delay(200);
    return SPOTS.filter((s) => new Date(s.date) < new Date());
  },

  /* ============================== INVITES =============================== */

  async getInvitations(spotId: string): Promise<Invitation[]> {
    await delay(200);
    return INVITATIONS.filter((i) => i.spot_id === spotId);
  },

  async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus
  ): Promise<void> {
    await delay(200);
    const inv = INVITATIONS.find((i) => i.id === invitationId);
    if (!inv) throw new Error("Invitation not found");
    inv.status = status;
  },

  /* =============================== PAYMENTS ============================= */

  async getPayments(spotId: string): Promise<Payment[]> {
    await delay(200);
    return PAYMENTS.filter((p) => p.spot_id === spotId);
  },

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus
  ): Promise<void> {
    await delay(200);
    const payment = PAYMENTS.find((p) => p.id === paymentId);
    if (!payment) throw new Error("Payment not found");
    payment.status = status;
  },

  /* ================================ CHAT ================================ */

  async getMessages(): Promise<ChatMessage[]> {
    await delay(200);
    return MESSAGES;
  },

  async sendMessage(data: {
    user_id: string;
    content_text?: string;
    content_image_urls?: string[];
  }): Promise<ChatMessage> {
    await delay(150);

    const user = USERS_DB[data.user_id];
    if (!user) throw new Error("User not found");

    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user_id: user.id,
      created_at: new Date().toISOString(),
      content_text: data.content_text,
      content_image_urls: data.content_image_urls,
      profiles: {
        name: user.name,
        profile_pic_url: user.profile_pic_url || DEFAULT_AVATARS[0],
      },
      reactions: {},
    };

    MESSAGES.push(msg);
    return msg;
  },

  /* =============================== MOMENTS ============================== */

  async getMoments(userId: string): Promise<Moment[]> {
    await delay(200);
    return MOMENTS.filter((m) => m.user_id === userId);
  },

  async createMoment(
    data: Omit<Moment, "id" | "created_at">
  ): Promise<Moment> {
    await delay(300);
    const moment: Moment = {
      ...data,
      id: `moment-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    MOMENTS.unshift(moment);
    return moment;
  },

  async deleteMoment(momentId: string): Promise<void> {
    await delay(200);
    const index = MOMENTS.findIndex((m) => m.id === momentId);
    if (index === -1) throw new Error("Moment not found");
    MOMENTS.splice(index, 1);
  },

  async getUserSpots(userId: string): Promise<Spot[]> {
    await delay(200);
    return SPOTS.filter((s) => 
      s.created_by === userId || 
      s.members?.some((m) => m.id === userId)
    );
  },

  async sendOtp(email: string): Promise<void> {
    await delay(300);
    const user = Object.values(USERS_DB).find((u) => u.email === email);
    if (!user) throw new Error("User not found");
    // In a real implementation, this would send an OTP
    // For now, we'll just simulate success
  },

  async resetPassword(email: string, newPassword: string): Promise<void> {
    await delay(300);
    const user = Object.values(USERS_DB).find((u) => u.email === email);
    if (!user) throw new Error("User not found");
    user.password = newPassword;
  },
};

export const getPlaceholderImage = (seed: string = "default") => {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${seed}`;
};
