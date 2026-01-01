import { supabase } from './supabase';
import { Spot, Invitation, Payment, InvitationStatus, PaymentStatus, UserProfile, Drink, Attendance } from '../types';

/* -------------------------------------------------------------------------- */
/* SPOTS */
/* -------------------------------------------------------------------------- */

export const spotService = {
  // Get upcoming spot (date >= today)
  async getUpcomingSpot(): Promise<Spot | null> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - this is okay
        return null;
      }
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error('Database tables not found. Please run the SQL migration in Supabase SQL Editor. See supabase_migration.sql file.');
      }
      console.error('Error fetching upcoming spot:', error);
      throw error;
    }

    return data || null;
  },

  // Get all upcoming spots
  async getUpcomingSpots(): Promise<Spot[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming spots:', error);
      throw error;
    }

    return data || [];
  },

  // Get past spots (date < today)
  async getPastSpots(): Promise<Spot[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .lt('date', today)
      .order('date', { ascending: false });

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error('Database tables not found. Please run the SQL migration in Supabase SQL Editor. See supabase_migration.sql file.');
      }
      console.error('Error fetching past spots:', error);
      throw error;
    }

    return data || [];
  },

  // Create a new spot
  async createSpot(spotData: Omit<Spot, 'id' | 'members'>): Promise<Spot> {
    // Convert date to ISO string if it's not already
    let dateValue = spotData.date;
    if (typeof dateValue === 'string' && !dateValue.includes('T')) {
      // If it's just a date (YYYY-MM-DD), add time
      dateValue = `${dateValue}T${spotData.timing}:00`;
    }
    
    const { data, error } = await supabase
      .from('spots')
      .insert({
        date: dateValue,
        day: spotData.day,
        timing: spotData.timing,
        budget: spotData.budget,
        location: spotData.location,
        created_by: spotData.created_by,
        description: spotData.description || '',
        feedback: spotData.feedback || '',
        latitude: spotData.latitude,
        longitude: spotData.longitude,
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        throw new Error('Database tables not found. Please run the SQL migration in Supabase SQL Editor. See supabase_migration.sql file.');
      }
      if (error.message?.includes('foreign key') || error.message?.includes('created_by')) {
        throw new Error('Invalid user ID. Please make sure you are logged in with a valid user account.');
      }
      console.error('Error creating spot:', error);
      throw new Error(`Failed to create spot: ${error.message}`);
    }

    return data;
  },

  // Update a spot (admin only)
  async updateSpot(spotId: string, updates: Partial<Spot>): Promise<Spot> {
    const { data, error } = await supabase
      .from('spots')
      .update(updates)
      .eq('id', spotId)
      .select()
      .single();

    if (error) {
      console.error('Error updating spot:', error);
      throw error;
    }

    return data;
  },

  // Delete a spot (admin only)
  async deleteSpot(spotId: string): Promise<void> {
    const { error } = await supabase
      .from('spots')
      .delete()
      .eq('id', spotId);

    if (error) {
      console.error('Error deleting spot:', error);
      throw error;
    }
  },

  // Subscribe to real-time spot updates
  subscribeToSpots(callback: (payload: any) => void) {
    return supabase
      .channel('spots-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'spots' },
        callback
      )
      .subscribe();
  },
};

/* -------------------------------------------------------------------------- */
/* INVITATIONS */
/* -------------------------------------------------------------------------- */

export const invitationService = {
  // Get invitations for a spot
  async getInvitations(spotId: string): Promise<Invitation[]> {
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          phone,
          email,
          role,
          profile_pic_url,
          location
        )
      `)
      .eq('spot_id', spotId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }

    // Transform the data to match Invitation type
    return data.map((inv: any) => ({
      id: inv.id,
      spot_id: inv.spot_id,
      user_id: inv.user_id,
      profiles: inv.profiles,
      status: inv.status as InvitationStatus,
    }));
  },

  // Create or update invitation
  async upsertInvitation(invitationData: {
    spot_id: string;
    user_id: string;
    status: InvitationStatus;
  }): Promise<Invitation> {
    const { data, error } = await supabase
      .from('invitations')
      .upsert({
        spot_id: invitationData.spot_id,
        user_id: invitationData.user_id,
        status: invitationData.status,
      }, {
        onConflict: 'spot_id,user_id'
      })
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          phone,
          email,
          role,
          profile_pic_url,
          location
        )
      `)
      .single();

    if (error) {
      console.error('Error upserting invitation:', error);
      throw error;
    }

    return {
      id: data.id,
      spot_id: data.spot_id,
      user_id: data.user_id,
      profiles: data.profiles,
      status: data.status as InvitationStatus,
    };
  },

  // Update invitation status
  async updateInvitationStatus(
    invitationId: string,
    status: InvitationStatus
  ): Promise<void> {
    const { error } = await supabase
      .from('invitations')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      console.error('Error updating invitation status:', error);
      throw new Error(`Failed to update RSVP: ${error.message}`);
    }
  },

  // Subscribe to real-time invitation updates
  subscribeToInvitations(spotId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`invitations-${spotId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitations',
          filter: `spot_id=eq.${spotId}`,
        },
        callback
      )
      .subscribe();
  },
};

/* -------------------------------------------------------------------------- */
/* PAYMENTS */
/* -------------------------------------------------------------------------- */

export const paymentService = {
  // Get payments for a spot
  async getPayments(spotId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          phone,
          email,
          role,
          profile_pic_url,
          location
        )
      `)
      .eq('spot_id', spotId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }

    return data.map((pay: any) => ({
      id: pay.id,
      spot_id: pay.spot_id,
      user_id: pay.user_id,
      profiles: pay.profiles,
      status: pay.status as PaymentStatus,
    }));
  },

  // Create or update payment
  async upsertPayment(paymentData: {
    spot_id: string;
    user_id: string;
    status: PaymentStatus;
  }): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .upsert({
        spot_id: paymentData.spot_id,
        user_id: paymentData.user_id,
        status: paymentData.status,
      }, {
        onConflict: 'spot_id,user_id'
      })
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          phone,
          email,
          role,
          profile_pic_url,
          location
        )
      `)
      .single();

    if (error) {
      console.error('Error upserting payment:', error);
      throw error;
    }

    return {
      id: data.id,
      spot_id: data.spot_id,
      user_id: data.user_id,
      profiles: data.profiles,
      status: data.status as PaymentStatus,
    };
  },

  // Update payment status
  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus
  ): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentId);

    if (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  // Subscribe to real-time payment updates
  subscribeToPayments(spotId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`payments-${spotId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `spot_id=eq.${spotId}`,
        },
        callback
      )
      .subscribe();
  },
};

/* -------------------------------------------------------------------------- */
/* PROFILES */
/* -------------------------------------------------------------------------- */

export const profileService = {
  // Check if username is unique
  async isUsernameUnique(username: string, excludeUserId?: string): Promise<boolean> {
    let query = supabase
      .from('profiles')
      .select('id')
      .eq('username', username);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking username uniqueness:', error);
      throw error;
    }

    return !data || data.length === 0;
  },

  // Get profile by ID
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data || null;
  },

  // Update profile
  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    return data;
  },
};

/* -------------------------------------------------------------------------- */
/* DRINKS */
/* -------------------------------------------------------------------------- */

export const drinkService = {
  // Get drinks for a spot
  async getDrinks(spotId: string): Promise<Drink[]> {
    const { data, error } = await supabase
      .from('drinks')
      .select(`
        *,
        profiles:suggested_by (
          name
        )
      `)
      .eq('spot_id', spotId)
      .order('votes', { ascending: false });

    if (error) {
      console.error('Error fetching drinks:', error);
      throw error;
    }

    return data.map((drink: any) => ({
      id: drink.id,
      spot_id: drink.spot_id,
      name: drink.name,
      image_url: drink.image_url || '',
      votes: drink.votes || 0,
      suggested_by: drink.suggested_by,
      voted_by: drink.voted_by || [],
      profiles: drink.profiles,
    }));
  },

  // Create a drink
  async createDrink(drinkData: {
    spot_id: string;
    name: string;
    image_url?: string;
    suggested_by: string;
  }): Promise<Drink> {
    const { data, error } = await supabase
      .from('drinks')
      .insert({
        spot_id: drinkData.spot_id,
        name: drinkData.name,
        image_url: drinkData.image_url || '',
        suggested_by: drinkData.suggested_by,
        votes: 0,
        voted_by: [],
      })
      .select(`
        *,
        profiles:suggested_by (
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating drink:', error);
      throw error;
    }

    return {
      id: data.id,
      spot_id: data.spot_id,
      name: data.name,
      image_url: data.image_url || '',
      votes: data.votes || 0,
      suggested_by: data.suggested_by,
      voted_by: data.voted_by || [],
      profiles: data.profiles,
    };
  },

  // Vote for a drink
  async voteForDrink(drinkId: string, userId: string): Promise<Drink> {
    // First get the drink to check if user already voted
    const { data: drink, error: fetchError } = await supabase
      .from('drinks')
      .select('*')
      .eq('id', drinkId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const votedBy = drink.voted_by || [];
    const hasVoted = votedBy.includes(userId);

    let updatedVotedBy: string[];
    let votes: number;

    if (hasVoted) {
      // Remove vote
      updatedVotedBy = votedBy.filter((id: string) => id !== userId);
      votes = Math.max(0, (drink.votes || 0) - 1);
    } else {
      // Add vote
      updatedVotedBy = [...votedBy, userId];
      votes = (drink.votes || 0) + 1;
    }

    const { data, error } = await supabase
      .from('drinks')
      .update({
        votes,
        voted_by: updatedVotedBy,
      })
      .eq('id', drinkId)
      .select(`
        *,
        profiles:suggested_by (
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error voting for drink:', error);
      throw error;
    }

    return {
      id: data.id,
      spot_id: data.spot_id,
      name: data.name,
      image_url: data.image_url || '',
      votes: data.votes || 0,
      suggested_by: data.suggested_by,
      voted_by: data.voted_by || [],
      profiles: data.profiles,
    };
  },

  // Delete a drink
  async deleteDrink(drinkId: string): Promise<void> {
    const { error } = await supabase
      .from('drinks')
      .delete()
      .eq('id', drinkId);

    if (error) {
      console.error('Error deleting drink:', error);
      throw error;
    }
  },
};

/* -------------------------------------------------------------------------- */
/* ATTENDANCE */
/* -------------------------------------------------------------------------- */

export const attendanceService = {
  // Get attendance for a spot
  async getAttendance(spotId: string): Promise<Attendance[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          username,
          phone,
          email,
          role,
          profile_pic_url,
          location,
          mission_count
        )
      `)
      .eq('spot_id', spotId);

    if (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }

    return data.map((att: any) => ({
      id: att.id,
      spot_id: att.spot_id,
      user_id: att.user_id,
      attended: att.attended,
      created_at: att.created_at,
      updated_at: att.updated_at,
      profiles: att.profiles,
    }));
  },

  // Get user's attendance for a spot
  async getUserAttendance(spotId: string, userId: string): Promise<Attendance | null> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('spot_id', spotId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user attendance:', error);
      throw error;
    }

    return data || null;
  },

  // Create or update attendance
  async upsertAttendance(attendanceData: {
    spot_id: string;
    user_id: string;
    attended: boolean;
  }): Promise<Attendance> {
    const { data, error } = await supabase
      .from('attendance')
      .upsert({
        spot_id: attendanceData.spot_id,
        user_id: attendanceData.user_id,
        attended: attendanceData.attended,
      }, {
        onConflict: 'spot_id,user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting attendance:', error);
      throw error;
    }

    return {
      id: data.id,
      spot_id: data.spot_id,
      user_id: data.user_id,
      attended: data.attended,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },
};
